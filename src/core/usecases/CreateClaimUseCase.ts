import { ClaimInputDTO } from '../dto';
import { IClaimAutomationPort, IBrowserSession } from '../ports';
import { Result } from '../../shared/Result';
import { Logger } from '../../shared/logger';
import { AutomationError } from '../../shared/errors';

/**
 * Use case: Create a customer claim in the SaaS application.
 *
 * Orchestrates:
 *  1. Transform the API DTO into the domain entity
 *  2. Acquire an authenticated browser session for the target platform
 *  3. Delegate form filling to the automation port (resolved per-platform)
 *  4. Return the claim ID
 */
export class CreateClaimUseCase {
  constructor(
    private readonly browserSession: IBrowserSession,
    private readonly getClaimAutomation: (
      platform: string
    ) => IClaimAutomationPort,
    private readonly logger: Logger
  ) {}

  async execute(
    platform: string,
    input: ClaimInputDTO
  ): Promise<Record<string, unknown>> {
    this.logger.info(
      { platform, orderCode: input.customer },
      'CreateClaimUseCase: starting'
    );

    // 1. Transform DTO → domain entity → form data
    const formData = this.toFormData(input);

    // 2. Acquire authenticated session for the target platform
    const { page } =
      await this.browserSession.createAuthenticatedSession(platform);

    try {
      // 3. Execute automation (resolved per-platform)
      const automation = this.getClaimAutomation(platform);
      const result = await automation.createClaim(page, formData);

      if (!result.success) {
        this.logger.error(
          { platform, error: result.error },
          'Claim automation failed'
        );
        return Result.fail(new AutomationError(result.error.message));
      }

      this.logger.info(
        { platform, claimId: result.value },
        'CreateClaimUseCase: completed'
      );
      return result;
    } finally {
      await this.browserSession.releaseSession(page.context(), page);
    }
  }

  /**
   * Transform the API DTO into the flat Record used by the form filler.
   * This is the mapping layer between the external API contract and the
   * internal form representation.
   */
  private toFormData(input: ClaimInputDTO): Record<string, unknown> {
    const firstVendor = input.products[0]?.vendor;

    return {
      request: {
        date_of_request: input.requestInfo.dateOfRequest,
        requestor: input.requestInfo.requestor,
      },
      vendor: {
        id: firstVendor?.id ?? 0,
        name: firstVendor?.name ?? '',
        email: '',
        phone: '',
        street: '',
        city: '',
        state: '',
        zip: '',
      },
      customer: {
        id: 0,
        name: input.customer.name,
        organization: input.customer.organization,
        department: input.customer.department,
        email: input.customer.email,
        phone: input.customer.phone,
        street: input.customer.address?.street,
        city: input.customer.address?.city,
        state: input.customer.address?.state,
        zip: input.customer.address?.postalCode,
      },
      issues: input.issues,
      items: input.products.map((pl) => ({
        item_code: pl.itemCode,
        quantity: pl.quantityOrdered,
        product_name: pl.productName,
        order_code: pl.orderCode,
        lot_number: pl.lotNumber,
        vendor_name: pl.vendor.name,
        order_date: pl.orderDate,
      })),
    };
  }
}
