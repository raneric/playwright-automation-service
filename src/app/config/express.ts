import express, { Express } from 'express';
import { AwilixContainer } from 'awilix';
import { Logger } from '../../shared/logger';
import { AppConfig } from '../../automation/config';
import {
  createClaimRoutes,
  createSearchRoutes,
  createHealthRoutes,
} from '../http/routes';
import {
  errorHandler,
  requestLogger,
  requestTimeout,
  apiKeyAuth,
  createRateLimiter,
} from '../http/middleware';
import { DEFAULT_TIMEOUTS } from '../../shared/constants';

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
 *  6. API key auth  } per-platform
 *  7. Route handlers (mounted under /api/:platform)
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

  // ── API routes (rate-limited + per-platform authenticated) ────────────────
  const apiRouter = express.Router();
  apiRouter.use(createRateLimiter());

  // Per-platform API key auth: resolves the key from the :platform param
  apiRouter.use('/:platform', (req, res, next) => {
    const platformName = req.params.platform as string;
    const platform = config.platforms[platformName];
    const apiKey = platform?.apiKey ?? config.defaultApiKey;
    apiKeyAuth(apiKey, logger)(req, res, next);
  });

  // Mount resource routes under /api/:platform
  apiRouter.use(
    '/:platform/claim',
    createClaimRoutes(container.resolve('claimController'))
  );
  apiRouter.use(
    '/:platform/search',
    createSearchRoutes(container.resolve('searchController'))
  );

  app.use('/api', apiRouter);

  // ── Error handler (must be last) ─────────────────────────────────────────
  app.use(errorHandler(logger));

  return app;
}
