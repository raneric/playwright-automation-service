import { Request, Response } from 'express';
import { CreateClaimUseCase } from '../../usecases';
import { Logger } from '../../../shared/logger';
import { ClaimInputDTO } from '../../dto';

/**
 * Controller for claim-related endpoints.
 * Thin layer — delegates all business logic to use cases.
 */
export class ClaimController {
  constructor(
    private readonly createClaimUseCase: CreateClaimUseCase,
    private readonly logger: Logger
  ) {}

  create = async (req: Request, res: Response): Promise<void> => {
    const platform = req.params.platform as string;
    const input: ClaimInputDTO = req.body;

    const ticketCreationResult = await this.createClaimUseCase.execute(
      platform,
      input
    );

    if (!ticketCreationResult.success) {
      this.logger.error(
        `Error creating ticket for ${input.customer.organization}`
      );
      res.status(422).json({
        success: false,
        error: {
          code: 'AUTOMATION_ERROR',
          message: (ticketCreationResult.error as Error).message,
        },
      });
      return;
    }

    const result = {
      ...input,
      ticketCreationResult: ticketCreationResult.value,
    };

    res.status(201).json({
      success: true,
      data: result,
    });
  };
}
