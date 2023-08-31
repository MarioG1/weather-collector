import config from 'config';
import logger from "./modules/logger";
import davisIpCollector, {DavisResponseData} from "./modules/davisIpCollector";
import InfluxDbSink from "./modules/influxDbSink";
import WeatherCloudSink from "./modules/weatherCloudSink";

logger.info("Application Startup....",  { component: "main" })

const davisIP = new davisIpCollector(config.get('davisIP.ip'), config.get('davisIP.port'), config.get('davisIP.timeout'))
const influxDbSink = new InfluxDbSink(config.get('uploadServices.influxdb.apiUrl'), config.get('uploadServices.influxdb.timeout'), config.get('uploadServices.influxdb.uploadInterval'))
const weatherCloudSink = new WeatherCloudSink(config.get('uploadServices.weathercloud.apiUrl'), config.get('uploadServices.weathercloud.user'), config.get('uploadServices.weathercloud.password'), config.get('uploadServices.weathercloud.timeout'), config.get('uploadServices.weathercloud.uploadInterval'))

setInterval(getDataFromWeatherStation, 10000);

function getDataFromWeatherStation() {
    davisIP.readDataFromStation().then((data: DavisResponseData) => {
        logger.debug(`Received data from weather-station: Data: ${JSON.stringify(data)}`, { component: "main" })
        influxDbSink.tryPush(data)
        weatherCloudSink.tryPush(data)
    }).catch((error) => {
        logger.error(`Something went wrong while fetching data from weather-station. Error: ${error}`, { component: "main" })
    })
}