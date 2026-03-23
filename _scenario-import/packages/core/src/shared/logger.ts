import winston from "winston";
import { env } from "./env";

const { combine, timestamp, printf, colorize } = winston.format;

const consoleFormat = printf(({ level, message, timestamp, ...meta }) => {
  const metaString = Object.keys(meta).length ? `\n${JSON.stringify(meta, null, 2)}` : "";
  return `${timestamp} [${level}]: ${message}${metaString}`;
});

export const logger = winston.createLogger({
  level: env.LOG_LEVEL,
  // Base format for file transports
  format: combine(timestamp(), winston.format.json()),
  transports: [
    // Console transport for development readability
    new winston.transports.Console({
      format: combine(colorize(), timestamp(), consoleFormat),
    }),
    // File transports for telemetry and persistence
    new winston.transports.File({ filename: "logs/error.log", level: "error" }),
    new winston.transports.File({ filename: "logs/combined.log" }),
  ],
});
