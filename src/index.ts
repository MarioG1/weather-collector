import logger from "./modules/logger";
import davisIpCollector, {DavisResponseData} from "./modules/davisIpCollector";


logger.info("Application Startup....",  { component: "main" })

const davisIP = new davisIpCollector('192.168.1.104', 22222, 5000)

//setInterval(getDataFromWeatherStation, 10000);
getDataFromWeatherStation()

function getDataFromWeatherStation() {
    davisIP.readDataFromStation().then((data: DavisResponseData) => {
        logger.debug(JSON.stringify(data))
    }).catch((error) => {
        logger.error(`Something went wrong while fetching data from weather-station. Error: ${error}`, { component: "main" })
    })
}