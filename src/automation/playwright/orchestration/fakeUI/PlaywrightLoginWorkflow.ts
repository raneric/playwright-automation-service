import { IAutomationContext, ILoginWorkflow } from '../../../../core/ports';
import { Logger } from '../../../../shared/logger';
import { PlatformConfig } from '../../../config';
import { LoginPage } from '../../pages';
import { PlaywrightAutomationContext } from '../../PlaywrightAutomationContext';
import { gotoWithRetry } from '../../utils';

/**
 * Login workflow using the LoginPage POM.
 * Implements ILoginWorkflow so BrowserManager depends on the port, not this class.
 */
export class PlaywrightLoginWorkflow implements ILoginWorkflow {
  constructor(
    private readonly platform: PlatformConfig,
    private readonly logger: Logger
  ) {}

  async login(ctx: IAutomationContext): Promise<void> {
    const page = (ctx as PlaywrightAutomationContext).getPage();
    const loginPage = new LoginPage(
      page,
      this.logger,
      this.platform.loginSelectors
    );

    await gotoWithRetry(page, this.platform.loginUrl, this.logger);

    await loginPage.login(this.platform.username, this.platform.password);
  }
}
