import config from 'config';
import logger from "./modules/logger";
import davisIpCollector, {DavisResponseData} from "./modules/davisIpCollector";
import InfluxDbSink from "./modules/influxDbSink";

logger.info("Application Startup....",  { component: "main" })

const davisIP = new davisIpCollector(config.get('davisIP.ip'), config.get('davisIP.port'), config.get('davisIP.timeout'))
const influxDbSink = new InfluxDbSink(config.get('uploadServices.influxdb.apiUrl'), config.get('uploadServices.influxdb.uploadInterval'), config.get('uploadServices.influxdb.timeout'))

//setInterval(getDataFromWeatherStation, 10000);
getDataFromWeatherStation()

function getDataFromWeatherStation() {
    davisIP.readDataFromStation().then((data: DavisResponseData) => {
        logger.debug(`Received data from weather-station: Data: ${JSON.stringify(data)}`, { component: "main" })
        influxDbSink.tryPush(data)
    }).catch((error) => {
        logger.error(`Something went wrong while fetching data from weather-station. Error: ${error}`, { component: "main" })
    })
}