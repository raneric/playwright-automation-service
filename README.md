# Playwright Automation Service

A production-grade Express.js REST API service that automates user interactions with third-party SaaS web applications using Playwright.

## Overview

This service exposes HTTP endpoints that, when called, launch or reuse a Playwright browser session to perform automated actions on a target SaaS application:

- Logging into the application
- Navigating through pages
- Filling forms
- Searching data
- Validating informations
- Extracting data from the UI
- Returning structured results to the API caller

### Layer Responsibilities

| Layer | Directory | Responsibility |
|---|---|---|
| **Routes** | `src/app/http/routes/` | Define HTTP method, path, validation middleware, and controller binding |
| **Validation** | `src/app/http/validation/` | Zod schema validation middleware — rejects malformed requests with 400 |
| **Controllers** | `src/app/http/controllers/` | Thin request handlers — extract data from request, delegate to use case, format response |
| **Middleware** | `src/app/http/middleware/` | Error handler, request logger, timeout, bearer token auth, rate limiter |
| **Use Cases** | `src/app/usecases/` | Application business logic — orchestrate domain services and automation ports |
| **DTOs** | `src/app/dto/` | Zod-validated request/response schemas — the API contract |
| **Ports** | `src/automation/ports/` | Interfaces that decouple use cases from Playwright adapters |
| **Automation** | `src/automation/` | Playwright adapters, browser management, page objects, interactions, config |
| **App** | `src/app/` | Express app factory, DI container, HTTP layer, use cases, server bootstrap |
| **Shared** | `src/shared/` | Cross-cutting — `Result` type, error classes, constants, types, logger |

## Folder Structure

```
src/
├── app/                          # Application bootstrap, HTTP layer, use cases, DTOs
│   ├── config/
│   │   ├── server.ts             # Entry point, graceful shutdown
│   │   ├── express.ts            # Express app factory
│   │   └── container.ts          # Awilix DI container wiring
│   ├── http/                     # Express routes, controllers, middleware
│   │   ├── controllers/          # Express request handlers (thin)
│   │   │   ├── ClaimController.ts
│   │   │   └── SearchController.ts
│   │   ├── routes/               # Route definitions + validation middleware
│   │   │   ├── claim.routes.ts
│   │   │   ├── search.routes.ts
│   │   │   └── health.routes.ts
│   │   ├── middleware/            # Error handler, request logger, timeout, API key auth
│   │   └── validation/           # Zod validation middleware factory
│   ├── dto/                      # Zod-validated request/response schemas — the API contract
│   │   ├── ClaimDTO.ts
│   │   ├── OrderDTO.ts
│   │   └── SearchDTO.ts
│   └── usecases/                 # Application business logic
│       ├── CreateClaimUseCase.ts
│       └── SearchProductsUseCase.ts
│
├── shared/                       # Cross-cutting, zero-dependency code
│   ├── Result.ts                 # Result<T,E> discriminated union
│   ├── errors/                   # Custom exception hierarchy
│   │   └── AppError.ts           # Base + 8 typed subclasses
│   ├── constants/                # Page paths, timeouts, retry policies
│   ├── logger/                   # Pino structured logger
│   └── types/                    # Shared type definitions & domain entities
│       └── FakeUISaas.ts         # ProductResult, SearchTerm, TicketSubmissionResult, etc.
│
├── automation/                   # Playwright adapters, browser management, config, ports
│   ├── config/
│   │   ├── AppConfig.ts          # Typed config from env vars
│   │   └── form/                 # Declarative form definitions
│   │       ├── types.ts          # FormConfig type definitions
│   │       └── customerClaim.ts  # Customer claim form config
│   ├── ports/                    # Interfaces decoupling use cases from adapters
│   │   ├── IAutomationPort.ts
│   │   └── IBrowserSession.ts
│   └── playwright/
│       ├── BrowserManager.ts     # Browser lifecycle, context pooling, auto-login
│       ├── interactions/         # Workflow orchestrators implementing ports
│       │   └── fakeUI/           # Per-SaaS-app interaction adapters
│       │       ├── PlaywrightLoginWorkflow.ts
│       │       ├── PlaywrightClaimAutomation.ts
│       │       └── PlaywrightSearchAutomation.ts
│       ├── pages/                # Page Object Model (POM)
│       │   └── fakeUI/           # Per-SaaS-app page objects
│       │       ├── BasePage.ts   # Shared navigation/wait/fill helpers
│       │       ├── LoginPage.ts  # Login form interactions
│       │       ├── FormPage.ts   # Generic data-driven form filler
│       │       └── OrderListPage.ts # Search + table extraction
│       ├── selectors/            # Centralized data-testid constants
│       │   ├── login.ts          # Login page selectors
│       │   └── orderList.ts      # Order list table selectors
│       └── utils/                # gotoWithRetry, retry, value check helpers
│           ├── retry.ts
│           └── valueCheck.ts

tests/
├── unit/                         # Fast, no I/O — pure logic tests
├── integration/                  # Tests with real Express + mocked Playwright
└── playwright/                   # End-to-end tests against a real browser
```

## Design Patterns

| Pattern | Where | Why |
|---|---|---|
| **Clean Architecture** | `app/usecases/` depends on `automation/ports/` | Use cases depend on interfaces, not implementations. Ports are owned by the automation layer. |
| **Dependency Injection** | `app/config/container.ts` (Awilix) | All wiring in one place. Use cases receive interfaces, never construct dependencies. |
| **Page Object Model (POM)** | `automation/playwright/pages/` | Each SaaS page is a class. Selectors centralized. No raw `page.fill()` in workflows. |
| **Adapter Pattern** | `automation/playwright/interactions/` implements `automation/ports/` | Application layer depends on port interfaces, not Playwright. Swap engines without touching use cases. |
| **Strategy Pattern** | `FormConfig` declarative definitions | Same `FormPage` class fills any form. New form = new config, not new code. |
| **Result Monad** | `shared/Result.ts` | Forces explicit success/failure handling. No uncaught exceptions from use cases. |
| **Factory** | `createApp()`, `buildContainer()`, route factories | Construction logic isolated and testable. |
| **Middleware Chain** | `app/http/middleware/` | Validation → auth → timeout → handler → error handler. Composable concerns. |

## API Endpoints

### POST /api/claim

Create a customer claim in the SaaS application.

**Request:**
```json
{
    "requestInfo": {
      "dateOfRequest": "2026-01-15",
      "requestor": "John Doe"
    },
    "orderCode": "ORD-001",
    "orderDate": "2026-01-10",
    "customer": {
      "name": "Acme Corp",
      "organization": "Engineering",
      "department": "QA",
      "address": {
        "street": "123 Main St",
        "city": "Springfield",
        "state": "IL",
        "postalCode": "62701"
      },
      "phone": "555-1234",
      "email": "acme@example.com"
    },
    "issues": "Product arrived damaged",
    "productLines": [
      {
        "lineNumber": 1,
        "documentNumber": "DOC-001",
        "productName": "Widget A",
        "itemCode": "W-001",
        "lotNumber": "L-001",
        "quantityOrdered": 100,
        "quantityBilled": 100,
        "quantityReceived": 95,
        "vendor": { "name": "Vendor Inc", "id": 1 },
        "status": "received"
      }
    ]
}
```

**Response (201):**
```json
{
  "success": true,
  "data": { "claimId": "CC-12345" }
}
```

### POST /api/order

Create a purchase order in the SaaS application.

**Request:**
```json
{
  "data": {
    "document_number": "DOC-001",
    "order_code": "ORD-001",
    "date": "2026-01-10",
    "status": "pending",
    "vendor_id": 1,
    "vendor_name": "Vendor Inc",
    "vendor_entity_id": 100,
    "customer_id": 200,
    "customer_name": "Acme Corp",
    "product_name": "Widget A",
    "item_code": "W-001",
    "lot_number": "L-001",
    "quantity_ordered": 100,
    "quantity_billed": 100,
    "quantity_received": 95
  }
}
```

**Response (201):**
```json
{
  "success": true,
  "data": { "orderId": "PO-67890" }
}
```

### POST /api/search

Search for products on the order list page.

**Request:**
```json
{
    "customer": "Pacific Medical Resources",
    "products": [
      { "product_name": "catheter", "item_code": "MED-IVC-018", "order_codes": "" },
      { "product_name": "oxygen cannula", "item_code": null, "order_codes": "" }
    ]
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "products": [
      {
        "itemCode": "MED-IVC-018",
        "productName": "catheter",
        "vendor": "MedSupply Inc",
        "customerName": "Pacific Medical Resources",
        "orderCode": "ORD-001",
        "existsInSystem": true
      }
    ]
  }
}
```

### GET /health

Health check endpoint.

**Response (200):**
```json
{
  "status": "ok",
  "timestamp": "2026-07-13T14:20:00.000Z",
  "uptime": 1234.56
}
```

## Error Responses

All errors follow a consistent format:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable description"
  }
}
```

| HTTP Status | Code | Meaning |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Request body failed Zod schema validation |
| 401 | `AUTHENTICATION_ERROR` | Missing or invalid bearer token |
| 404 | `NOT_FOUND` | Resource not found |
| 408 | `TIMEOUT` | Request exceeded the workflow timeout |
| 422 | `AUTOMATION_ERROR` | The SaaS application rejected the operation |
| 429 | `RATE_LIMIT` | Rate limit exceeded on the target SaaS |
| 502 | `UPSTREAM_ERROR` | The target SaaS is unreachable |
| 504 | `NAVIGATION_ERROR` | Page navigation timed out |

## Request Flow (Example: POST /api/search)

1. **Express** receives `POST /api/search` with `{ data: { customer: "...", products: [...] } }`
2. **Zod validation** middleware parses and validates `req.body` against `searchWrapperSchema`
3. **SearchController.search()** extracts `req.body.data` and calls `SearchProductsUseCase.execute(input)`
4. **SearchProductsUseCase** calls `browserSession.createAuthenticatedSession()`
5. **BrowserManager** returns an existing authenticated context (or creates one + logs in via `LoginPage`)
6. **PlaywrightSearchAutomation.searchProducts()** navigates to the order list, searches each term, extracts results
7. Result flows back: `Result.ok({ products })` → Controller → `200 { success: true, data: { products } }`

## Configuration

All configuration is loaded from environment variables via `src/automation/config/AppConfig.ts`.

| Variable | Default | Description |
|---|---|---|
| `NODE_ENV` | `development` | Environment (`development`, `production`) |
| `PORT` | `3000` | HTTP server port |
| `LOG_LEVEL` | `info` | Pino log level (`debug`, `info`, `warn`, `error`) |
| `SAAS_BASE_URL` | `http://localhost:5173` | Target SaaS application base URL |
| `SAAS_LOGIN_URL` | `http://localhost:5173/login` | Login page URL |
| `SAAS_USERNAME` | `admin` | SaaS login username |
| `SAAS_PASSWORD` | `password123` | SaaS login password |
| `BROWSER_HEADLESS` | `true` | Run Playwright in headless mode |
| `BROWSER_SLOW_MO` | `0` | Slow down Playwright operations (ms) |
| `BROWSER_VIEWPORT_WIDTH` | `1280` | Browser viewport width |
| `BROWSER_VIEWPORT_HEIGHT` | `720` | Browser viewport height |
| `BROWSER_MAX_CONTEXTS` | `5` | Max concurrent browser contexts |
| `NETWORK_OFFLINE` | `false` | Simulate offline mode (`true`/`false`) |
| `NETWORK_DOWNLOAD_KBPS` | `0` | Download speed limit in kbps (0 = unlimited) |
| `NETWORK_UPLOAD_KBPS` | `0` | Upload speed limit in kbps (0 = unlimited) |
| `NETWORK_LATENCY_MS` | `0` | Round-trip latency in ms (0 = none) |
| `AUTH_TOKEN` | *(none)* | Bearer token required to call `/api/*` routes (when set) |

> **Authentication** — All `/api/*` routes require a bearer token when `AUTH_TOKEN` is set:
> `Authorization: Bearer <AUTH_TOKEN>`. When `AUTH_TOKEN` is unset, auth is
> disabled (useful for local development). The `GET /health` endpoint remains
> unauthenticated.

Copy `.env.example` to `.env` and adjust values for your environment.

## Getting Started

### Prerequisites

- Node.js 18+
- npm 9+

### Installation

```bash
npm install
```

### Development

```bash
# Copy environment file
cp .env.example .env

# Start in dev mode with hot reload
npm run dev
```

### Production Build

```bash
npm run build
npm start
```

### Docker

```bash
docker compose up --build
```

### Running Tests

```bash
# All tests
npm test

# Unit tests only
npm run test:unit

# Integration tests
npm run test:integration

# Playwright E2E tests
npm run test:playwright
```

## Testing Strategy

| Layer | Test Type | Tool | What to Test |
|---|---|---|---|
| **Shared** | Unit | Jest | `Result` type, error classes, constants, domain types |
| **Application** | Unit | Jest | Use case logic with mocked ports |
| **Validation** | Unit | Jest | Zod schema validation (valid/invalid inputs) |
| **Controllers** | Integration | Jest + supertest | HTTP status codes, response shapes, error handling |
| **Automation** | Integration | Jest + mocked Playwright | BrowserManager lifecycle, page object interactions |
| **End-to-End** | Playwright | Playwright Test | Full workflow against a real browser and SaaS app |

## Browser Session Management

- The browser is launched once and kept alive for the lifetime of the process
- The first authenticated request performs login; the session (cookies, localStorage) is cached
- Subsequent requests reuse the authenticated `BrowserContext` — no re-login needed
- Each request gets its own `Page` within the shared context
- On `SIGTERM`/`SIGINT`, the browser is gracefully shut down

## Scalability Considerations

- **Multiple SaaS providers**: Add new `FormConfig` + `PlaywrightXxxAutomation` adapter. Register in container. Zero changes to use cases.
- **
-based execution**: Wrap `UseCase.execute()` in a BullMQ job processor. Use cases are already async and stateless.
- **Browser pooling**: `BrowserManager` tracks active contexts. Extend with a semaphore for concurrency limits.
- **Scheduled automations**: Add `node-cron` or Bull scheduler calling use cases directly (bypass HTTP).
- **Session reuse**: `BrowserManager.createAuthenticatedSession()` already reuses the authenticated context.

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js 5
- **Language**: TypeScript 6
- **Browser Automation**: Playwright 1.61
- **Validation**: Zod
- **DI Container**: Awilix
- **Logging**: Pino
- **Testing**: Jest + ts-jest
