import {
  chromium,
  Browser,
  BrowserContext,
  Page,
} from 'playwright';
import { Logger } from '../logger';
import { AppConfig } from '../config';
import { IBrowserSession } from '../../domain/ports';
import { PlaywrightLoginWorkflow } from './PlaywrightAutomation';

/**
 * Manages the Playwright browser lifecycle.
 *
 * Responsibilities:
 *  - Launch / shutdown the browser instance
 *  - Create isolated BrowserContexts (each = one "session")
 *  - Pool and reuse authenticated contexts
 *  - Enforce concurrency limits
 *
 * This is a singleton-scoped service in the DI container.
 */
export class BrowserManager implements IBrowserSession {
  private browser: Browser | null = null;
  private activeContexts = new Set<BrowserContext>();
  private authenticatedContext: BrowserContext | null = null;

  constructor(
    private readonly config: AppConfig,
    private readonly logger: Logger,
    private readonly loginWorkflow: PlaywrightLoginWorkflow,
  ) {}

  // ── IBrowserSession implementation ───────────────────────────

  /** Create a fresh, unauthenticated browser context + page */
  async createSession(): Promise<{ context: BrowserContext; page: Page }> {
    const browser = await this.getBrowser();
    const context = await browser.newContext({
      viewport: this.config.browser.viewport,
    });
    this.activeContexts.add(context);
    const page = await context.newPage();
    return { context, page };
  }

  /**
   * Create (or reuse) an already-authenticated session.
   * The first call performs login; subsequent calls reuse the same context
   * with a new page.
   */
  async createAuthenticatedSession(): Promise<{ context: BrowserContext; page: Page }> {
    if (this.authenticatedContext) {
      this.logger.debug('Reusing authenticated browser context');
      const page = await this.authenticatedContext.newPage();
      return { context: this.authenticatedContext, page };
    }

    const { context, page } = await this.createSession();

    // Perform login on the new session
    this.logger.info('Performing initial login for authenticated session');
    await this.loginWorkflow.login(page);

    this.authenticatedContext = context;
    return { context, page };
  }

  /** Mark an authenticated context so it can be reused */
  setAuthenticatedContext(context: BrowserContext): void {
    this.authenticatedContext = context;
  }

  /** Release a session (close the context if not the shared authenticated one) */
  async releaseSession(context: unknown): Promise<void> {
    const ctx = context as BrowserContext;
    if (ctx === this.authenticatedContext) {
      // Don't close the authenticated context — just close the page
      this.logger.debug('Releasing page from authenticated context');
      return;
    }
    this.activeContexts.delete(ctx);
    try {
      await ctx.close();
    } catch {
      // Context may already be closed
    }
  }

  /** Tear down the entire browser */
  async shutdown(): Promise<void> {
    this.logger.info('Shutting down browser');
    this.authenticatedContext = null;

    for (const ctx of this.activeContexts) {
      try {
        await ctx.close();
      } catch {
        // ignore
      }
    }
    this.activeContexts.clear();

    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  // ── Internal ─────────────────────────────────────────────────

  private async getBrowser(): Promise<Browser> {
    if (!this.browser || !this.browser.isConnected()) {
      this.logger.info(
        { headless: this.config.browser.headless },
        'Launching browser',
      );
      this.browser = await chromium.launch({
        headless: this.config.browser.headless,
        slowMo: this.config.browser.slowMo,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });

      // Handle unexpected browser disconnection
      this.browser.on('disconnected', () => {
        this.logger.warn('Browser disconnected unexpectedly');
        this.browser = null;
        this.authenticatedContext = null;
      });
    }
    return this.browser;
  }
}