type LogLevel = 'info' | 'warn' | 'error' | 'debug';

function formatMessage(level: LogLevel, message: string, data?: unknown): string {
  const timestamp = new Date().toISOString();
  const dataStr = data !== undefined ? ` ${JSON.stringify(data)}` : '';
  return `[${timestamp}] [${level.toUpperCase()}] ${message}${dataStr}`;
}

export const logger = {
  info(message: string, data?: unknown): void {
    console.log(formatMessage('info', message, data));
  },

  warn(message: string, data?: unknown): void {
    console.warn(formatMessage('warn', message, data));
  },

  error(message: string, data?: unknown): void {
    console.error(formatMessage('error', message, data));
  },

  debug(message: string, data?: unknown): void {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(formatMessage('debug', message, data));
    }
  },
};
