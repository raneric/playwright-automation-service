import { OrderInputDTO } from '../dto';
import { IOrderAutomationPort } from '../ports';
import { IBrowserSession } from '../../domain/ports';
import { Result } from '../../shared/Result';
import { Logger } from '../../infrastructure/logger';
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
      const result = await this.orderAutomation.createOrder(
        page,
        input as unknown as Record<string, unknown>,
      );

      if (!result.success) {
        this.logger.error({ error: result.error }, 'Order automation failed');
        return Result.fail(new AutomationError(result.error.message));
      }

      this.logger.info({ orderId: result.value }, 'CreateOrderUseCase: completed');
      return Result.ok({ orderId: result.value });
    } finally {
      await this.browserSession.releaseSession(page.context());
    }
  }
}