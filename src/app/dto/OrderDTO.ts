import { z } from 'zod';

export const orderInputSchema = z.object({
  document_number: z.string().min(1),
  order_code: z.string().min(1),
  date: z.string().min(1),
  status: z.string().min(1),
  vendor_id: z.number().int().positive(),
  vendor_name: z.string().min(1),
  vendor_entity_id: z.number().int().positive(),
  customer_id: z.number().int().positive(),
  customer_name: z.string().min(1),
  product_name: z.string().min(1),
  item_code: z.string().min(1),
  lot_number: z.string().min(1),
  quantity_ordered: z.number().nonnegative(),
  quantity_billed: z.number().nonnegative(),
  quantity_received: z.number().nonnegative(),
});

export type OrderInputDTO = z.infer<typeof orderInputSchema>;
