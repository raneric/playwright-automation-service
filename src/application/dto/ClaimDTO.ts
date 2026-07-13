import { z } from 'zod';

// ── Address ────────────────────────────────────────────────────
const addressSchema = z.object({
  street: z.string().min(1),
  city: z.string().min(1),
  state: z.string().min(1),
  postalCode: z.string().min(1),
});

// ── Customer ───────────────────────────────────────────────────
const customerSchema = z.object({
  name: z.string().min(1),
  organization: z.string().min(1),
  department: z.string().min(1),
  address: addressSchema,
  phone: z.string().min(1),
  email: z.string().email(),
});

// ── Vendor ─────────────────────────────────────────────────────
const vendorSchema = z.object({
  name: z.string().min(1),
  id: z.number().int().positive(),
});

// ── Product Line ───────────────────────────────────────────────
const productLineSchema = z.object({
  lineNumber: z.number().int().nonnegative(),
  documentNumber: z.string().min(1),
  productName: z.string().min(1),
  itemCode: z.string().min(1),
  lotNumber: z.string().min(1),
  quantityOrdered: z.number().nonnegative(),
  quantityBilled: z.number().nonnegative(),
  quantityReceived: z.number().nonnegative(),
  vendor: vendorSchema,
  status: z.string().min(1),
});

// ── Request Info ───────────────────────────────────────────────
const requestInfoSchema = z.object({
  dateOfRequest: z.string().min(1),
  requestor: z.string().min(1),
});

// ── Claim Input ────────────────────────────────────────────────
export const claimInputSchema = z.object({
  requestInfo: requestInfoSchema,
  orderCode: z.string().min(1),
  orderDate: z.string().min(1),
  customer: customerSchema,
  issues: z.string(),
  productLines: z.array(productLineSchema).min(1, 'At least one product line is required'),
});

export type ClaimInputDTO = z.infer<typeof claimInputSchema>;
