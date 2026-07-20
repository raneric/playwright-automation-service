import { z } from 'zod';

// ── Address ────────────────────────────────────────────────────
const addressSchema = z.object({
  street: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postalCode: z.string().optional(),
});

// ── Customer ───────────────────────────────────────────────────
const customerSchema = z.object({
  name: z.string().min(1),
  organization: z.string().min(1),
  department: z.string().optional(),
  address: addressSchema.optional(),
  phone: z.string().min(1).optional(),
  email: z.string().email().optional(),
});

// ── Vendor ─────────────────────────────────────────────────────
const vendorSchema = z.object({
  name: z.string().optional(),
  id: z.number().int().optional(),
});

const verifiedFromAttachmentSchema = z.object({
  attachmentName: z.string(),
  attachmentType: z.string(),
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
  orderCode: z.string().min(1),
  orderDate: z.string().min(1),
  vendor: vendorSchema,
  status: z.string().min(1),
  existsInSystem: z.boolean(),
  verifiedFromAttachment: verifiedFromAttachmentSchema,
});

// ── Request Info ───────────────────────────────────────────────
const requestInfoSchema = z.object({
  dateOfRequest: z.string().min(1),
  requestor: z.string().min(1),
});

// ── Claim Input ────────────────────────────────────────────────
export const claimInputSchema = z.object({
  requestInfo: requestInfoSchema,
  customer: customerSchema,
  issues: z.string(),
  products: z
    .array(productLineSchema)
    .min(1, 'At least one product line is required'),
});

export type ClaimInputDTO = z.infer<typeof claimInputSchema>;
