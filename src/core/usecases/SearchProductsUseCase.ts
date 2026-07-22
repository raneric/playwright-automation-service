import { ClaimInputDTO, SearchInputDTO } from '../dto';
import { ISearchAutomationPort, IBrowserSession } from '../ports';
import { Result } from '../../shared/Result';
import { Logger } from '../../shared/logger';
import { AutomationError } from '../../shared/errors';
import { ProductResult } from '../domain/entities';
import { ProductDTO } from '../dto/ClaimDTO';

export interface ProductSearchOutput {
  unmatchedProducts: ProductResult[];
  matchedProducts: ProductDTO[];
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
    claim: ClaimInputDTO
  ): Promise<Result<ProductSearchOutput>> {
    this.logger.info('SearchProductsUseCase: starting');

    const { page } =
      await this.browserSession.createAuthenticatedSession(platform);

    try {
      const automation = this.getSearchAutomation(platform);
      const result = await automation.searchProducts(page, claim);

      if (!result.success) {
        this.logger.error(
          { platform, error: result.error },
          'Search automation failed'
        );
        return Result.fail(new AutomationError(result.error.message));
      }

      this.logger.info(
        { platform, count: result.value.matchedProducts.length },
        'SearchProductsUseCase: completed'
      );

      return Result.ok(result.value);
    } finally {
      await this.browserSession.releaseSession(page.context(), page);
    }
  }
}
