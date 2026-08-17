import express, { Express } from 'express';
import { AwilixContainer } from 'awilix';
import { Logger } from '../../shared/logger';
import {
  createClaimRoutes,
  createSearchRoutes,
  createHealthRoutes,
} from '../http/routes';
import {
  errorHandler,
  requestLogger,
  requestTimeout,
  bearerTokenAuth,
  createRateLimiter,
} from '../http/middleware';
import { DEFAULT_TIMEOUTS } from '../../shared/constants';
import { AppConfig } from './AppCofing';

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
 *  6. Bearer token auth  } applied to /api/* only
 *  7. Route handlers (mounted under /api/:platform)
 *  8. Error handler (must be last)
 */
export function createApp(container: AwilixContainer): Express {
  const app = express();
  const logger = container.resolve<Logger>('logger');
  const appConfig = container.resolve<AppConfig>('appConfig');

  // ── Global middleware ─────────────────────────────────────────────────────
  app.use(express.json({ limit: '1mb' }));
  app.use(requestLogger(logger));
  app.use(requestTimeout(DEFAULT_TIMEOUTS.workflow));

  // ── Health check (no auth, no rate limit) ────────────────────────────────
  app.use('/health', createHealthRoutes());

  // ── API routes (rate-limited + per-platform authenticated) ────────────────
  const apiRouter = express.Router();
  apiRouter.use(createRateLimiter());

  // Bearer token auth: a single service-wide token protects all /api/* routes
  apiRouter.use('/:platform', (req, res, next) => {
    bearerTokenAuth(appConfig.authToken, logger)(req, res, next);
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
