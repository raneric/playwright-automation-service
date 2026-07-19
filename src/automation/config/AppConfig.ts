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
  /** Optional API key for protecting this platform's endpoints */
  apiKey: string | undefined;

  /** Per-platform page paths (relative to baseUrl) */
  pages: {
    login: string;
    purchaseOrder: string;
    purchaseOrderList: string;
    customerClaim: string;
  };

  /** Per-platform login form selectors (data-testid values) */
  loginSelectors: {
    username: string;
    password: string;
    submitBtn: string;
    error: string;
  };
}

export interface AppConfig {
  nodeEnv: string;
  port: number;
  logLevel: string;
  logPretty: boolean;

  /** Default API key used as fallback when a platform has none configured */
  defaultApiKey: string | undefined;

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
      apiKey: process.env[`${prefix}API_KEY`] || undefined,
      pages: {
        login: envStr(`${prefix}PAGE_LOGIN`, '/login'),
        purchaseOrder: envStr(
          `${prefix}PAGE_PURCHASE_ORDER`,
          '/purchase-order'
        ),
        purchaseOrderList: envStr(
          `${prefix}PAGE_PURCHASE_ORDER_LIST`,
          '/purchase-orders'
        ),
        customerClaim: envStr(
          `${prefix}PAGE_CUSTOMER_CLAIM`,
          '/customer-claim'
        ),
      },
      loginSelectors: {
        username: envStr(`${prefix}LOGIN_SEL_USERNAME`, 'login-username'),
        password: envStr(`${prefix}LOGIN_SEL_PASSWORD`, 'login-password'),
        submitBtn: envStr(`${prefix}LOGIN_SEL_SUBMIT`, 'login-submit-btn'),
        error: envStr(`${prefix}LOGIN_SEL_ERROR`, 'login-error'),
      },
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

    defaultApiKey: process.env.API_KEY || undefined,
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
  };
}
