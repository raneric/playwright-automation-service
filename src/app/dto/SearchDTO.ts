import { string, z } from 'zod';

const productInfoSchema = z.object({
  item_code: z.string().nullable(),
  product_name: z.string().min(1),
  order_code: z.string().nullable(),
});

export const searchInputSchema = z.object({
  values: z.array(z.string()).min(1),
});

export type SearchInputDTO = z.infer<typeof searchInputSchema>;
