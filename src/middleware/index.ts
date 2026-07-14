import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { Logger } from '../infrastructure/logger';
import { AppError } from '../shared/errors';

// ── Error Handler ─────────────────────────────────────────────────────────────

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

// ── Request Logger ────────────────────────────────────────────────────────────

export function requestLogger(logger: Logger) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    logger.info({ method: req.method, url: req.url }, 'Incoming request');
    next();
  };
}

// ── API Key Auth ──────────────────────────────────────────────────────────────

/**
 * API key authentication middleware.
 * Checks the `x-api-key` header against the configured secret.
 *
 * When no API_KEY env var is set this middleware is skipped entirely,
 * making auth opt-in for local development while enforced in production.
 */
export function apiKeyAuth(validKey: string | undefined, logger: Logger) {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Auth disabled — no key configured (e.g. local dev)
    if (!validKey) {
      next();
      return;
    }

    const key = req.headers['x-api-key'];
    if (!key || key !== validKey) {
      logger.warn({ url: req.url }, 'Unauthorized request — invalid or missing API key');
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Invalid or missing API key' },
      });
      return;
    }
    next();
  };
}

// ── Rate Limiter ──────────────────────────────────────────────────────────────

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
    standardHeaders: true,  // Return rate limit info in RateLimit-* headers
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

// ── Request Timeout ───────────────────────────────────────────────────────────

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
