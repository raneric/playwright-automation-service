/**
 * Application-layer ports for automation.
 *
 * These live in the application layer (not the domain layer) because they
 * reference Playwright's `Page` type. The application layer is permitted to
 * reference infrastructure types through ports — this keeps the domain pure
 * while still allowing proper inversion of control.
 */

import { Page } from 'playwright';

// ── Browser Session ──────────────────────────────────────────────────────────

/**
 * Port for browser session lifecycle management.
 * The application layer depends on this interface; BrowserManager implements it.
 */
export interface IBrowserSession {
  /** Obtain a fresh, unauthenticated browser context + page. */
  createSession(): Promise<{ context: unknown; page: Page }>;

  /**
   * Obtain an authenticated session for a specific platform.
   * The first call per platform performs login; subsequent calls reuse the cached context.
   *
   * @param platform - The platform name (e.g. "acme", "contoso")
   */
  createAuthenticatedSession(
    platform: string
  ): Promise<{ context: unknown; page: Page }>;

  /** Release a session back to the pool (or close it if not reusable). */
  releaseSession(context: unknown, page?: unknown): Promise<void>;

  /** Tear down the entire browser instance — called on graceful shutdown. */
  shutdown(): Promise<void>;
}
