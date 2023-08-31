import winston = require('winston')
import { format } from 'logform';
import config from 'config';

const alignedWithColorsAndTime = format.combine(
    format.colorize(),
    format.timestamp(),
    format.metadata({ fillExcept: ['message', 'level', 'timestamp', 'label'] }),
    format.printf(info => `${info.timestamp} ${info.level} [${info.metadata.component}] => ${info.message}`)
);

const logger = winston.createLogger({
    level: config.get("logging.level"),
    format: alignedWithColorsAndTime,
    defaultMeta: { component: '-' },
    transports: [new winston.transports.Console()]
})

export default logger