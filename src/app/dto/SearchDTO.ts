import { z } from 'zod';
import { claimInputSchema } from './ClaimDTO';

export const searchInputSchema = z.object({
  claimInput: claimInputSchema,
});

export type SearchInputDTO = z.infer<typeof searchInputSchema>;
