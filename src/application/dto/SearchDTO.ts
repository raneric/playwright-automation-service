import { z } from 'zod';

const productInfoSchema = z.object({
  item_code: z.string().nullable(),
  product_name: z.string().min(1),
  order_code: z.string().nullable(),
});

export const searchInputSchema = z.object({
  customer: z.string().min(1, 'Customer name is required'),
  products: z.array(productInfoSchema).min(1, 'At least one product is required'),
});

export type SearchInputDTO = z.infer<typeof searchInputSchema>;
