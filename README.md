# Playwright Automation Service

A production-grade Express.js REST API service that automates user interactions with third-party SaaS web applications using Playwright.

## Overview

This service exposes HTTP endpoints that, when called, launch or reuse a Playwright browser session to perform automated actions on a target SaaS application:

- Logging into the application
- Navigating through pages
- Filling claim management forms
- Searching for products from an order list page
- Validating product information
- Extracting data from the UI
- Returning structured results to the API caller

### Layer Responsibilities

| Layer | Directory | Responsibility |
|---|---|---|
| **Routes** | `src/routes/` | Define HTTP method, path, validation middleware, and controller binding |
| **Validation** | `src/validation/` | Zod schema validation middleware — rejects malformed requests with 400 |
| **Controllers** | `src/controllers/` | Thin request handlers — extract data from request, delegate to use case, format response |
| **Use Cases** | `src/application/usecases/` | Application business logic — orchestrate domain services and infrastructure ports |
| **DTOs** | `src/application/dto/` | Zod-validated request/response schemas — the API contract |
| **Ports** | `src/application/ports/` + `src/domain/ports/` | Interfaces that decouple application from infrastructure |
| **Domain** | `src/domain/` | Core business entities and value objects — zero external dependencies |
| **Infrastructure** | `src/infrastructure/` | Playwright adapters, browser management, config, logging |
| **Shared** | `src/shared/` | Cross-cutting utilities — `Result` type, error classes, constants |

## Folder Structure

```
src/
├── app/                          # Application bootstrap
│   ├── server.ts                 # Entry point, graceful shutdown
│   ├── express.ts                # Express app factory
│   └── container.ts              # Awilix DI container wiring
│
├── shared/                       # Cross-cutting, zero-dependency code
│   ├── Result.ts                 # Result<T,E> discriminated union
│   ├── errors/                   # Custom exception hierarchy
│   │   └── AppError.ts           # Base + 8 typed subclasses
│   └── constants/                # Page paths, timeouts, retry policies
│
├── domain/                       # Inner layer — business entities & ports
│   ├── entities/                 # CustomerClaim, PurchaseOrder, ProductResult, etc.
│   └── ports/                    # IBrowserSession, ILoginAutomation, etc.
│
├── application/                  # Use cases & DTOs — depends only on domain
│   ├── dto/                      # Zod-validated request schemas
│   ├── usecases/                 # CreateClaimUseCase, CreateOrderUseCase, SearchProductsUseCase
│   └── ports/                    # IClaimAutomationPort, IOrderAutomationPort, etc.
│
├── infrastructure/               # Outer layer — Playwright, config, logging
│   ├── config/
│   │   ├── AppConfig.ts          # Typed config from env vars
│   │   └── form/                 # Declarative form definitions
│   ├── logger/
│   │   └── logger.ts             # Pino structured logger
│   └── playwright/
│       ├── BrowserManager.ts     # Browser lifecycle, context pooling, auto-login
│       ├── PlaywrightAutomation.ts # Adapters implementing app ports
│       ├── pages/                # Page Object Model
│       │   ├── BasePage.ts       # Shared navigation/wait/fill helpers
│       │   ├── LoginPage.ts      # Login form interactions
│       │   ├── FormPage.ts       # Generic data-driven form filler
│       │   └── OrderListPage.ts  # Search + table extraction
│       ├── selectors/            # Centralized data-testid constants
│       └── utils/                # gotoWithRetry, retry helpers
│
├── controllers/                  # Express request handlers (thin)
├── routes/                       # Route definitions + validation middleware
├── middleware/                    # Error handler, request logger, timeout, API key auth
└── validation/                   # Zod validation middleware factory

tests/
├── unit/                         # Fast, no I/O — pure logic tests
├── integration/                  # Tests with real Express + mocked Playwright
└── playwright/                   # End-to-end tests against a real browser
```

## Design Patterns

| Pattern | Where | Why |
|---|---|---|
| **Clean Architecture** | `domain/` → `application/` → `infrastructure/` | Inner layers never import outer layers. Domain has zero dependencies. |
| **Dependency Injection** | `app/container.ts` (Awilix) | All wiring in one place. Use cases receive interfaces, never construct dependencies. |
| **Page Object Model (POM)** | `infrastructure/playwright/pages/` | Each SaaS page is a class. Selectors centralized. No raw `page.fill()` in workflows. |
| **Adapter Pattern** | `PlaywrightAutomation.ts` implements ports | Application layer depends on ports, not Playwright. Swap engines without touching use cases. |
| **Strategy Pattern** | `FormConfig` declarative definitions | Same `FormPage` class fills any form. New form = new config, not new code. |
| **Result Monad** | `shared/Result.ts` | Forces explicit success/failure handling. No uncaught exceptions from use cases. |
| **Factory** | `createApp()`, `buildContainer()`, route factories | Construction logic isolated and testable. |
| **Middleware Chain** | `middleware/` | Validation → auth → timeout → handler → error handler. Composable concerns. |

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
| 401 | `AUTHENTICATION_ERROR` | Missing or invalid API key |
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

All configuration is loaded from environment variables via `src/infrastructure/config/AppConfig.ts`.

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
| `API_KEY` | *(none)* | Optional API key for authentication |

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
| **Shared** | Unit | Jest | `Result` type, error classes, constants |
| **Domain** | Unit | Jest | Entity creation, value object validation |
| **Application** | Unit | Jest | Use case logic with mocked ports |
| **Validation** | Unit | Jest | Zod schema validation (valid/invalid inputs) |
| **Controllers** | Integration | Jest + supertest | HTTP status codes, response shapes, error handling |
| **Infrastructure** | Integration | Jest + mocked Playwright | BrowserManager lifecycle, page object interactions |
| **End-to-End** | Playwright | Playwright Test | Full workflow against a real browser and SaaS app |

## Browser Session Management

- The browser is launched once and kept alive for the lifetime of the process
- The first authenticated request performs login; the session (cookies, localStorage) is cached
- Subsequent requests reuse the authenticated `BrowserContext` — no re-login needed
- Each request gets its own `Page` within the shared context
- On `SIGTERM`/`SIGINT`, the browser is gracefully shut down

## Scalability Considerations

- **Multiple SaaS providers**: Add new `FormConfig` + `PlaywrightXxxAutomation` adapter. Register in container. Zero changes to use cases.
- **Queue-based execution**: Wrap `UseCase.execute()` in a BullMQ job processor. Use cases are already async and stateless.
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
