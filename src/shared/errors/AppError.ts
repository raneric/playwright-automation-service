/**
 * Base application error with an optional HTTP status code.
 * All custom exceptions should extend this class.
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    code: string = 'INTERNAL_ERROR',
    statusCode: number = 500,
    isOperational: boolean = true,
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }
}

/** 400 — The request was malformed or failed validation */
export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'VALIDATION_ERROR', 400);
    if (details) {
      (this as Record<string, unknown>).details = details;
    }
  }
}

/** 401 — Authentication is missing or invalid */
export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(message, 'AUTHENTICATION_ERROR', 401);
  }
}

/** 404 — The requested resource was not found */
export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found') {
    super(message, 'NOT_FOUND', 404);
  }
}

/** 408 — A timeout occurred during a Playwright operation */
export class TimeoutError extends AppError {
  constructor(message: string = 'Operation timed out') {
    super(message, 'TIMEOUT', 408);
  }
}

/** 409 — Conflict in the automation workflow (e.g. session conflict) */
export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 'CONFLICT', 409);
  }
}

/** 422 — The SaaS application rejected the operation (form validation, etc.) */
export class AutomationError extends AppError {
  constructor(message: string) {
    super(message, 'AUTOMATION_ERROR', 422);
  }
}

/** 429 — Rate limit exceeded on the target SaaS */
export class RateLimitError extends AppError {
  constructor(message: string = 'Rate limit exceeded') {
    super(message, 'RATE_LIMIT', 429);
  }
}

/** 502 — The target SaaS is unreachable */
export class UpstreamError extends AppError {
  constructor(message: string) {
    super(message, 'UPSTREAM_ERROR', 502);
  }
}

/** 504 — A navigation or page-load timeout occurred */
export class NavigationError extends AppError {
  constructor(url: string, message: string) {
    super(`Failed to navigate to ${url}: ${message}`, 'NAVIGATION_ERROR', 504);
  }
}
