import logger from './logger'
import axios from "axios";
import dayjs from "dayjs";
import * as UnitConversion from "./unitConverstion"
import {DavisResponseData} from "./davisIpCollector";

class WeatherUndergroundSink {
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
            logger.debug(`Nothing to do. Last upload was ${this.#lastUpload}`, { component: 'WeatherUndergroundSink'})
            return
        }

        logger.info(`Uploading data to WeatherUnderground...`, { component: 'WeatherUndergroundSink'})
        axios.get(this.#apiUrl, {timeout: this.#timeout, params: this.buildQueryString(data)}).then((resp) => {
            logger.info('Data successfully pushed to WeatherUnderground.', { component: 'WeatherUndergroundSink'})
            logger.debug(`Response Data: ${resp.data}`, { component: 'WeatherUndergroundSink'})
        }).catch((error) => {
            logger.error(`Error pushing data to WeatherUnderground. Error: ${error}`, { component: 'WeatherUndergroundSink'})
        })

        this.#lastUpload = new Date();
    }

    private buildQueryString(data: DavisResponseData) {
        return {
            'action': 'updateraw',
            'ID': this.#user,
            'PASSWORD': this.#password,
            'dateutc': dayjs().format('YYYY-MM-DD HH:mm:ss'),
            'winddir': data.WindDir,
            'windspeedmph': UnitConversion.KmhtoMph(data.WindSpeed),
            'windgustmph': UnitConversion.KmhtoMph(data.WindGust),
            'windgustdir': data.WindGustDir,
            'windspdmph_avg2m': UnitConversion.KmhtoMph(data.WindSpeed2av),
            'humidity': data.OutHum,
            'dewptf': UnitConversion.CtoF(data.DewPoint),
            'tempf': UnitConversion.CtoF(data.OutTemp),
            'rainin': UnitConversion.MmtoInch(data.RainRate),
            'dailyrainin': UnitConversion.MmtoInch(data.RainDay),
            'baromin': UnitConversion.MmtoInch(data.Pressure),
            'realtime': 1,
            'rtfreq': 10
        }
    }
}

export default WeatherUndergroundSink