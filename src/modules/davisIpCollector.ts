import { Socket } from 'net'
import logger from './logger'

type DavisResponseData = {
    BarTrend: number,
    Pressure: number,
    InTemp: number,
    InHum: number,
    OutTemp: number,
    WindSpeed: number,
    WindDir: number,
    WindDir10av: number,
    WindSpeed10av: number,
    WindSpeed2av: number,
    WindGust: number,
    WindGustDir: number,
    DewPoint: number,
    OutHum: number,
    HeatIndex: number,
    WindChill: number,
    RainRate: number,
    RainDay: number,
    RainLast15m: number,
    RainLast1h: number,
    RainLast24h: number,
    RainMonth: number,
    RainYear: number
}

class DavisIpCollector {
    readonly #ip: string
    readonly #port: number
    readonly #timeout: number
    #WindDir10Min: Array<number> = []

    constructor(ip: string, port: number, timeout: number) {
        this.#ip = ip
        this.#port = port
        this.#timeout = timeout
    }

     readDataFromStation() {
        return new Promise<DavisResponseData>((resolve) => {
            let client = new Socket()
            let receiveBuffer = Buffer.from('', 'hex')

            client.setTimeout(this.#timeout)

            logger.info(`Connecting to Davis weather-station on ${this.#ip}:${this.#port} `, { component: 'DavisIpCollector'})

            client.connect(this.#port, this.#ip, () => {
                logger.info('Connection to Davis weather-station established', { component: 'DavisIpCollector'})
                client.write("\n",'utf8')

                setTimeout(() => {
                    logger.debug('Sending LPS 3 2', { component: 'DavisIpCollector'})
                    client.write('LPS 3 2\n','utf8')
                }, 600)
            })

            client.on('data', (packet) => {
                receiveBuffer = Buffer.concat([receiveBuffer, packet])

                if (receiveBuffer.byteLength < 201) {
                    logger.debug(`Waiting for more data from Station. Current receive buffer size ${receiveBuffer.byteLength}Byte`, {component: 'DavisIpCollector'})
                } else if (receiveBuffer.byteLength > 201) {
                    logger.error(`Unexpected amount of data received from Station. Expected 201Byte received ${receiveBuffer.byteLength}Byte`, {component: 'DavisIpCollector'})
                    client.end()
                    throw new Error('Unexpected amount of data received from Station.')
                } else {
                    resolve(this.parseWeatherStationResponse(receiveBuffer))
                    client.end()
                }
            })

            client.on('error', (error) => {
                logger.error(`A error accorded while communicating whit the weather-station. Error: ${error.message}`, { component: 'DavisIpCollector'})
            })

            client.on('close', () => {
                logger.info('Connection to weather-station closed', { component: 'DavisIpCollector'})
            })

            client.on('timeout', () => {
                logger.warn(`No response from ${this.#ip} after ${this.#timeout}ms`, { component: 'DavisIpCollector'})
                client.end();
            })
        })
    }

    private parseWeatherStationResponse(response: Buffer): DavisResponseData {
        const data: DavisResponseData = <DavisResponseData>{}

        var loop1 = Buffer.alloc(99);
        var loop2 = Buffer.alloc(99);
        response.copy(loop1,0,3,102);
        response.copy(loop2,0,102,201);

        if(this.calcCRC(loop1) != 0 || this.calcCRC(loop2) != 0 ) {
            throw new Error("CRC check for received data failed")
        }

        if(String.fromCharCode(loop1.readInt8(0), loop1.readInt8(1), loop1.readInt8(2)) === 'LOO' && loop1.readInt8(4) === 0) {
            data.RainMonth = this.convert_Cltomm(loop1.readInt16LE(52))
            data.RainYear = this.convert_Cltomm(loop1.readInt16LE(54))
        } else {
            throw new Error('Data received from Station is not an LOOP 1 Packet')
        }

        if(String.fromCharCode(loop2.readInt8(0), loop2.readInt8(1), loop2.readInt8(2)) === 'LOO' && loop2.readInt8(4) === 1) {
            data.BarTrend = loop2.readInt8(3)
            data.Pressure = this.convert_InHgtoHpa(loop2.readInt16LE(7)/1000)
            data.InTemp = this.convert_FtoC(loop2.readInt16LE(9)/10)
            data.InHum = loop2.readUInt8(11)
            data.OutTemp = this.convert_FtoC(loop2.readInt16LE(12)/10)
            data.WindSpeed = this.convert_MphtoKmh(loop2.readInt8(14))
            data.WindDir = loop2.readUInt16LE(16)
            data.WindDir10av = Math.round(this.calcWindDir10Av(data.WindDir))
            data.WindSpeed10av = this.convert_MphtoKmh(loop2.readUInt16LE(18)/10)
            data.WindSpeed2av = this.convert_MphtoKmh(loop2.readUInt16LE(20)/10)
            data.WindGust = this.convert_MphtoKmh(loop2.readUInt16LE(22))
            data.WindGustDir = loop2.readUInt16LE(24)
            data.DewPoint = this.convert_FtoC(loop2.readInt16LE(30))
            data.OutHum = loop2.readUInt8(33)
            data.HeatIndex = this.convert_FtoC(loop2.readInt16LE(35))
            data.WindChill = this.convert_FtoC(loop2.readInt16LE(37))
            data.RainRate = this.convert_Cltomm(loop2.readInt16LE(41))
            data.RainDay = this.convert_Cltomm(loop2.readInt16LE(50))
            data.RainLast15m = this.convert_Cltomm(loop2.readInt16LE(52))
            data.RainLast1h = this.convert_Cltomm(loop2.readInt16LE(54))
            data.RainLast24h = this.convert_Cltomm(loop2.readInt16LE(58))
        } else {
            throw new Error('Data received from Station is not an LOOP 2 Packet')
        }

        if(!this.validate(data)) {
            throw new Error('Data received from Station is not plausible');
        }

        return data
    }

    private convert_InHgtoHpa(pressure: number): number {
        return this.round(pressure * 33.863886666667,2)
    }

    private convert_FtoC(tempF: number): number {
        tempF -= 32
        return this.round(tempF / 1.8,2)
    }

    private convert_MphtoKmh(speed: number): number {
        return this.round(speed * 1.60934,2)
    }

    private convert_Cltomm(clicks: number): number {
        return this.round(clicks * 0.2,2)
    }

    private round(x: number, n: number): number {
        const a = Math.pow(10, n)
        return (Math.round(x * a) / a)
    }

    private calcWindDir10Av(value: number): number {
        this.#WindDir10Min.unshift(value)
        if(this.#WindDir10Min.length>60) {
            this.#WindDir10Min.pop()
        }

        let sum = 0
        for(let i= 0; i < this.#WindDir10Min.length; i++) {
            sum += this.#WindDir10Min[i]
        }

        return sum / this.#WindDir10Min.length
    }

    private CalcBinaryTime(): Buffer {
        const date = new Date()
        const BinaryTime = Buffer.alloc(6)

        BinaryTime.writeUInt8(date.getSeconds(),0)
        BinaryTime.writeUInt8(date.getMinutes(),1)
        BinaryTime.writeUInt8(date.getHours(),2)
        BinaryTime.writeUInt8(date.getDate(),3)
        BinaryTime.writeUInt8(date.getMonth()+1,4)
        const davisYear = date.getFullYear() - 1900
        BinaryTime.writeUInt8(davisYear,5)

        const davisBinaryTime = Buffer.alloc(8)
        davisBinaryTime.writeUInt16BE(this.calcCRC(BinaryTime),6)
        BinaryTime.copy(davisBinaryTime)
        return davisBinaryTime
    }

    private calcCRC(data: Buffer): number {
        let crc = 0
        const crc_table = [
            0x0,    0x1021, 0x2042, 0x3063, 0x4084, 0x50a5, 0x60c6, 0x70e7,
            0x8108, 0x9129, 0xa14a, 0xb16b, 0xc18c, 0xd1ad, 0xe1ce, 0xf1ef,
            0x1231, 0x210, 0x3273, 0x2252, 0x52b5, 0x4294, 0x72f7, 0x62d6,
            0x9339, 0x8318, 0xb37b, 0xa35a, 0xd3bd, 0xc39c, 0xf3ff, 0xe3de,
            0x2462, 0x3443, 0x420, 0x1401, 0x64e6, 0x74c7, 0x44a4, 0x5485,
            0xa56a, 0xb54b, 0x8528, 0x9509, 0xe5ee, 0xf5cf, 0xc5ac, 0xd58d,
            0x3653, 0x2672, 0x1611, 0x630, 0x76d7, 0x66f6, 0x5695, 0x46b4,
            0xb75b, 0xa77a, 0x9719, 0x8738, 0xf7df, 0xe7fe, 0xd79d, 0xc7bc,
            0x48c4, 0x58e5, 0x6886, 0x78a7, 0x840, 0x1861, 0x2802, 0x3823,
            0xc9cc, 0xd9ed, 0xe98e, 0xf9af, 0x8948, 0x9969, 0xa90a, 0xb92b,
            0x5af5, 0x4ad4, 0x7ab7, 0x6a96, 0x1a71, 0xa50, 0x3a33, 0x2a12,
            0xdbfd, 0xcbdc, 0xfbbf, 0xeb9e, 0x9b79, 0x8b58, 0xbb3b, 0xab1a,
            0x6ca6, 0x7c87, 0x4ce4, 0x5cc5, 0x2c22, 0x3c03, 0xc60, 0x1c41,
            0xedae, 0xfd8f, 0xcdec, 0xddcd, 0xad2a, 0xbd0b, 0x8d68, 0x9d49,
            0x7e97, 0x6eb6, 0x5ed5, 0x4ef4, 0x3e13, 0x2e32, 0x1e51, 0xe70,
            0xff9f, 0xefbe, 0xdfdd, 0xcffc, 0xbf1b, 0xaf3a, 0x9f59, 0x8f78,
            0x9188, 0x81a9, 0xb1ca, 0xa1eb, 0xd10c, 0xc12d, 0xf14e, 0xe16f,
            0x1080, 0xa1, 0x30c2, 0x20e3, 0x5004, 0x4025, 0x7046, 0x6067,
            0x83b9, 0x9398, 0xa3fb, 0xb3da, 0xc33d, 0xd31c, 0xe37f, 0xf35e,
            0x2b1, 0x1290, 0x22f3, 0x32d2, 0x4235, 0x5214, 0x6277, 0x7256,
            0xb5ea, 0xa5cb, 0x95a8, 0x8589, 0xf56e, 0xe54f, 0xd52c, 0xc50d,
            0x34e2, 0x24c3, 0x14a0, 0x481, 0x7466, 0x6447, 0x5424, 0x4405,
            0xa7db, 0xb7fa, 0x8799, 0x97b8, 0xe75f, 0xf77e, 0xc71d, 0xd73c,
            0x26d3, 0x36f2, 0x691, 0x16b0, 0x6657, 0x7676, 0x4615, 0x5634,
            0xd94c, 0xc96d, 0xf90e, 0xe92f, 0x99c8, 0x89e9, 0xb98a, 0xa9ab,
            0x5844, 0x4865, 0x7806, 0x6827, 0x18c0, 0x8e1, 0x3882, 0x28a3,
            0xcb7d, 0xdb5c, 0xeb3f, 0xfb1e, 0x8bf9, 0x9bd8, 0xabbb, 0xbb9a,
            0x4a75, 0x5a54, 0x6a37, 0x7a16, 0xaf1, 0x1ad0, 0x2ab3, 0x3a92,
            0xfd2e, 0xed0f, 0xdd6c, 0xcd4d, 0xbdaa, 0xad8b, 0x9de8, 0x8dc9,
            0x7c26, 0x6c07, 0x5c64, 0x4c45, 0x3ca2, 0x2c83, 0x1ce0, 0xcc1,
            0xef1f, 0xff3e, 0xcf5d, 0xdf7c, 0xaf9b, 0xbfba, 0x8fd9, 0x9ff8,
            0x6e17, 0x7e36, 0x4e55, 0x5e74, 0x2e93, 0x3eb2, 0xed1, 0x1ef0 ]

        for (let i = 0; i < data.byteLength; ++i) {
            crc = (crc_table[(crc >> 8) ^ data[i]] ^ (crc << 8)) & 0xFFFF
        }

        return crc
    }

    private validate(data: DavisResponseData): boolean {
        if(data.RainDay < 0 || data.RainMonth < 0 || data.RainYear < 0 || data.RainRate < 0 || data.RainLast1h < 0 || data.RainLast15m < 0 || data.RainLast24h < 0) {
            logger.error('Rain measurements not plausible', { component: 'DavisIpCollector'})
            return false
        }

        if(data.OutTemp > 100 || data.OutTemp < -100 || data.DewPoint > 100 || data.DewPoint < -100) {
            logger.error('Out temperature not plausible', { component: 'DavisIpCollector'})
            return false
        }

        if(data.OutHum < 0 || data.OutHum > 100) {
            logger.error('Out humidity not plausible', { component: 'DavisIpCollector'})
            return false
        }

        if(data.InTemp > 100 || data.InTemp < -50) {
            logger.error('In temperatures not plausible', { component: 'DavisIpCollector'})
            return false
        }

        if(data.InHum < 0 || data.InHum > 100) {
            logger.error('In humidity not plausible', { component: 'DavisIpCollector'})
            return false
        }

        if(data.WindSpeed < 0 || data.WindSpeed > 200 || data.WindGust < 0 || data.WindGust > 200) {
            logger.error('Wind speed not plausible', { component: 'DavisIpCollector'})
            return false
        }

        return true
    }

}

export default DavisIpCollector
export { DavisResponseData }
