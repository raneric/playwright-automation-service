import { Request, Response } from 'express';
import { CreateOrderUseCase } from '../../../core/usecases';
import { OrderInputDTO } from '../../../core/dto';
import { Logger } from '../../../shared/logger';

export class OrderController {
  constructor(
    private readonly createOrderUseCase: CreateOrderUseCase,
    private readonly logger: Logger,
  ) {}

  create = async (req: Request, res: Response): Promise<void> => {
    const input: OrderInputDTO = req.body;

    const result = await this.createOrderUseCase.execute(input);

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
