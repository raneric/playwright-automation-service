import { ClaimInputDTO } from '../dto';
import { Result } from '../../shared/types/Result';
import { Logger } from '../../shared/logger';
import { AutomationError } from '../../shared/errors';
import { ISearchAutomationPort } from '../../shared/ports';
import { ProductSearchOutput } from '../../shared/types/FakeUISaas';

/**
 * Use case: Search for products on the order list page.
 */
export class SearchProductsUseCase {
  constructor(
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
    try {
      const automation = this.getSearchAutomation(platform);
      const result = await automation.searchProducts(claim);

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
    } catch (error) {
      this.logger.error(
        { platform, error },
        'SearchProductsUseCase: unexpected error'
      );
      return Result.fail(new AutomationError('Unexpected error during search'));
    }
  }
}
