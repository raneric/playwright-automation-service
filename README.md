# Playwright Automation Service

A production-grade Express.js REST API service that automates user interactions with third-party SaaS web applications using Playwright.

## Overview

This service exposes HTTP endpoints that, when called, launch or reuse a Playwright browser session to perform automated actions on a target SaaS application:

- Logging into the application
- Navigating through pages
- Filling forms
- Searching data
- Validating information
- Extracting data from the UI
- Returning structured results to the API caller

### Layer Responsibilities

| Layer           | Directory                   | Responsibility                                                                           |
| --------------- | --------------------------- | ---------------------------------------------------------------------------------------- |
| **Routes**      | `src/app/http/routes/`      | Define HTTP method, path, validation middleware, and controller binding                  |
| **Validation**  | `src/app/http/validation/`  | Zod schema validation middleware — rejects malformed requests with 400                   |
| **Controllers** | `src/app/http/controllers/` | Thin request handlers — extract data from request, delegate to use case, format response |
| **Middleware**  | `src/app/http/middleware/`  | Error handler, request logger, timeout, bearer token auth, rate limiter                  |
| **Use Cases**   | `src/app/usecases/`         | Application business logic — orchestrate domain services and automation ports            |
| **DTOs**        | `src/app/dto/`              | Zod-validated request/response schemas — the API contract                                |
| **Ports**       | `src/shared/ports/`         | Interfaces that decouple use cases from Playwright adapters                              |
| **Automation**  | `src/automation/`           | Playwright adapters, browser management, page objects, interactions, config, DB search   |
| **App Config**  | `src/app/config/`           | Express app factory, DI container, HTTP layer, server bootstrap, app-level config        |
| **Shared**      | `src/shared/`               | Cross-cutting — `Result` type, error classes, constants, types, logger, ports, helpers   |

## Folder Structure

```
src/
├── app/                                    # Application bootstrap, HTTP layer, use cases, DTOs
│   ├── config/
│   │   ├── server.ts                       # Entry point, graceful shutdown
│   │   ├── express.ts                      # Express app factory (middleware chain, route mounting)
│   │   ├── container.ts                    # Awilix DI container wiring (per-platform factories)
│   │   └── AppCofing.ts                    # App-level config (port, log level, auth token)
│   ├── http/
│   │   ├── controllers/                    # Express request handlers (thin)
│   │   │   ├── ClaimController.ts
│   │   │   └── SearchController.ts
│   │   ├── routes/                         # Route definitions + validation middleware
│   │   │   ├── claim.routes.ts             # POST /api/:platform/claim
│   │   │   ├── search.routes.ts            # POST /api/:platform/search
│   │   │   └── health.routes.ts            # GET /health
│   │   ├── middleware/                     # Error handler, request logger, timeout, bearer auth, rate limiter
│   │   └── validation/                     # Zod validation middleware factory (validate())
│   ├── dto/                                # Zod-validated request/response schemas — the API contract
│   │   ├── ClaimDTO.ts                     # ClaimInputDTO + ProductDTO
│   │   ├── OrderDTO.ts                     # OrderInputDTO
│   │   └── SearchDTO.ts                    # SearchInputDTO (wraps ClaimInputDTO)
│   └── usecases/                           # Application business logic
│       ├── CreateClaimUseCase.ts           # Orchestrates claim creation workflow
│       └── SearchProductsUseCase.ts        # Orchestrates product search workflow
│
├── shared/                                 # Cross-cutting, zero-dependency code
│   ├── types/
│   │   ├── Result.ts                       # Result<T,E> discriminated union
│   │   └── FakeUISaas.ts                   # ProductResult, SearchTerm, TicketSubmissionResult, etc.
│   ├── errors/
│   │   └── AppError.ts                     # Base error + 10 typed subclasses (Validation, Auth, Timeout, etc.)
│   ├── constants/
│   │   ├── PagePath.ts                     # SaaS page route constants
│   │   └── timeouts.ts                     # DEFAULT_TIMEOUTS + RETRY_POLICY
│   ├── logger/
│   │   └── logger.ts                       # Pino structured logger factory
│   ├── ports/                              # Interfaces decoupling use cases from adapters
│   │   ├── IAutomationPort.ts              # IClaimAutomationPort, ISearchAutomationPort
│   │   └── IBrowserSession.ts              # IBrowserSession (createSession, createAuthenticatedSession, etc.)
│   └── helperFunctions/
│       └── envHelper.ts                    # Typed env var parsers (envStr, envInt, envBool)
│
└── automation/                             # Playwright adapters, browser management, config, DB search
    ├── playwright/
    │   ├── BrowserManager.ts               # Browser lifecycle, context pooling, auto-login, semaphore
    │   ├── config/
    │   │   ├── PlaywrightConfig.ts          # Multi-platform config loader (SAAS_PLATFORMS, browser, network)
    │   │   └── form/                        # Declarative form definitions
    │   │       ├── types.ts                 # FormConfig, FieldDescriptor, ItemsConfig types
    │   │       └── customerClaim.ts         # Customer claim form config (cc-* data-testid tree)
    │   ├── interactions/                    # Workflow orchestrators implementing ports
    │   │   └── fakeUI/                      # Per-SaaS-app interaction adapters
    │   │       ├── PlaywrightLoginWorkflow.ts
    │   │       ├── PlaywrightClaimAutomation.ts
    │   │       └── PlaywrightSearchAutomation.ts
    │   ├── pages/                           # Page Object Model (POM)
    │   │   └── fakeUI/                      # Per-SaaS-app page objects
    │   │       ├── BasePage.ts              # Shared navigation/wait/fill/click helpers
    │   │       ├── LoginPage.ts             # Login form interactions
    │   │       ├── FormPage.ts              # Generic data-driven form filler (FormConfig)
    │   │       └── OrderListPage.ts         # Search + table extraction + pagination
    │   ├── selectors/                       # Centralized data-testid constants
    │   │   ├── login.ts                     # Login page selectors
    │   │   └── orderList.ts                 # Order list table selectors
    │   └── utils/
    │       ├── retry.ts                     # gotoWithRetry (navigation), retry (exponential backoff)
    │       └── valueCheck.ts               # stringValueProvided helper
    │
    └── dbSearch/                            # Sequelize ORM for local database search
        ├── config/
        │   └── database.ts                  # PostgreSQL connection via Sequelize
        └── models/
            ├── vendor.model.ts              # Vendor (id, name, address, contact)
            ├── customer.model.ts            # Customer (id, organization, department, address, contact)
            ├── purchase-order.model.ts      # PurchaseOrder (document, product, quantities, FK to vendor/customer)
            └── claim.model.ts               # Claim (request_info, customer, products as JSONB)

tests/
├── unit/                                   # Fast, no I/O — pure logic tests
│   ├── shared.test.ts                      # Result type + AppError hierarchy
│   └── validation.test.ts                  # Zod schema validation (valid/invalid inputs)
└── integration/                            # Tests with real Express + mocked Playwright
    └── claim.integration.test.ts           # Full HTTP request/response cycle with mocked automation
```

### Root-level files

| File                       | Purpose                                                        |
| -------------------------- | -------------------------------------------------------------- |
| `package.json`             | Dependencies, scripts, metadata (v2.0.0)                       |
| `tsconfig.json`            | Base TypeScript config (ES2022, strict, source maps)           |
| `tsconfig.build.json`      | Production build config (extends base, emits to `dist/`)       |
| `tsconfig.test.json`       | Test config (extends base, noEmit)                             |
| `jest.config.js`           | Jest config (ts-jest, coverage thresholds)                     |
| `Dockerfile`               | Multi-stage Docker build (deps → build → Playwright runtime)   |
| `compose.yml`              | Docker Compose for local development with debugger             |
| `.env.example`             | Environment variable template                                  |
| `.prettierrc`              | Code formatting config                                         |
| `.github/workflows/ci.yml` | CI pipeline (type check, unit tests, integration tests, build) |
| `.vscode/`                 | VS Code launch config + settings                               |
| `.zed/`                    | Zed editor debug config                                        |

## Design Patterns

| Pattern                     | Where                                                                     | Why                                                                                                    |
| --------------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| **Clean Architecture**      | `app/usecases/` depends on `shared/ports/`                                | Use cases depend on interfaces, not implementations. Ports are owned by the shared layer.              |
| **Dependency Injection**    | `app/config/container.ts` (Awilix)                                        | All wiring in one place. Use cases receive interfaces, never construct dependencies.                   |
| **Page Object Model (POM)** | `automation/playwright/pages/`                                            | Each SaaS page is a class. Selectors centralized. No raw `page.fill()` in workflows.                   |
| **Adapter Pattern**         | `automation/playwright/interactions/` implements `shared/ports/`          | Application layer depends on port interfaces, not Playwright. Swap engines without touching use cases. |
| **Strategy Pattern**        | `FormConfig` declarative definitions                                      | Same `FormPage` class fills any form. New form = new config, not new code.                             |
| **Result Monad**            | `shared/types/Result.ts`                                                  | Forces explicit success/failure handling. No uncaught exceptions from use cases.                       |
| **Factory**                 | `createApp()`, `buildContainer()`, route factories, per-platform adapters | Construction logic isolated and testable. Per-platform factories registered as values.                 |
| **Middleware Chain**        | `app/http/middleware/`                                                    | JSON parse → logging → timeout → health → rate limit → auth → routes → error handler.                  |

## API Endpoints

All automation endpoints are multi-platform: the `:platform` path parameter selects which SaaS instance to target (e.g. `acme`, `contoso`). Platform configuration is loaded from `SAAS_PLATFORMS` and per-platform env vars.

### POST /api/:platform/claim

Create a customer claim in the SaaS application.

**Response (201):**

```json
{
  "success": true,
  "data": {
    "requestInfo": { "dateOfRequest": "2026-01-15", "requestor": "John Doe" },
    "customer": {
      "name": "Acme Corp",
      "organization": "Engineering",
      "...": "..."
    },
    "issues": "Product arrived damaged",
    "products": ["..."],
    "ticketCreationResult": {
      "ticketCreated": true,
      "ticketId": 42,
      "createdAt": "2026-01-15T12:00:00.000Z",
      "error": null
    }
  }
}
```

### POST /api/:platform/search

Search for products on the order list page. Accepts a full claim input — the automation extracts search terms from each product line (order code → lot number → item code → product name priority).

**Response (200):**

```json
{
  "success": true,
  "data": {
    "requestInfo": { "...": "..." },
    "customer": { "...": "..." },
    "issues": "Missing items",
    "products": ["..."],
    "productFromSearch": {
      "allProductsFromSearch": ["..."],
      "matchedProducts": ["..."],
      "unmatchedProducts": [],
      "reconciliationResult": {
        "totalProduct": 1,
        "totalReconciledProduct": 1,
        "success": true
      }
    },
    "searchResult": {
      "totalMatched": 1,
      "totalProduct": 1,
      "success": true,
      "totalNotFound": 0
    }
  }
}
```

### GET /health

Health check endpoint (unauthenticated, no rate limit).

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

| HTTP Status | Code                   | Meaning                                     |
| ----------- | ---------------------- | ------------------------------------------- |
| 400         | `VALIDATION_ERROR`     | Request body failed Zod schema validation   |
| 401         | `AUTHENTICATION_ERROR` | Missing or invalid bearer token             |
| 404         | `NOT_FOUND`            | Resource not found                          |
| 408         | `TIMEOUT`              | Request exceeded the workflow timeout       |
| 409         | `CONFLICT`             | Conflict in the automation workflow         |
| 422         | `AUTOMATION_ERROR`     | The SaaS application rejected the operation |
| 429         | `RATE_LIMIT`           | Rate limit exceeded on the target SaaS      |
| 502         | `UPSTREAM_ERROR`       | The target SaaS is unreachable              |
| 504         | `NAVIGATION_ERROR`     | Page navigation timed out                   |

## Configuration

Configuration is split into two modules:

### App-level config (`src/app/config/AppCofing.ts`)

| Variable     | Default       | Description                                       |
| ------------ | ------------- | ------------------------------------------------- |
| `NODE_ENV`   | `development` | Environment (`development`, `production`)         |
| `PORT`       | `3001`        | HTTP server port                                  |
| `LOG_LEVEL`  | `info`        | Pino log level (`debug`, `info`, `warn`, `error`) |
| `AUTH_TOKEN` | _(none)_      | Bearer token required to call `/api/*` routes     |

### Playwright config (`src/automation/playwright/config/PlaywrightConfig.ts`)

Multi-platform support via `SAAS_PLATFORMS` — a comma-separated list of platform names. Each platform gets its own set of env vars:

| Variable                  | Default                       | Description                                          |
| ------------------------- | ----------------------------- | ---------------------------------------------------- |
| `SAAS_PLATFORMS`          | `default`                     | Comma-separated platform names (e.g. `acme,contoso`) |
| `SAAS_{NAME}_BASE_URL`    | `http://localhost:5173`       | Target SaaS application base URL                     |
| `SAAS_{NAME}_LOGIN_URL`   | `http://localhost:5173/login` | Login page URL                                       |
| `SAAS_{NAME}_USERNAME`    | `admin`                       | SaaS login username                                  |
| `SAAS_{NAME}_PASSWORD`    | `password123`                 | SaaS login password                                  |
| `BROWSER_HEADLESS`        | `false`                       | Run Playwright in headless mode                      |
| `BROWSER_SLOW_MO`         | `0`                           | Slow down Playwright operations (ms)                 |
| `BROWSER_VIEWPORT_WIDTH`  | `1280`                        | Browser viewport width                               |
| `BROWSER_VIEWPORT_HEIGHT` | `720`                         | Browser viewport height                              |
| `BROWSER_MAX_CONTEXTS`    | `5`                           | Max concurrent browser contexts                      |
| `NETWORK_OFFLINE`         | `false`                       | Simulate offline mode                                |
| `NETWORK_DOWNLOAD_KBPS`   | `0`                           | Download speed limit in kbps (0 = unlimited)         |
| `NETWORK_UPLOAD_KBPS`     | `0`                           | Upload speed limit in kbps (0 = unlimited)           |
| `NETWORK_LATENCY_MS`      | `0`                           | Round-trip latency in ms (0 = none)                  |

### Database config (`src/automation/dbSearch/config/database.ts`)

| Variable      | Default      | Description              |
| ------------- | ------------ | ------------------------ |
| `DB_NAME`     | _(required)_ | PostgreSQL database name |
| `DB_USER`     | _(required)_ | Database user            |
| `DB_PASSWORD` | _(required)_ | Database password        |
| `DB_HOST`     | `localhost`  | Database host            |
| `DB_PORT`     | `5432`       | Database port            |

> **Authentication** — All `/api/*` routes require a bearer token when `AUTH_TOKEN` is set:
> `Authorization: Bearer <AUTH_TOKEN>`. When `AUTH_TOKEN` is unset, auth is
> disabled (useful for local development). The `GET /health` endpoint remains
> unauthenticated.

Copy `.env.example` to `.env` and adjust values for your environment.

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js 5
- **Language**: TypeScript 6
- **Browser Automation**: Playwright 1.61
- **Validation**: Zod
- **DI Container**: Awilix
- **ORM**: Sequelize (PostgreSQL)
- **Logging**: Pino
- **Testing**: Jest + ts-jest + supertest
