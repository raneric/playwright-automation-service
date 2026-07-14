/**
 * Central application configuration loaded from environment variables.
 * All secrets and environment-specific values flow through this single module.
 */
export interface AppConfig {
  nodeEnv: string;
  port: number;
  logLevel: string;
  logPretty: boolean;

  /** Target SaaS application */
  saas: {
    baseUrl: string;
    loginUrl: string;
    username: string;
    password: string;
    /** Optional API key for protecting the automation service's own endpoints */
    apiKey: string | undefined;
  };

  /** Playwright browser configuration */
  browser: {
    headless: boolean;
    slowMo: number;
    viewport: { width: number; height: number };
    /** Maximum number of concurrent browser contexts */
    maxConcurrentContexts: number;
  };
}

function envStr(key: string, fallback: string): string {
  return process.env[key] ?? fallback;
}

function envInt(key: string, fallback: number): number {
  const val = process.env[key];
  return val ? parseInt(val, 10) : fallback;
}

function envBool(key: string, fallback: boolean): boolean {
  const val = process.env[key];
  if (val === undefined) return fallback;
  return val === '1' || val.toLowerCase() === 'true';
}

/**
 * Serialization-safe view of the config — password redacted.
 * Used when logging the config at startup.
 */
export function redactConfig(config: AppConfig): Record<string, unknown> {
  return {
    ...config,
    saas: { ...config.saas, password: '[REDACTED]' },
  };
}

export function loadConfig(): AppConfig {
  return {
    nodeEnv: envStr('NODE_ENV', 'development'),
    port: envInt('PORT', 3001),
    logLevel: envStr('LOG_LEVEL', 'info'),
    logPretty: envStr('NODE_ENV', 'development') !== 'production',

    saas: {
      baseUrl: envStr('SAAS_BASE_URL', 'http://localhost:5173'),
      loginUrl: envStr('SAAS_LOGIN_URL', 'http://localhost:5173/login'),
      username: envStr('SAAS_USERNAME', 'admin'),
      password: envStr('SAAS_PASSWORD', 'password123'),
      apiKey: process.env.API_KEY || undefined,
    },

    browser: {
      headless: envBool('BROWSER_HEADLESS', false),
      slowMo: envInt('BROWSER_SLOW_MO', 0),
      viewport: {
        width: envInt('BROWSER_VIEWPORT_WIDTH', 1280),
        height: envInt('BROWSER_VIEWPORT_HEIGHT', 720),
      },
      maxConcurrentContexts: envInt('BROWSER_MAX_CONTEXTS', 5),
    },
  };
}
