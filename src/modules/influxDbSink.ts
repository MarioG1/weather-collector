import logger from './logger'
import axios from "axios";
import {DavisResponseData} from "./davisIpCollector";

class InfluxDbSink {
    #apiUrl: string
    #timeout: number
    #uploadInterval: number
    #lastUpload: Date = new Date()

    constructor(apiUrl: string, timeout: number, interval: number) {
        this.#apiUrl = apiUrl
        this.#timeout = timeout
        this.#uploadInterval = interval
    }

    tryPush(data: DavisResponseData) {
        if((Date.now() - this.#lastUpload.getTime()) < this.#uploadInterval * 1000) {
            logger.debug(`Nothing to do. Last upload was ${this.#lastUpload}`, { component: 'InfluxDbSink'})
            return
        }

        logger.info(`Uploading data to influxDB...`, { component: 'InfluxDbSink'})
        axios.post(this.#apiUrl, this.buildQueryString(data), {timeout: this.#timeout}).then((resp) => {
            logger.info('Data successfully pushed to influxDB.', { component: 'InfluxDbSink'})
            logger.debug(`Response Data: ${resp.data}`, { component: 'InfluxDbSink'})
        }).catch((error) => {
            logger.error(`Error pushing data to influxDB. Error: ${error}`, { component: 'InfluxDbSink'})
        })

        this.#lastUpload = new Date();
    }

    private buildQueryString(data: DavisResponseData): string {
        let queryString = ''
        for(let key in data) {
            queryString += (`${key},station=davis value=${data[key]}\n`)
        }

        return queryString
    }
}

export default InfluxDbSink