import { Page } from 'playwright';
import { IClaimAutomationPort } from '../../../../core/ports';
import { Logger } from '../../../../shared/logger';
import { PlatformConfig } from '../../../config';
import { Result } from '../../../../shared/Result';
import { FormPage } from '../../pages';
import { customerClaimConfig } from '../../../config/form';
import { gotoWithRetry, retry } from '../../utils';
import { PagePath } from '../../../../shared/constants';
import { TicketCreationOutput } from '../../../../shared/types/FakeUISaas';

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

      const ticketCreationResult = submitResult.value;

      if (ticketCreationResult.ticketCreated) {
        this.logger.info(
          `Claim form submitted successfully with ticket ID: ${ticketCreationResult.ticketId}`
        );
      } else {
        this.logger.error(
          `Claim form submission failed with error: ${ticketCreationResult.error}`
        );
        throw new Error(
          `Claim form submission failed with error: ${ticketCreationResult.error}`
        );
      }

      // Return the API response data (contains the persisted row with its ID)
      // Fall back to the original claimData if the response body wasn't parseable
      return Result.ok(ticketCreationResult);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return Result.fail(new Error(message));
    }
  }
}
