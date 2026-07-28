import { ClaimInputDTO, SearchInputDTO } from '../dto';
import { Result } from '../../shared/Result';
import { Logger } from '../../shared/logger';
import { AutomationError } from '../../shared/errors';
import { ProductDTO } from '../dto/ClaimDTO';
import { IBrowserSession, ISearchAutomationPort } from '../../automation/ports';
import { ProductResult } from '../../shared/types/FakeUISaas';

export interface ProductSearchOutput {
  allProductsFromSearch: ProductResult[];
  unmatchedProducts: ProductDTO[];
  matchedProducts: ProductDTO[];
  reconciliationResult: {
    totalProduct: number;
    totalReconciledProduct: number;
    success: boolean;
  };
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

    const { page } = await this.browserSession.createAuthenticatedSession(
      platform
    );

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
