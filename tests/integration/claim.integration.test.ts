/**
 * Integration test for POST /api/:platform/claim and GET /health
 *
 * Spins up the full Express application with all infrastructure dependencies
 * (BrowserManager, automation ports) replaced by lightweight mocks. Verifies:
 *
 *  - Valid payloads reach the use case and return 201
 *  - Malformed payloads are rejected by Zod validation with 400
 *  - Automation failures are surfaced as 422
 *  - /health returns 200 unconditionally
 */
import request from 'supertest';
import { asValue } from 'awilix';
import { createApp } from '../../src/app/express';
import { buildContainer } from '../../src/app/container';
import { loadConfig } from '../../src/infrastructure/config';
import { createLogger } from '../../src/shared/logger';
import { Result } from '../../src/shared/Result';
import { beforeEach, describe, it } from 'node:test';
import { expect } from '@jest/globals';

// ── Mock objects ──────────────────────────────────────────────────────────────

const mockContext = {
  close: jest.fn().mockResolvedValue(null),
  newPage: jest.fn(),
};

const mockPage = {
  context: jest.fn().mockReturnValue(mockContext),
  goto: jest.fn().mockResolvedValue(null),
  fill: jest.fn().mockResolvedValue(null),
  click: jest.fn().mockResolvedValue(null),
  waitForSelector: jest.fn().mockResolvedValue(null),
  waitForLoadState: jest.fn().mockResolvedValue(null),
  $: jest.fn().mockResolvedValue(null),
  $$: jest.fn().mockResolvedValue([]),
  $$eval: jest.fn().mockResolvedValue([]),
  textContent: jest.fn().mockResolvedValue('CC-001'),
  screenshot: jest.fn().mockResolvedValue(null),
};

mockContext.newPage.mockResolvedValue(mockPage);

const mockBrowserSession = {
  createSession: jest
    .fn()
    .mockResolvedValue({ context: mockContext, page: mockPage }),
  createAuthenticatedSession: jest
    .fn()
    .mockResolvedValue({ context: mockContext, page: mockPage }),
  releaseSession: jest.fn().mockResolvedValue(null),
  shutdown: jest.fn().mockResolvedValue(null),
};

const mockClaimAutomation = {
  createClaim: jest.fn().mockResolvedValue(Result.ok('CC-001')),
};

const mockLoginWorkflow = {
  login: jest.fn().mockResolvedValue(undefined),
};

// ── App factory ───────────────────────────────────────────────────────────────

function buildTestApp() {
  const config = loadConfig();
  const logger = createLogger({ level: 'silent', pretty: false });

  // Build the real container then override infrastructure with mocks.
  const container = buildContainer(config, logger);
  container.register({
    browserSession: asValue(mockBrowserSession),
    // Override per-platform factories with mocks that ignore the platform arg
    getLoginWorkflow: asValue(() => mockLoginWorkflow),
    getClaimAutomation: asValue(() => mockClaimAutomation),
    getOrderAutomation: asValue(() => ({
      createOrder: jest.fn().mockResolvedValue(Result.ok('PO-001')),
    })),
    getSearchAutomation: asValue(() => ({
      searchProducts: jest.fn().mockResolvedValue(Result.ok([])),
    })),
  });

  return createApp(container);
}

// ── Fixtures ──────────────────────────────────────────────────────────────────

const validClaimPayload = {
  requestInfo: { dateOfRequest: '2026-01-15', requestor: 'John Doe' },
  orderCode: 'ORD-001',
  orderDate: '2026-01-10',
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
  issues: 'Damaged on arrival',
  productLines: [
    {
      lineNumber: 1,
      documentNumber: 'DOC-001',
      productName: 'Widget A',
      itemCode: 'W-001',
      lotNumber: 'L-001',
      quantityOrdered: 100,
      quantityBilled: 100,
      quantityReceived: 95,
      vendor: { name: 'Vendor Inc', id: 1 },
      status: 'received',
    },
  ],
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('POST /api/:platform/claim', () => {
  let app: ReturnType<typeof buildTestApp>;

  beforeAll(() => {
    app = buildTestApp();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockClaimAutomation.createClaim.mockResolvedValue(Result.ok('CC-001'));
    mockBrowserSession.createAuthenticatedSession.mockResolvedValue({
      context: mockContext,
      page: mockPage,
    });
    mockPage.context.mockReturnValue(mockContext);
  });

  it('returns 201 with claimId on success', async () => {
    const res = await request(app)
      .post('/api/default/claim')
      .send(validClaimPayload)
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.claimId).toBe('CC-001');
    expect(mockBrowserSession.createAuthenticatedSession).toHaveBeenCalledTimes(
      1
    );
    expect(mockBrowserSession.createAuthenticatedSession).toHaveBeenCalledWith(
      'default'
    );
    expect(mockClaimAutomation.createClaim).toHaveBeenCalledTimes(1);
    expect(mockBrowserSession.releaseSession).toHaveBeenCalledTimes(1);
  });

  it('returns 400 when body is empty', async () => {
    const res = await request(app)
      .post('/api/default/claim')
      .send({})
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(mockClaimAutomation.createClaim).not.toHaveBeenCalled();
  });

  it('returns 400 when productLines is empty', async () => {
    const res = await request(app)
      .post('/api/default/claim')
      .send({ ...validClaimPayload, productLines: [] })
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(mockClaimAutomation.createClaim).not.toHaveBeenCalled();
  });

  it('returns 400 when customer email is invalid', async () => {
    const res = await request(app)
      .post('/api/default/claim')
      .send({
        ...validClaimPayload,
        customer: { ...validClaimPayload.customer, email: 'not-an-email' },
      })
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(mockClaimAutomation.createClaim).not.toHaveBeenCalled();
  });

  it('returns 422 when automation port returns a failure', async () => {
    mockClaimAutomation.createClaim.mockResolvedValue(
      Result.fail(new Error('Form validation failed: missing required field'))
    );

    const res = await request(app)
      .post('/api/default/claim')
      .send(validClaimPayload)
      .expect(422);

    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('AUTOMATION_ERROR');
    expect(res.body.error.message).toContain('Form validation failed');
  });
});

describe('GET /health', () => {
  it('returns 200 with status ok', async () => {
    const app = buildTestApp();
    const res = await request(app).get('/health').expect(200);
    expect(res.body.status).toBe('ok');
    expect(typeof res.body.uptime).toBe('number');
    expect(typeof res.body.timestamp).toBe('string');
  });
});
