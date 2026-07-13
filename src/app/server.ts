import 'dotenv/config';

import { loadConfig } from '../infrastructure/config';
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
 *  3. Build the DI container
 *  4. Create and start the Express app
 *  5. Register graceful shutdown handlers
 */
async function main(): Promise<void> {
  const config = loadConfig();
  const logger = createLogger({
    level: config.logLevel,
    pretty: config.logPretty,
  });

  logger.info({ env: config.nodeEnv }, 'Starting Playwright Automation Service');

  const container = buildContainer(config, logger);
  const app = createApp(container);

  const server = app.listen(config.port, () => {
    logger.info({ port: config.port }, 'Server listening');
  });

  // ── Graceful shutdown ────────────────────────────────────────
  const shutdown = async (signal: string) => {
    logger.info({ signal }, 'Shutdown signal received');

    server.close(async () => {
      const browserManager = container.resolve<BrowserManager>('browserManager');
      await browserManager.shutdown();
      logger.info('Server shut down complete');
      process.exit(0);
    });

    // Force exit after 10s
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