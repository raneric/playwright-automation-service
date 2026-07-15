import { Router } from 'express';
import { ClaimController } from '../controllers';
import { validate } from '../validation';
import { claimInputSchema } from '../../../core/dto';

export function createClaimRoutes(controller: ClaimController): Router {
  const router = Router();

  router.post('/', validate(claimInputSchema), controller.create);

  return router;
}
