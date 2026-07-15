import { Page } from 'playwright';
import { Result } from '../../shared/Result';
import { ProductResult } from '../domain/entities';

/**
 * Application-layer ports for automation.
 *
 * These live in the application layer (not the domain layer) because they
 * reference Playwright's `Page` type. The application layer is permitted to
 * reference infrastructure types through ports — this keeps the domain pure
 * while still allowing proper inversion of control.
 */

// ── Browser Session ──────────────────────────────────────────────────────────

/**
 * Port for browser session lifecycle management.
 * The application layer depends on this interface; BrowserManager implements it.
 */
export interface IBrowserSession {
  /** Obtain a fresh, unauthenticated browser context + page. */
  createSession(): Promise<{ context: unknown; page: Page }>;

  /**
   * Obtain an authenticated session.
   * The first call performs login; subsequent calls reuse the cached context.
   */
  createAuthenticatedSession(): Promise<{ context: unknown; page: Page }>;

  /** Release a session back to the pool (or close it if not reusable). */
  releaseSession(context: unknown, page?: unknown): Promise<void>;

  /** Tear down the entire browser instance — called on graceful shutdown. */
  shutdown(): Promise<void>;
}

// ── Automation Ports ─────────────────────────────────────────────────────────

export interface IClaimAutomationPort {
  createClaim(page: Page, claimData: Record<string, unknown>): Promise<Result<string>>;
}

export interface IOrderAutomationPort {
  createOrder(page: Page, orderData: Record<string, unknown>): Promise<Result<string>>;
}

export interface ISearchAutomationPort {
  searchProducts(
    page: Page,
    customer: string,
    productNames: string[],
  ): Promise<Result<ProductResult[]>>;
}
