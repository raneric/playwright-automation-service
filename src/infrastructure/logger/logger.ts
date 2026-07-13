import pino, { Logger as PinoLogger } from 'pino';

export type Logger = PinoLogger;

export interface LoggerConfig {
  level: string;
  pretty: boolean;
}

export function createLogger(config: LoggerConfig): Logger {
  return pino({
    level: config.level,
    ...(config.pretty
      ? {
          transport: {
            target: 'pino-pretty',
            options: { colorize: true, translateTime: 'SYS:HH:MM:ss.l' },
          },
        }
      : {}),
  });
}
