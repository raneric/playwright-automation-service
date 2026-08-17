import 'dotenv/config';

import {
  loadPlaywrightConfig,
  redactConfig,
} from '../../automation/playwright/config';
import { createLogger } from '../../shared/logger';
import { buildContainer } from './container';
import { createApp } from './express';
import { BrowserManager } from '../../automation/playwright/BrowserManager';
import { loadAppConfig } from './AppCofing';

/**
 * Application entry point.
 *
 * Boot sequence:
 *  1. Load configuration from environment
 *  2. Create structured logger
 *  3. Log redacted config (password never logged)
 *  4. Build the DI container
 *  5. Create and start the Express app
 *  6. Register graceful shutdown handlers
 */
async function main(): Promise<void> {
  const playwrightAppConfig = loadPlaywrightConfig();
  const appConfig = loadAppConfig();
  const logger = createLogger({
    level: appConfig.logLevel,
    pretty: appConfig.logPretty,
  });

  logger.info(
    { env: appConfig.nodeEnv },
    'Starting Playwright Automation Service'
  );
  logger.debug(
    { config: redactConfig(playwrightAppConfig) },
    'Loaded configuration'
  );

  const container = buildContainer(appConfig, playwrightAppConfig, logger);
  const app = createApp(container);

  const server = app.listen(appConfig.port, () => {
    logger.info(
      {
        port: appConfig.port,
        platforms: Object.keys(playwrightAppConfig.platforms),
      },
      'Server listening'
    );
  });

  // ── Graceful shutdown ──────────────────────────────────────────────────────
  const shutdown = async (signal: string) => {
    logger.info({ signal }, 'Shutdown signal received');

    server.close(async () => {
      const browserManager =
        container.resolve<BrowserManager>('browserManager');
      await browserManager.shutdown();
      logger.info('Shutdown complete');
      process.exit(0);
    });

    // Force exit if graceful shutdown stalls
    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 10_000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((err) => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});
