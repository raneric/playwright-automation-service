import { Page } from 'playwright';
import { IClaimAutomationPort } from '../../../../core/ports';
import { Logger } from '../../../../shared/logger';
import { PlatformConfig } from '../../../config';
import { Result } from '../../../../shared/Result';
import { FormPage } from '../../pages';
import { customerClaimConfig } from '../../../config/form';
import { gotoWithRetry, retry } from '../../utils';
import { PagePath } from '../../../../shared/constants';

/**
 * Playwright adapter implementing the Claim automation port.
 */
export class PlaywrightClaimAutomation implements IClaimAutomationPort {
  constructor(
    private readonly platform: PlatformConfig,
    private readonly logger: Logger
  ) {}

  async createClaim(
    page: Page,
    claimData: Record<string, unknown>
  ): Promise<Result<Record<string, unknown>>> {
    try {
      const formPage = new FormPage(page, this.logger, customerClaimConfig);

      await gotoWithRetry(
        page,
        `${this.platform.baseUrl}${PagePath.customerClaim}`,
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
