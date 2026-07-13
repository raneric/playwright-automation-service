import { Page } from 'playwright';
import { Logger } from '../../logger';
import { RETRY_POLICY, DEFAULT_TIMEOUTS } from '../../../shared/constants';

/**
 * Navigate to a URL with exponential backoff retry.
 * Throws NavigationError after exhausting all retries.
 */
export async function gotoWithRetry(
  page: Page,
  url: string,
  logger: Logger,
  maxRetries: number = RETRY_POLICY.maxNavigationRetries,
): Promise<void> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      logger.info({ url, attempt, maxRetries }, 'Navigating');
      await page.goto(url, {
        timeout: DEFAULT_TIMEOUTS.navigation,
        waitUntil: 'domcontentloaded',
      });
      return;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.warn({ attempt, error: message }, 'Navigation attempt failed');

      if (attempt === maxRetries) {
        throw new Error(
          `Failed to reach ${url} after ${maxRetries} attempts: ${message}`,
        );
      }

      // Exponential backoff: 1s, 2s, 4s, ...
      const delay = RETRY_POLICY.retryBaseDelayMs * Math.pow(2, attempt - 1);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}

/**
 * Retry an async operation with exponential backoff.
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    baseDelayMs?: number;
    logger?: Logger;
    label?: string;
  } = {},
): Promise<T> {
  const {
    maxRetries = 3,
    baseDelayMs = 1_000,
    logger,
    label = 'operation',
  } = options;

  let lastError: unknown;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      logger?.warn({ attempt, maxRetries, label, error: err }, 'Retry attempt failed');

      if (attempt < maxRetries) {
        const delay = baseDelayMs * Math.pow(2, attempt - 1);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}