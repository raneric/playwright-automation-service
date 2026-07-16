import { Page } from 'playwright';
import { Logger } from '../../../../shared/logger';
import { PlatformConfig } from '../../../config';
import { LoginPage } from '../../pages';
import { gotoWithRetry } from '../../utils';

/**
 * Login workflow using the LoginPage POM.
 * Called by the BrowserManager or a dedicated login use case.
 */
export class PlaywrightLoginWorkflow {
  constructor(
    private readonly platform: PlatformConfig,
    private readonly logger: Logger
  ) {}

  async login(page: Page): Promise<void> {
    const loginPage = new LoginPage(page, this.logger);

    await gotoWithRetry(page, this.platform.loginUrl, this.logger);

    await loginPage.login(this.platform.username, this.platform.password);
  }
}
