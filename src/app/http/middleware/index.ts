import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { Logger } from '../../../shared/logger';
import { AppError } from '../../../shared/errors';

/**
 * Global error-handling middleware.
 * Catches all errors thrown in route handlers and formats a consistent JSON response.
 */
export function errorHandler(logger: Logger) {
  return (
    err: Error,
    _req: Request,
    res: Response,
    _next: NextFunction
  ): void => {
    if (err instanceof AppError) {
      logger.warn(
        { code: err.code, statusCode: err.statusCode, message: err.message },
        'Operational error'
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

export function requestLogger(logger: Logger) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    logger.info({ method: req.method, url: req.url }, 'Incoming request');
    next();
  };
}

/**
 * Bearer token authentication middleware.
 * Checks the `Authorization: Bearer <token>` header against the configured secret.
 *
 * When no AUTH_TOKEN env var is set this middleware is skipped entirely,
 * making auth opt-in for local development while enforced in production.
 */
export function bearerTokenAuth(
  validToken: string | undefined,
  logger: Logger
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!validToken) {
      throw new AppError(
        'Bearer token authentication is not configured. Set the AUTH_TOKEN env var to enable it.',
        'AUTHENTICATION_ERROR',
        500,
        true
      );
    }

    const header = req.headers.authorization;
    const token = header?.startsWith('Bearer ')
      ? header.slice('Bearer '.length).trim()
      : undefined;

    if (!token || token !== validToken) {
      logger.warn(
        { url: req.url },
        'Unauthorized request — invalid or missing bearer token'
      );
      res.status(401).json({
        success: false,
        error: {
          code: 'AUTHENTICATION_ERROR',
          message: 'Invalid or missing bearer token',
        },
      });
      return;
    }
    next();
  };
}

/**
 * Per-IP rate limiter for automation endpoints.
 *
 * Defaults: 20 requests per minute. Configured via env vars:
 *   RATE_LIMIT_WINDOW_MS  (default: 60000)
 *   RATE_LIMIT_MAX        (default: 20)
 */
export function createRateLimiter() {
  const windowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS ?? '60000', 10);
  const max = parseInt(process.env.RATE_LIMIT_MAX ?? '20', 10);

  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      error: {
        code: 'RATE_LIMIT',
        message: 'Too many requests — please slow down',
      },
    },
  });
}

/**
 * Aborts requests that take longer than `ms` milliseconds.
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
