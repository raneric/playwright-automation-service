import { envInt, envStr } from '../../shared/helperFunctions/envHelper';

export interface AppConfig {
  nodeEnv: string;
  port: number;
  logLevel: string;
  logPretty: boolean;

  authToken: string | undefined;
}

export function loadAppConfig(): AppConfig {
  return {
    nodeEnv: envStr('NODE_ENV', 'development'),
    port: envInt('PORT', 3001),
    logLevel: envStr('LOG_LEVEL', 'info'),
    logPretty: envStr('NODE_ENV', 'development') !== 'production',
    authToken: process.env.AUTH_TOKEN || undefined,
  };
}
