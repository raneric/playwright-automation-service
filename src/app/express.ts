import express, { Express } from 'express';
import { AwilixContainer } from 'awilix';
import { Logger } from '../infrastructure/logger';
import { AppConfig } from '../infrastructure/config';
import {
  createClaimRoutes,
  createOrderRoutes,
  createSearchRoutes,
  createHealthRoutes,
} from '../routes';
import {
  errorHandler,
  requestLogger,
  requestTimeout,
  apiKeyAuth,
  createRateLimiter,
} from '../middleware';
import { DEFAULT_TIMEOUTS } from '../shared/constants';

/**
 * Create and configure the Express application.
 * All dependencies are resolved from the DI container.
 *
 * Middleware order (matters):
 *  1. JSON parsing
 *  2. Request logging
 *  3. Request timeout
 *  4. Health check (unauthenticated)
 *  5. Rate limiter  } applied to /api/* only
 *  6. API key auth  }
 *  7. Route handlers
 *  8. Error handler (must be last)
 */
export function createApp(container: AwilixContainer): Express {
  const app = express();
  const logger = container.resolve<Logger>('logger');
  const config = container.resolve<AppConfig>('config');

  // ── Global middleware ─────────────────────────────────────────────────────
  app.use(express.json({ limit: '1mb' }));
  app.use(requestLogger(logger));
  app.use(requestTimeout(DEFAULT_TIMEOUTS.workflow));

  // ── Health check (no auth, no rate limit) ────────────────────────────────
  app.use('/health', createHealthRoutes());

  // ── API routes (rate-limited + authenticated) ────────────────────────────
  const apiRouter = express.Router();
  apiRouter.use(createRateLimiter());
  apiRouter.use(apiKeyAuth(config.saas.apiKey, logger));

  apiRouter.use('/claim', createClaimRoutes(container.resolve('claimController')));
  apiRouter.use('/order', createOrderRoutes(container.resolve('orderController')));
  apiRouter.use('/search', createSearchRoutes(container.resolve('searchController')));

  app.use('/api', apiRouter);

  // ── Error handler (must be last) ─────────────────────────────────────────
  app.use(errorHandler(logger));

  return app;
}
