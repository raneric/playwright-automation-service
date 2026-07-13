import { SearchInputDTO } from '../dto';
import { ISearchAutomationPort } from '../ports';
import { IBrowserSession } from '../../domain/ports';
import { Result } from '../../shared/Result';
import { Logger } from '../../infrastructure/logger';
import { AutomationError } from '../../shared/errors';
import { ProductResult } from '../../domain/entities';

export interface SearchProductsOutput {
  products: ProductResult[];
}

/**
 * Use case: Search for products on the order list page.
 */
export class SearchProductsUseCase {
  constructor(
    private readonly browserSession: IBrowserSession,
    private readonly searchAutomation: ISearchAutomationPort,
    private readonly logger: Logger,
  ) {}

  async execute(input: SearchInputDTO): Promise<Result<SearchProductsOutput>> {
    this.logger.info({ customer: input.customer }, 'SearchProductsUseCase: starting');

    const productNames = input.products.map((p) => p.product_name);
    const { page } = await this.browserSession.createAuthenticatedSession();

    try {
      const result = await this.searchAutomation.searchProducts(
        page,
        input.customer,
        productNames,
      );

      if (!result.success) {
        this.logger.error({ error: result.error }, 'Search automation failed');
        return Result.fail(new AutomationError(result.error.message));
      }

      this.logger.info(
        { count: result.value.length },
        'SearchProductsUseCase: completed',
      );

      return Result.ok({ products: result.value });
    } finally {
      await this.browserSession.releaseSession(page.context());
    }
  }
}