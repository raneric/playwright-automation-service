import { Request, Response } from 'express';
import { SearchProductsUseCase } from '../../usecases';
import { Logger } from '../../../shared/logger';
import { ClaimInputDTO } from '../../dto';

export class SearchController {
  constructor(
    private readonly searchProductsUseCase: SearchProductsUseCase,
    private readonly logger: Logger
  ) {}

  search = async (req: Request, res: Response): Promise<void> => {
    const platform = req.params.platform as string;
    const claim: ClaimInputDTO = req.body.claimInput;
    const result = await this.searchProductsUseCase.execute(platform, claim);

    if (!result.success) {
      this.logger.error(
        `Error on searching data for the customer ${claim.customer}`
      );
      res.status(422).json({
        success: false,
        error: {
          code: 'AUTOMATION_ERROR',
          message: result.error.message,
        },
      });
      return;
    }

    const searchResult = {
      totalMatched: result.value.matchedProducts.length,
      totalProduct: claim.products.length,
      success: result.value.matchedProducts.length === claim.products.length,
      totalNotFound:
        claim.products.length - result.value.matchedProducts.length,
    };

    const finalResult = {
      ...claim,
      productFromSearch: result.value,
      searchResult,
    };

    res.status(200).json({
      success: true,
      data: finalResult,
    });
  };
}
