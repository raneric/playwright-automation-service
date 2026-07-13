import { Request, Response } from 'express';
import { CreateClaimUseCase } from '../application/usecases';
import { ClaimInputDTO } from '../application/dto';
import { Logger } from '../infrastructure/logger';

/**
 * Controller for claim-related endpoints.
 * Thin layer — delegates all business logic to use cases.
 */
export class ClaimController {
  constructor(
    private readonly createClaimUseCase: CreateClaimUseCase,
    private readonly logger: Logger,
  ) {}

  create = async (req: Request, res: Response): Promise<void> => {
    const input: ClaimInputDTO = req.body;

    const result = await this.createClaimUseCase.execute(input);

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

    res.status(201).json({
      success: true,
      data: result.value,
    });
  };
}
