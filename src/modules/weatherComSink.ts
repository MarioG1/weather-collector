import logger from './logger'
import axios from "axios";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc"
import {DavisResponseData} from "./davisIpCollector";
import * as UnitConversion from "./unitConverstion"

class WeatherComSink {
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

        dayjs.extend(utc)
    }

    tryPush(data: DavisResponseData) {
        if((Date.now() - this.#lastUpload.getTime()) < this.#uploadInterval * 1000) {
            logger.debug(`Nothing to do. Last upload was ${this.#lastUpload}`, { component: 'WeatherComSink'})
            return
        }

        axios.get(this.#apiUrl, {timeout: this.#timeout, params: this.buildQueryString(data)}).then((resp) => {
            logger.info('Data successfully pushed to WeatherCom.', { component: 'WeatherComSink'})
            logger.debug(`Response Data: ${resp.data}`, { component: 'WeatherComSink'})
        }).catch((error) => {
            logger.error(`Error pushing data to WeatherCom. Error: ${error}`, { component: 'WeatherComSink'})
        })

        this.#lastUpload = new Date();
    }

    private buildQueryString(data: DavisResponseData) {
        return {
            'test': false,
            'id': this.#user,
            'pwd': this.#password,
            'sid': 'weewx',
            'version': '3.0',
            'dtutc': dayjs().utc().format('YYYYMMDDHHmm'),
            'hu': data.OutHum,
            'te': data.OutTemp,
            'dp': data.DewPoint,
            'pr': data.Pressure,
            'pcf': this.formatPressureTrend(data.BarTrend),
            'wd': data.WindDir,
            'ws': UnitConversion.Kmhtoms(data.WindSpeed2av),
            'wg': UnitConversion.Kmhtoms(data.WindGust),
            'pa': data.RainLast1h,
            'rr': data.RainRate
        }
    }

    private formatPressureTrend(pressure: number): number {
        switch (pressure) {
            case -60:
            case -20:
                return 7;
                break;
            case 0:
                return 4;
                break;
            case 20:
            case 60:
                return 2;
                break;
            default:
                return 4
        }
    }
}

export default WeatherComSink