import { describe, it } from 'node:test';
import { expect } from 'playwright/test';
import { ClaimInputDTO, claimInputSchema } from '../../src/core/dto';

describe('ClaimInputDTO validation', () => {
  const validInput: ClaimInputDTO = {
    requestInfo: {
      dateOfRequest: '2026-01-15',
      requestor: 'John Doe',
    },
    customer: {
      name: 'Acme Corp',
      organization: 'Engineering',
      department: 'QA',
      address: {
        street: '123 Main St',
        city: 'Springfield',
        state: 'IL',
        postalCode: '62701',
      },
      phone: '555-1234',
      email: 'acme@example.com',
    },
    issues: 'Product arrived damaged',
    products: [
      {
        lineNumber: 1,
        documentNumber: 'DOC-001',
        productName: 'Widget A',
        itemCode: 'W-001',
        lotNumber: 'L-001',
        orderCode: 'ORD-001',
        orderDate: '2026-01-10',
        quantityOrdered: 100,
        quantityBilled: 100,
        quantityReceived: 95,
        vendor: { name: 'Vendor Inc', id: 1 },
        status: 'received',
        existsInSystem: true,
        verifiedFromAttachment: {
          attachmentName: 'N/A',
          attachmentType: 'N/A',
        },
      },
    ],
  };

  it('should accept valid input', () => {
    const result = claimInputSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it('should reject input with empty productLines', () => {
    const result = claimInputSchema.safeParse({
      ...validInput,
      productLines: [],
    });
    expect(result.success).toBe(false);
  });

  it('should reject input with invalid email', () => {
    const result = claimInputSchema.safeParse({
      ...validInput,
      customer: { ...validInput.customer, email: 'not-an-email' },
    });
    expect(result.success).toBe(false);
  });

  it('should reject input with missing customer name', () => {
    const result = claimInputSchema.safeParse({
      ...validInput,
      customer: { ...validInput.customer, name: '' },
    });
    expect(result.success).toBe(false);
  });
});
