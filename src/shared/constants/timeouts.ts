export const DEFAULT_TIMEOUTS = {
  /** Maximum wait for page navigations (ms) */
  navigation: 15_000,
  /** How long to wait for a selector to appear before failing (ms) */
  selector: 10_000,
  /** Small pause for UI animations / re-renders (ms) — prefer waitForSelector over this */
  animation: 300,
  /** How long a complete workflow may take before the request times out (ms) */
  workflow: 60_000,
  /** How long a browser can sit idle before being evicted from the pool (ms) */
  browserIdle: 300_000,
} as const;

export const RETRY_POLICY = {
  /** Max retries for navigation attempts */
  maxNavigationRetries: 3,
  /** Base delay between retries (ms) — uses exponential backoff */
  retryBaseDelayMs: 1_000,
  /** Max cumulative delay for all retries (ms) */
  maxRetryDelayMs: 30_000,
} as const;
