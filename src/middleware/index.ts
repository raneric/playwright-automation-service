import { Request, Response, NextFunction } from 'express';
import { Logger } from '../infrastructure/logger';
import { AppError } from '../shared/errors';

/**
 * Global error-handling middleware.
 * Catches all errors thrown in route handlers and formats a consistent JSON response.
 */
export function errorHandler(logger: Logger) {
  return (err: Error, _req: Request, res: Response, _next: NextFunction): void => {
    if (err instanceof AppError) {
      logger.warn(
        { code: err.code, statusCode: err.statusCode, message: err.message },
        'Operational error',
      );
      res.status(err.statusCode).json({
        success: false,
        error: {
          code: err.code,
          message: err.message,
        },
      });
      return;
    }

    // Unexpected / programmer errors
    logger.error({ err }, 'Unexpected error');
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message:
          process.env.NODE_ENV === 'production'
            ? 'An unexpected error occurred'
            : err.message,
      },
    });
  };
}

/**
 * Request logging middleware.
 */
export function requestLogger(logger: Logger) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    logger.info({ method: req.method, url: req.url }, 'Incoming request');
    next();
  };
}

/**
 * Simple API key authentication middleware.
 * Checks for an `x-api-key` header against the configured secret.
 */
export function apiKeyAuth(validKey: string, logger: Logger) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const key = req.headers['x-api-key'];
    if (!key || key !== validKey) {
      logger.warn('Unauthorized request');
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Invalid or missing API key' },
      });
      return;
    }
    next();
  };
}

/**
 * Timeout middleware — aborts requests that take too long.
 */
export function requestTimeout(ms: number) {
  return (_req: Request, res: Response, next: NextFunction): void => {
    const timer = setTimeout(() => {
      if (!res.headersSent) {
        res.status(408).json({
          success: false,
          error: { code: 'TIMEOUT', message: 'Request timed out' },
        });
      }
    }, ms);

    res.on('finish', () => clearTimeout(timer));
    next();
  };
}