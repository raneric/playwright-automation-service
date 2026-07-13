import { Page } from 'playwright';
import { Result } from '../../shared/Result';

/**
 * Port (interface) for browser session management.
 * The application layer depends on this abstraction, not on Playwright directly.
 */
export interface IBrowserSession {
  /** Obtain a fresh browser context + page, optionally authenticated */
  createSession(): Promise<{ context: unknown; page: Page }>;

  /** Obtain an already-authenticated session (may reuse a cached context) */
  createAuthenticatedSession(): Promise<{ context: unknown; page: Page }>;

  /** Release a session back to the pool */
  releaseSession(context: unknown): Promise<void>;

  /** Tear down the entire browser instance */
  shutdown(): Promise<void>;
}

/**
 * Port for login automation.
 */
export interface ILoginAutomation {
  login(page: Page): Promise<Result<void>>;
}

/**
 * Port for generic form-filling automation.
 */
export interface IFormAutomation {
  fillForm(page: Page, data: Record<string, unknown>): Promise<Result<void>>;
  fillItems(page: Page, items: Record<string, unknown>[]): Promise<Result<void>>;
  submit(page: Page): Promise<Result<string>>;
}

/**
 * Port for search automation on the order list page.
 */
export interface ISearchAutomation {
  search(
    page: Page,
    customer: string,
    productNames: string[],
  ): Promise<Result<Array<{
    itemCode: string;
    productName: string;
    vendor: string;
    customerName: string;
    orderCode: string;
    existsInSystem: boolean;
  }>>>;
}