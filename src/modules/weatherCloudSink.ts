import logger from './logger'
import axios from "axios";
import dayjs from "dayjs";

import {DavisResponseData} from "./davisIpCollector";


class WeatherCloudSink {
    #user: string
    #password: string
    #apiUrl: string
    #timeout: number
    #uploadInterval: number
    #lastUpload: Date = new Date()

    constructor(apiUrl: string, user: string, password: string, timeout: number, interval: number) {
        this.#apiUrl = apiUrl
        this.#user = user
        this.#password = password
        this.#timeout = timeout
        this.#uploadInterval = interval
    }

    tryPush(data: DavisResponseData) {
        if((Date.now() - this.#lastUpload.getTime()) < this.#uploadInterval * 1000) {
            logger.debug(`Nothing to do. Last upload was ${this.#lastUpload}`, { component: 'WeatherCloudSink'})
            return
        }

        axios.get(this.#apiUrl, {timeout: this.#timeout, params: this.buildQueryString(data)}).then((resp) => {
            logger.info('Data successfully pushed to WeatherCloud.', { component: 'WeatherCloudSink'})
            logger.debug(`Response Data: ${resp.data}`, { component: 'WeatherCloudSink'})
        }).catch((error) => {
            logger.error(`Error pushing data to WeatherCloud. Error: ${error}`, { component: 'WeatherCloudSink'})
        })

        this.#lastUpload = new Date();
    }

    private buildQueryString(data: DavisResponseData) {
        return {
            'ver': '3.0',
            'type': 251,
            'wid': this.#user,
            'key': this.#password,
            'time': dayjs().format('HHmm'),
            'date': dayjs().format('YYYYMMDD'),
            'temp': Math.round(data.OutTemp * 10),
            'hum': data.OutHum,
            'wdir': data.WindDir,
            'wspd': Math.round(this.convert_kmhtoms(data.WindSpeed) * 10),
            'bar': Math.round(data.Pressure * 10),
            'rain': Math.round(data.RainDay * 10),
            'rainrate': Math.round(data.RainRate * 10),
            'dew': Math.round(data.DewPoint * 10),
            'chill': Math.round(data.WindChill * 10),
            'heat': Math.round(data.HeatIndex * 10),
            'wspdhi': Math.round(this.convert_kmhtoms(data.WindGust) * 10),
            'wspdavg': Math.round(this.convert_kmhtoms(data.WindSpeed10av) * 10),
            'wdiravg': data.WindDir10av
        }
    }

    private convert_kmhtoms(speed: number): number {
        return this.round(speed/3.6,2)
    }

    private round(x: number, n: number): number
    {
        var a = Math.pow(10, n)
        return (Math.round(x * a) / a)
    }

}

export default WeatherCloudSink