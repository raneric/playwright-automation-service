import { Page, Locator } from 'playwright';
import {
  IAutomationContext,
  IAutomationElement,
} from '../../core/ports/IAutomationContext';
import { Logger } from '../../shared/logger';
import { DEFAULT_TIMEOUTS } from '../../shared/constants';

/**
 * Playwright implementation of the framework-agnostic IAutomationContext.
 *
 * This is the Adapter that decouples the core layer from Playwright.
 * All Playwright-specific code is confined to this class and the
 * infrastructure layer.
 */
export class PlaywrightAutomationContext implements IAutomationContext {
  private readonly logger: Logger;

  constructor(private readonly page: Page, logger: Logger) {
    this.logger = logger.child({ adapter: 'PlaywrightAutomationContext' });
  }

  async navigate(url: string): Promise<void> {
    this.logger.info({ url }, 'Navigating');
    await this.page.goto(url, {
      timeout: DEFAULT_TIMEOUTS.navigation,
      waitUntil: 'domcontentloaded',
    });
  }

  async fill(selector: string, value: string): Promise<void> {
    await this.page.waitForSelector(selector, { state: 'visible' });
    await this.page.fill(selector, value);
  }

  async click(selector: string): Promise<void> {
    await this.page.waitForSelector(selector, { state: 'visible' });
    await this.page.click(selector);
  }

  async textContent(selector: string): Promise<string> {
    await this.page.waitForSelector(selector, { state: 'attached' });
    return ((await this.page.textContent(selector)) ?? '').trim();
  }

  async getAttribute(selector: string, name: string): Promise<string | null> {
    return this.page.getAttribute(selector, name);
  }

  async waitForSelector(
    selector: string,
    state: 'attached' | 'detached' | 'visible' | 'hidden'
  ): Promise<void> {
    await this.page.waitForSelector(selector, {
      state,
      timeout: DEFAULT_TIMEOUTS.selector,
    });
  }

  async hasElement(selector: string): Promise<boolean> {
    return (await this.page.$(selector)) !== null;
  }

  async queryAll(selector: string): Promise<IAutomationElement[]> {
    const locators = this.page.locator(selector);
    const count = await locators.count();
    const elements: IAutomationElement[] = [];
    for (let i = 0; i < count; i++) {
      elements.push(new PlaywrightAutomationElement(locators.nth(i)));
    }
    return elements;
  }

  async waitForResponse(
    predicate: (response: {
      url(): string;
      status(): number;
      request(): { method(): string };
    }) => boolean,
    timeout?: number
  ): Promise<{ status(): number } | null> {
    return this.page
      .waitForResponse((resp) => predicate(resp), {
        timeout: timeout ?? DEFAULT_TIMEOUTS.selector,
      })
      .catch(() => null);
  }

  async waitForUrlChange(fromUrl: string): Promise<void> {
    await this.page.waitForURL((url) => url.href !== fromUrl);
  }

  async screenshot(name: string): Promise<void> {
    const path = `/tmp/playwright-screenshots/${name}-${Date.now()}.png`;
    await this.page.screenshot({ path, fullPage: true });
    this.logger.debug({ path }, 'Screenshot saved');
  }

  url(): string {
    return this.page.url();
  }

  /** Escape hatch: access the underlying Playwright Page when needed */
  getPage(): Page {
    return this.page;
  }
}

/**
 * Playwright implementation of IAutomationElement.
 */
class PlaywrightAutomationElement implements IAutomationElement {
  constructor(private readonly locator: Locator) {}

  async getAttribute(name: string): Promise<string | null> {
    return this.locator.getAttribute(name);
  }
}
