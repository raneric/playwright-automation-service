import { Request, Response } from 'express';
import { SearchProductsUseCase } from '../application/usecases';
import { SearchInputDTO } from '../application/dto';
import { Logger } from '../infrastructure/logger';

export class SearchController {
  constructor(
    private readonly searchProductsUseCase: SearchProductsUseCase,
    private readonly logger: Logger,
  ) {}

  search = async (req: Request, res: Response): Promise<void> => {
    const input: SearchInputDTO = req.body;

    const result = await this.searchProductsUseCase.execute(input);

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
