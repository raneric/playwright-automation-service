import 'dotenv/config';

import { loadConfig, redactConfig } from '../infrastructure/config';
import { createLogger } from '../infrastructure/logger';
import { buildContainer } from './container';
import { createApp } from './express';
import { BrowserManager } from '../infrastructure/playwright/BrowserManager';

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
  const config = loadConfig();
  const logger = createLogger({
    level: config.logLevel,
    pretty: config.logPretty,
  });

  logger.info({ env: config.nodeEnv }, 'Starting Playwright Automation Service');
  logger.debug({ config: redactConfig(config) }, 'Loaded configuration');

  const container = buildContainer(config, logger);
  const app = createApp(container);

  const server = app.listen(config.port, () => {
    logger.info(
      { port: config.port, apiKeyEnabled: Boolean(config.saas.apiKey) },
      'Server listening',
    );
  });

  // ── Graceful shutdown ──────────────────────────────────────────────────────
  const shutdown = async (signal: string) => {
    logger.info({ signal }, 'Shutdown signal received');

    server.close(async () => {
      // 'browserSession' is the container registration key for BrowserManager
      const browserManager = container.resolve<BrowserManager>('browserSession');
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
