import { Page } from 'playwright';
import { Logger } from '../../logger';
import { BasePage } from './BasePage';
import { LoginSelectors } from '../selectors/login';

/**
 * Page Object for the Login page.
 * Encapsulates all interactions with the login form.
 */
export class LoginPage extends BasePage {
  constructor(page: Page, logger: Logger) {
    super(page, logger);
  }

  /** Fill and submit the login form */
  async login(username: string, password: string): Promise<void> {
    this.logger.info('Filling login form');

    await this.fillByTestId(LoginSelectors.username, username);
    await this.fillByTestId(LoginSelectors.password, password);
    await this.clickByTestId(LoginSelectors.submitBtn);

    // Wait for either error or successful redirect
    try {
      await this.page.waitForSelector(
        `[data-testid="${LoginSelectors.error}"]`,
        { timeout: 5_000 },
      );
      const errorMsg = await this.textByTestId(LoginSelectors.error);
      throw new Error(`Login failed: ${errorMsg || 'Invalid credentials'}`);
    } catch (err) {
      if (err instanceof Error && err.message.startsWith('Login failed')) {
        throw err;
      }
      // Timeout means no error appeared → login succeeded
    }

    await this.page.waitForLoadState('networkidle');
    this.logger.info('Login successful');
  }
}