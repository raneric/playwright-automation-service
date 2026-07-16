/**
 * Application-layer ports for browser session management.
 *
 * These ports are framework-agnostic — they use IAutomationContext
 * instead of Playwright's Page type. This keeps the core layer
 * decoupled from any specific browser automation framework.
 */

import { IAutomationContext } from './IAutomationContext';

// ── Browser Session ──────────────────────────────────────────────────────────

/**
 * Port for browser session lifecycle management.
 * The application layer depends on this interface; BrowserManager implements it.
 */
export interface IBrowserSession {
  /** Obtain a fresh, unauthenticated browser context + page. */
  createSession(): Promise<{ context: unknown; page: IAutomationContext }>;

  /**
   * Obtain an authenticated session for a specific platform.
   * The first call per platform performs login; subsequent calls reuse the cached context.
   *
   * @param platform - The platform name (e.g. "acme", "contoso")
   */
  createAuthenticatedSession(
    platform: string
  ): Promise<{ context: unknown; page: IAutomationContext }>;

  /** Release a session back to the pool (or close it if not reusable). */
  releaseSession(page: IAutomationContext): Promise<void>;

  /** Tear down the entire browser instance — called on graceful shutdown. */
  shutdown(): Promise<void>;
}
