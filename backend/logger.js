import winston from 'winston';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const logsDir = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Define four log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

const jsonFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

const logger = winston.createLogger({
  levels,
  level: process.env.LOG_LEVEL || 'info',
  format: jsonFormat,
  transports: [
    // Standard log file (captures all levels up to debug)
    new winston.transports.File({ filename: path.join(logsDir, 'standard.log'), level: 'debug' })
  ],
  exitOnError: false,
});

// Handle uncaught exceptions and unhandled promise rejections
logger.exceptions.handle(
  new winston.transports.File({ filename: path.join(logsDir, 'exceptions.log'), format: jsonFormat })
);

logger.rejections.handle(
  new winston.transports.File({ filename: path.join(logsDir, 'rejections.log'), format: jsonFormat })
);

// During development also log to the console in human readable form
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

export default logger;

