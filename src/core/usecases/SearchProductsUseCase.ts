import { SearchInputDTO } from '../dto';
import { ISearchAutomationPort, IBrowserSession } from '../ports';
import { Result } from '../../shared/Result';
import { Logger } from '../../shared/logger';
import { AutomationError } from '../../shared/errors';
import { ProductResult } from '../domain/entities';

export interface SearchProductsOutput {
  products: ProductResult[];
}

/**
 * Use case: Search for products on the order list page.
 */
export class SearchProductsUseCase {
  constructor(
    private readonly browserSession: IBrowserSession,
    private readonly getSearchAutomation: (
      platform: string
    ) => ISearchAutomationPort,
    private readonly logger: Logger
  ) {}

  async execute(
    platform: string,
    input: SearchInputDTO
  ): Promise<Result<SearchProductsOutput>> {
    this.logger.info('SearchProductsUseCase: starting');

    const { page } =
      await this.browserSession.createAuthenticatedSession(platform);

    try {
      const automation = this.getSearchAutomation(platform);
      const result = await automation.searchProducts(page, input.values);

      if (!result.success) {
        this.logger.error(
          { platform, error: result.error },
          'Search automation failed'
        );
        return Result.fail(new AutomationError(result.error.message));
      }

      this.logger.info(
        { platform, count: result.value.length },
        'SearchProductsUseCase: completed'
      );

      return Result.ok({ products: result.value });
    } finally {
      await this.browserSession.releaseSession(page.context(), page);
    }
  }
}
