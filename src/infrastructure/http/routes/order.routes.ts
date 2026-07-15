import { Router } from 'express';
import { OrderController } from '../controllers';
import { validate } from '../validation';
import { orderInputSchema } from '../../../core/dto';

export function createOrderRoutes(controller: OrderController): Router {
  const router = Router();

  router.post('/', validate(orderInputSchema), controller.create);

  return router;
}
