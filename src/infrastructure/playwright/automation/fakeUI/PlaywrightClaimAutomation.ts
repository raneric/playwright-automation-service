import {
  IAutomationContext,
  IClaimAutomationPort,
} from '../../../../core/ports';
import { Logger } from '../../../../shared/logger';
import { PlatformConfig } from '../../../config';
import { FormConfig } from '../../../config/form/types';
import { Result } from '../../../../shared/Result';
import { FormPage } from '../../pages';
import { PlaywrightAutomationContext } from '../../PlaywrightAutomationContext';
import { gotoWithRetry, retry } from '../../utils';

/**
 * Playwright adapter implementing the Claim automation port.
 *
 * Receives IAutomationContext (framework-agnostic) and extracts the
 * underlying Playwright Page for use with Playwright-specific page objects.
 *
 * The FormConfig is injected — different platforms can use different form
 * structures without requiring code changes.
 */
export class PlaywrightClaimAutomation implements IClaimAutomationPort {
  constructor(
    private readonly platform: PlatformConfig,
    private readonly formConfig: FormConfig,
    private readonly logger: Logger
  ) {}

  async createClaim(
    ctx: IAutomationContext,
    claimData: Record<string, unknown>
  ): Promise<Result<Record<string, unknown>>> {
    try {
      const page = (ctx as PlaywrightAutomationContext).getPage();
      const formPage = new FormPage(page, this.logger, this.formConfig);

      await gotoWithRetry(
        page,
        `${this.platform.baseUrl}${this.platform.pages.customerClaim}`,
        this.logger
      );
      await formPage.waitForForm();

      this.logger.info('Filling customer claim form');
      await formPage.fillFields(claimData);

      if (claimData.items && Array.isArray(claimData.items)) {
        await formPage.fillItems(claimData.items as Record<string, unknown>[]);
      }

      const submitResult = await retry(() => formPage.submit(), {
        logger: this.logger,
        label: 'claim-form-submit',
      });

      if (!submitResult.success) {
        return Result.fail(submitResult.error);
      }

      this.logger.info(submitResult.value);

      return Result.ok(claimData);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return Result.fail(new Error(message));
    }
  }
}
