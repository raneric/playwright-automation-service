import { Request, Response } from 'express';
import { SearchProductsUseCase } from '../../../core/usecases';
import { Logger } from '../../../shared/logger';
import { ClaimInputDTO, SearchInputDTO } from '../../../core/dto';

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
      res.status(422).json({
        success: false,
        error: {
          code: 'AUTOMATION_ERROR',
          message: result.error.message,
        },
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: result.value,
    });
  };
}
