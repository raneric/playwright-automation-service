import { Router } from 'express';
import { SearchController } from '../controllers';
import { validate } from '../validation';
import { searchInputSchema } from '../../../core/dto';

export function createSearchRoutes(controller: SearchController): Router {
  const router = Router({ mergeParams: true });

  router.post('/', /*validate(searchInputSchema),*/ controller.search);

  return router;
}
