import { Page, Locator } from 'playwright';
import { DEFAULT_TIMEOUTS } from '../../../../shared/constants';
import { Logger } from '../../../../shared/logger';

/**
 * Base class for all Page Objects.
 * Provides common utilities: navigation, waiting, screenshots, and logging.
 *
 * Subclasses represent a single page (or modal) in the SaaS application.
 */
export abstract class BasePage {
  protected readonly logger: Logger;
  protected readonly page: Page;

  constructor(page: Page, logger: Logger) {
    this.page = page;
    this.logger = logger.child({ page: this.constructor.name });
  }

  /** Navigate to this page's URL */
  async navigate(url: string): Promise<void> {
    this.logger.info({ url }, 'Navigating');
    await this.page.goto(url, {
      timeout: DEFAULT_TIMEOUTS.navigation,
      waitUntil: 'domcontentloaded',
    });
  }

  /** Wait for a selector to be visible (asserts the page has loaded) */
  async waitForReady(selector: string): Promise<void> {
    await this.page.waitForSelector(selector, {
      timeout: DEFAULT_TIMEOUTS.selector,
      state: 'visible',
    });
  }

  /** Fill an input identified by data-testid */
  async fillByTestId(testId: string, value: string): Promise<void> {
    const selector = `[data-testid="${testId}"]`;
    await this.page.waitForSelector(selector, { state: 'visible' });
    await this.page.fill(selector, value);
  }

  /** Click an element identified by data-testid */
  async clickByTestId(testId: string): Promise<void> {
    const selector = `[data-testid="${testId}"]`;
    await this.page.waitForSelector(selector, { state: 'visible' });
    await this.page.click(selector);
  }

  /** Click an element identified by a CSS selector */
  async clickBySelector(selector: string): Promise<void> {
    const test = this.page.locator(selector);
    await test.click();
  }

  /** Click an element by class name */
  async clickByClass(className: string): Promise<void> {
    await this.page.locator(`.${className}`).click({ button: 'left' });
  }

  /** Get text content of an element by data-testid */
  async textByTestId(testId: string): Promise<string> {
    const selector = `[data-testid="${testId}"]`;
    await this.page.waitForSelector(selector, { state: 'attached' });
    return ((await this.page.textContent(selector)) ?? '').trim();
  }

  /** Check if an element exists (without waiting) */
  async hasElement(testId: string): Promise<boolean> {
    return (await this.page.$(`[data-testid="${testId}"]`)) !== null;
  }

  /** Take a screenshot for debugging */
  async screenshot(name: string): Promise<void> {
    const path = `/tmp/playwright-screenshots/${name}-${Date.now()}.png`;
    await this.page.screenshot({ path, fullPage: true });
    this.logger.debug({ path }, 'Screenshot saved');
  }

  /** Get the underlying Playwright Page (escape hatch) */
  getPage(): Page {
    return this.page;
  }
}
