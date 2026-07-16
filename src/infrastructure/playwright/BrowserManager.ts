import { chromium, Browser, BrowserContext, Page } from 'playwright';
import { Logger } from '../../shared/logger';
import { AppConfig } from '../config';
import { IBrowserSession } from '../../core/ports';
import { PlaywrightLoginWorkflow } from './automation';

/**
 * Simple counting semaphore for capping concurrent browser context creation.
 */
class Semaphore {
  private queue: Array<() => void> = [];
  private running = 0;

  constructor(private readonly max: number) {}

  async acquire(): Promise<void> {
    if (this.running < this.max) {
      this.running++;
      return;
    }
    await new Promise<void>((resolve) => this.queue.push(resolve));
    this.running++;
  }

  release(): void {
    this.running = Math.max(0, this.running - 1);
    const next = this.queue.shift();
    if (next) next();
  }
}

/**
 * Manages the Playwright browser lifecycle.
 *
 * Responsibilities:
 *  - Launch / shutdown the browser instance
 *  - Create isolated BrowserContexts (each = one "session")
 *  - Maintain one authenticated context per platform (multi-tenant)
 *  - Enforce the maxConcurrentContexts limit via a semaphore
 *
 * This is a singleton-scoped service in the DI container.
 */
export class BrowserManager implements IBrowserSession {
  private browser: Browser | null = null;
  private activeContexts = new Set<BrowserContext>();
  /** One authenticated context per platform name */
  private authenticatedContexts = new Map<string, BrowserContext>();
  private readonly semaphore: Semaphore;

  constructor(
    private readonly config: AppConfig,
    private readonly logger: Logger,
    /** Factory: given a platform name, returns a login workflow for that platform */
    private readonly getLoginWorkflow: (
      platform: string
    ) => PlaywrightLoginWorkflow
  ) {
    this.semaphore = new Semaphore(config.browser.maxConcurrentContexts);
  }

  // ── IBrowserSession implementation ────────────────────────────────────────

  /**
   * Create a fresh, unauthenticated browser context + page.
   * Blocks if the concurrency limit has been reached.
   */
  async createSession(): Promise<{ context: BrowserContext; page: Page }> {
    await this.semaphore.acquire();

    try {
      const browser = await this.getBrowser();
      const context = await browser.newContext({
        viewport: this.config.browser.viewport,
      });
      this.activeContexts.add(context);
      const page = await context.newPage();
      return { context, page };
    } catch (err) {
      // If context creation itself fails, release the semaphore slot immediately
      this.semaphore.release();
      throw err;
    }
  }

  /**
   * Create (or reuse) an already-authenticated session for a specific platform.
   * The first call per platform performs login; subsequent calls open a new page
   * inside the existing context — no re-login needed.
   *
   * @param platform - The platform name (e.g. "acme", "contoso")
   */
  async createAuthenticatedSession(platform: string): Promise<{
    context: BrowserContext;
    page: Page;
  }> {
    const existing = this.authenticatedContexts.get(platform);
    if (existing) {
      this.logger.debug({ platform }, 'Reusing authenticated browser context');
      const page = await existing.newPage();
      return { context: existing, page };
    }

    const { context, page } = await this.createSession();

    this.logger.info(
      { platform },
      'Performing initial login for authenticated session'
    );
    const loginWorkflow = this.getLoginWorkflow(platform);
    await loginWorkflow.login(page);

    this.authenticatedContexts.set(platform, context);
    return { context, page };
  }

  /**
   * Release a session.
   * - Authenticated context: closes the page; the context is kept alive for reuse.
   * - Any other context: fully closed and removed from the active set.
   */
  async releaseSession(context: unknown, page?: unknown): Promise<void> {
    const ctx = context as BrowserContext;

    // Always close the page first to free memory
    if (page) {
      try {
        await (page as Page).close();
      } catch {
        // Page may have already been closed
      }
    }

    // Check if this is any platform's authenticated context
    for (const [platform, authCtx] of this.authenticatedContexts) {
      if (ctx === authCtx) {
        this.logger.debug(
          { platform },
          'Released page from authenticated context (context retained)'
        );
        return;
      }
    }

    this.activeContexts.delete(ctx);
    this.semaphore.release();

    try {
      await ctx.close();
    } catch {
      // Context may have already been closed by a crash
    }
  }

  /** Tear down the entire browser — called on graceful shutdown. */
  async shutdown(): Promise<void> {
    this.logger.info('Shutting down browser');
    this.authenticatedContexts.clear();

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

  // ── Internal ──────────────────────────────────────────────────────────────

  private async getBrowser(): Promise<Browser> {
    if (!this.browser || !this.browser.isConnected()) {
      this.logger.info(
        { headless: this.config.browser.headless },
        'Launching browser'
      );

      this.browser = await chromium.launch({
        headless: this.config.browser.headless,
        slowMo: this.config.browser.slowMo,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });

      this.browser.on('disconnected', () => {
        this.logger.warn(
          'Browser disconnected unexpectedly — clearing cached sessions'
        );
        this.browser = null;
        this.authenticatedContexts.clear();
      });
    }
    return this.browser;
  }
}
