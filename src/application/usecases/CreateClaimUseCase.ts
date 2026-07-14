import { ClaimInputDTO } from '../dto';
import { IClaimAutomationPort, IBrowserSession } from '../ports';
import { Result } from '../../shared/Result';
import { Logger } from '../../infrastructure/logger';
import { AutomationError } from '../../shared/errors';

/**
 * Use case: Create a customer claim in the SaaS application.
 *
 * Orchestrates:
 *  1. Transform the API DTO into the domain entity
 *  2. Acquire an authenticated browser session
 *  3. Delegate form filling to the automation port
 *  4. Return the claim ID
 */
export class CreateClaimUseCase {
  constructor(
    private readonly browserSession: IBrowserSession,
    private readonly claimAutomation: IClaimAutomationPort,
    private readonly logger: Logger,
  ) {}

  async execute(input: ClaimInputDTO): Promise<Result<{ claimId: string }>> {
    this.logger.info({ orderCode: input.orderCode }, 'CreateClaimUseCase: starting');

    // 1. Transform DTO → domain entity → form data
    const formData = this.toFormData(input);

    // 2. Acquire authenticated session
    const { page } = await this.browserSession.createAuthenticatedSession();

    try {
      // 3. Execute automation
      const result = await this.claimAutomation.createClaim(page, formData);

      if (!result.success) {
        this.logger.error({ error: result.error }, 'Claim automation failed');
        return Result.fail(new AutomationError(result.error.message));
      }

      this.logger.info({ claimId: result.value }, 'CreateClaimUseCase: completed');
      return Result.ok({ claimId: result.value });
    } finally {
      await this.browserSession.releaseSession(page.context());
    }
  }

  /**
   * Transform the API DTO into the flat Record used by the form filler.
   * This is the mapping layer between the external API contract and the
   * internal form representation.
   */
  private toFormData(input: ClaimInputDTO): Record<string, unknown> {
    const firstVendor = input.productLines[0]?.vendor;

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
        street: input.customer.address.street,
        city: input.customer.address.city,
        state: input.customer.address.state,
        zip: input.customer.address.postalCode,
      },
      issues: input.issues,
      items: input.productLines.map((pl) => ({
        item_code: pl.itemCode,
        quantity: pl.quantityOrdered,
        product_name: pl.productName,
        order_code: input.orderCode,
        lot_number: pl.lotNumber,
        vendor_name: pl.vendor.name,
        order_date: input.orderDate,
      })),
    };
  }
}
