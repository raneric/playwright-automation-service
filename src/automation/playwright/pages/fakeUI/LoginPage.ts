import { Page } from 'playwright';
import { BasePage } from './BasePage';
import { Logger } from '../../../../shared/logger';
import { LoginSelectors } from '../../selectors';

/**
 * Page Object for the Login page.
 * Encapsulates all interactions with the login form.
 */
export class LoginPage extends BasePage {
  constructor(page: Page, logger: Logger) {
    super(page, logger);
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

    await this.fillByTestId(LoginSelectors.username, username);
    await this.fillByTestId(LoginSelectors.password, password);
    await this.clickByTestId(LoginSelectors.submitBtn);

    const outcome = await Promise.race([
      // Credential error appears on the login page itself
      this.page
        .waitForSelector(`[data-testid="${LoginSelectors.error}"]`, {
          state: 'visible',
        })
        .then(() => 'error' as const),

      // Any navigation away from the login URL means the app accepted the credentials
      this.page
        .waitForURL((url) => url.href !== loginUrl)
        .then(() => 'success' as const),
    ]);

    if (outcome === 'error') {
      const errorMsg = await this.textByTestId(LoginSelectors.error);
      await this.screenshot('login-failure');
      throw new Error(`Login failed: ${errorMsg || 'Invalid credentials'}`);
    }

    this.logger.info('Login successful');
  }
}
