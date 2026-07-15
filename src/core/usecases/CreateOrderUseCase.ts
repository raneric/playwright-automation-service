import { OrderInputDTO } from '../dto';
import { IOrderAutomationPort, IBrowserSession } from '../ports';
import { Result } from '../../shared/Result';
import { Logger } from '../../shared/logger';
import { AutomationError } from '../../shared/errors';

/**
 * Use case: Create a purchase order in the SaaS application.
 */
export class CreateOrderUseCase {
  constructor(
    private readonly browserSession: IBrowserSession,
    private readonly orderAutomation: IOrderAutomationPort,
    private readonly logger: Logger,
  ) {}

  async execute(input: OrderInputDTO): Promise<Result<{ orderId: string }>> {
    this.logger.info({ orderCode: input.order_code }, 'CreateOrderUseCase: starting');

    const { page } = await this.browserSession.createAuthenticatedSession();

    try {
      const result = await this.orderAutomation.createOrder(page, this.toFormData(input));

      if (!result.success) {
        this.logger.error({ error: result.error }, 'Order automation failed');
        return Result.fail(new AutomationError(result.error.message));
      }

      this.logger.info({ orderId: result.value }, 'CreateOrderUseCase: completed');
      return Result.ok({ orderId: result.value });
    } finally {
      await this.browserSession.releaseSession(page.context(), page);
    }
  }

  /**
   * Map the strongly-typed DTO to the flat Record<string, unknown> that
   * FormPage expects. Keys must match the FormConfig field keys in purchaseOrder.ts.
   */
  private toFormData(input: OrderInputDTO): Record<string, unknown> {
    return {
      document_number: input.document_number,
      order_code: input.order_code,
      date: input.date,
      status: input.status,
      vendor_id: String(input.vendor_id),
      vendor_name: input.vendor_name,
      vendor_entity_id: String(input.vendor_entity_id),
      customer_id: String(input.customer_id),
      customer_name: input.customer_name,
      product_name: input.product_name,
      item_code: input.item_code,
      lot_number: input.lot_number,
      quantity_ordered: String(input.quantity_ordered),
      quantity_billed: String(input.quantity_billed),
      quantity_received: String(input.quantity_received),
    };
  }
}
