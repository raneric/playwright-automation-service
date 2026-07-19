import { Page } from 'playwright';
import { BasePage } from './BasePage';
import { Logger } from '../../../../shared/logger';

/**
 * Per-platform login selectors (data-testid values without the attribute wrapper).
 */
export interface LoginSelectorConfig {
  username: string;
  password: string;
  submitBtn: string;
  error: string;
}

/**
 * Page Object for the Login page.
 * Encapsulates all interactions with the login form.
 *
 * Selectors are injected via constructor — no hardcoded selectors.
 * This allows different SaaS platforms to use different data-testid values.
 */
export class LoginPage extends BasePage {
  private readonly selectors: LoginSelectorConfig;

  constructor(page: Page, logger: Logger, selectors: LoginSelectorConfig) {
    super(page, logger);
    this.selectors = selectors;
  }

  /**
   * Fill and submit the login form, then verify successful navigation.
   *
   * Success is detected by watching for a URL change away from the login page —
   * no coupling to any specific post-login DOM element in the target SaaS app.
   *
   * Uses Promise.race between:
   *  - The error element becoming visible  → credentials were rejected
   *  - The page navigating to a new URL    → login succeeded
   *
   * A screenshot is saved on failure for CI debugging.
   */
  async login(username: string, password: string): Promise<void> {
    this.logger.info('Filling login form');

    const loginUrl = this.page.url();

    await this.fillByTestId(this.selectors.username, username);
    await this.fillByTestId(this.selectors.password, password);
    await this.clickByTestId(this.selectors.submitBtn);

    const outcome = await Promise.race([
      // Credential error appears on the login page itself
      this.page
        .waitForSelector(`[data-testid="${this.selectors.error}"]`, {
          state: 'visible',
        })
        .then(() => 'error' as const),

      // Any navigation away from the login URL means the app accepted the credentials
      this.page
        .waitForURL((url) => url.href !== loginUrl)
        .then(() => 'success' as const),
    ]);

    if (outcome === 'error') {
      const errorMsg = await this.textByTestId(this.selectors.error);
      await this.screenshot('login-failure');
      throw new Error(`Login failed: ${errorMsg || 'Invalid credentials'}`);
    }

    this.logger.info('Login successful');
  }
}
