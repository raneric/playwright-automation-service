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
import { errorHandler, requestLogger, requestTimeout } from '../middleware';
import { DEFAULT_TIMEOUTS } from '../shared/constants';

/**
 * Create and configure the Express application.
 * All dependencies are resolved from the DI container.
 */
export function createApp(container: AwilixContainer): Express {
  const app = express();
  const logger = container.resolve<Logger>('logger');
  const config = container.resolve<AppConfig>('config');

  // ── Global middleware ────────────────────────────────────────
  app.use(express.json({ limit: '1mb' }));
  app.use(requestLogger(logger));
  app.use(requestTimeout(DEFAULT_TIMEOUTS.workflow));

  // ── Health check (no auth) ───────────────────────────────────
  app.use('/health', createHealthRoutes());

  // ── API routes ───────────────────────────────────────────────
  app.use(
    '/api/claim',
    createClaimRoutes(container.resolve('claimController')),
  );
  app.use(
    '/api/order',
    createOrderRoutes(container.resolve('orderController')),
  );
  app.use(
    '/api/search',
    createSearchRoutes(container.resolve('searchController')),
  );

  // ── Error handler (must be last) ─────────────────────────────
  app.use(errorHandler(logger));

  return app;
}