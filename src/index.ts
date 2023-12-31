import config from 'config'
import logger from "./modules/logger"
import davisIpCollector, {DavisResponseData} from "./modules/davisIpCollector"
import InfluxDbSink from "./modules/influxDbSink"
import WeatherCloudSink from "./modules/weatherCloudSink"
import WeatherUndergroundSink from "./modules/weatherUndergroundSink"
import WeatherComSink from "./modules/weatherComSink"

logger.info("Application Startup....",  { component: "main" })

const davisIP = new davisIpCollector(config.get('davisIP.ip'), config.get('davisIP.port'), config.get('davisIP.timeout'))
const influxDbSink = new InfluxDbSink(config.get('uploadServices.influxdb.apiUrl'), config.get('uploadServices.influxdb.timeout'), config.get('uploadServices.influxdb.uploadInterval'))
const weatherCloudSink = new WeatherCloudSink(config.get('uploadServices.weathercloud.apiUrl'), config.get('uploadServices.weathercloud.user'), config.get('uploadServices.weathercloud.password'), config.get('uploadServices.weathercloud.timeout'), config.get('uploadServices.weathercloud.uploadInterval'))
const weatherUndergroundSink = new WeatherUndergroundSink(config.get('uploadServices.weatherunderground.apiUrl'), config.get('uploadServices.weatherunderground.user'), config.get('uploadServices.weatherunderground.password'), config.get('uploadServices.weatherunderground.timeout'), config.get('uploadServices.weatherunderground.uploadInterval'))
const weatherComSink = new WeatherComSink(config.get('uploadServices.wettercom.apiUrl'), config.get('uploadServices.wettercom.user'), config.get('uploadServices.wettercom.password'), config.get('uploadServices.wettercom.timeout'), config.get('uploadServices.wettercom.uploadInterval'))

setInterval(getDataFromWeatherStation, 10000)
setInterval(updateTime, 86400000)

function getDataFromWeatherStation() {
    davisIP.readDataFromStation().then((data: DavisResponseData) => {
        logger.debug(`Received data from weather-station: Data: ${JSON.stringify(data)}`, { component: "main" })
        influxDbSink.tryPush(data)
        weatherCloudSink.tryPush(data)
        weatherUndergroundSink.tryPush(data)
        weatherComSink.tryPush(data)
    }).catch((error) => {
        logger.error(`Something went wrong while fetching data from weather-station. Error: ${error}`, { component: "main" })
    })
}

function updateTime() {
    logger.info("Updating time on weather station started", { component: "main" })
    davisIP.setTime().then(() => {
        logger.info("Updating time on weather station finished", { component: "main" })
    }).catch((error) => {
        logger.error(`Updating time on weather station failed. Error: ${error}`, { component: "main" })
    })
}