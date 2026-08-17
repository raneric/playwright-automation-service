/**
 * Central application configuration loaded from environment variables.
 * All secrets and environment-specific values flow through this single module.
 */

/** Configuration for a single target SaaS platform. */
export interface PlatformConfig {
  name: string;
  baseUrl: string;
  loginUrl: string;
  username: string;
  password: string;
}

export interface AppConfig {
  nodeEnv: string;
  port: number;
  logLevel: string;
  logPretty: boolean;

  /** Bearer token used to authenticate API requests */
  authToken: string | undefined;

  /** All target SaaS platforms, keyed by a short name (e.g. "acme", "contoso") */
  platforms: Record<string, PlatformConfig>;

  /** Playwright browser configuration */
  browser: {
    headless: boolean;
    slowMo: number;
    viewport: { width: number; height: number };
    /** Maximum number of concurrent browser contexts */
    maxConcurrentContexts: number;
  };

  /** Network throttling — simulates slow connections like DevTools */
  network: {
    /** Set to true to simulate offline mode */
    offline: boolean;
    /** Download speed in bytes per second (0 = unlimited) */
    downloadThroughput: number;
    /** Upload speed in bytes per second (0 = unlimited) */
    uploadThroughput: number;
    /** Round-trip latency in milliseconds (0 = none) */
    latency: number;
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
 * Serialization-safe view of the config — passwords redacted.
 * Used when logging the config at startup.
 */
export function redactConfig(config: AppConfig): Record<string, unknown> {
  const redactedPlatforms: Record<string, unknown> = {};
  for (const [name, p] of Object.entries(config.platforms)) {
    redactedPlatforms[name] = { ...p, password: '[REDACTED]' };
  }
  return {
    ...config,
    authToken: config.authToken ? '[REDACTED]' : config.authToken,
    platforms: redactedPlatforms,
  };
}

/**
 * Parse a comma-separated list of platform names from SAAS_PLATFORMS.
 * For each platform, read SAAS_{NAME}_{PROPERTY} env vars.
 *
 * Example:
 *   SAAS_PLATFORMS=acme,contoso
 *   SAAS_ACME_BASE_URL=https://acme.example.com
 *   SAAS_ACME_LOGIN_URL=https://acme.example.com/login
 *   SAAS_ACME_USERNAME=admin
 *   SAAS_ACME_PASSWORD=secret
 *   SAAS_CONTOSO_BASE_URL=https://contoso.example.com
 *   ...
 */
function loadPlatforms(): Record<string, PlatformConfig> {
  const names = envStr('SAAS_PLATFORMS', 'default')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const platforms: Record<string, PlatformConfig> = {};

  for (const name of names) {
    const prefix = `SAAS_${name.toUpperCase()}_`;
    platforms[name] = {
      name,
      baseUrl: envStr(`${prefix}BASE_URL`, 'http://localhost:5173'),
      loginUrl: envStr(`${prefix}LOGIN_URL`, 'http://localhost:5173/login'),
      username: envStr(`${prefix}USERNAME`, 'admin'),
      password: envStr(`${prefix}PASSWORD`, 'password123'),
    };
  }

  return platforms;
}

export function loadConfig(): AppConfig {
  return {
    nodeEnv: envStr('NODE_ENV', 'development'),
    port: envInt('PORT', 3001),
    logLevel: envStr('LOG_LEVEL', 'info'),
    logPretty: envStr('NODE_ENV', 'development') !== 'production',

    authToken: process.env.AUTH_TOKEN || undefined,
    platforms: loadPlatforms(),

    browser: {
      headless: envBool('BROWSER_HEADLESS', false),
      slowMo: envInt('BROWSER_SLOW_MO', 0),
      viewport: {
        width: envInt('BROWSER_VIEWPORT_WIDTH', 1280),
        height: envInt('BROWSER_VIEWPORT_HEIGHT', 720),
      },
      maxConcurrentContexts: envInt('BROWSER_MAX_CONTEXTS', 5),
    },

    network: {
      offline: envBool('NETWORK_OFFLINE', false),
      downloadThroughput: envInt('NETWORK_DOWNLOAD_KBPS', 0) * 1024,
      uploadThroughput: envInt('NETWORK_UPLOAD_KBPS', 0) * 1024,
      latency: envInt('NETWORK_LATENCY_MS', 0),
    },
  };
}
