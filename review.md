# Code Review Report — Playwright Automation Service

**Date:** 2026-08-03  
**Reviewer:** Senior Software Architect (TypeScript / Node.js / Playwright)  
**Project:** `playwright-automation-service` v2.0.0

---

## Executive Summary

This is a **well-architected, production-minded automation service** with many strong fundamentals: Clean Architecture layering, dependency injection via Awilix, the Result monad for explicit error handling, declarative form configuration, a sophisticated retry infrastructure, and multi-platform (multi-tenant) SaaS support. The code shows evidence of thoughtful design decisions throughout.

However, there are **several architectural drift issues** between the README and the actual codebase, **type-safety gaps** that could cause runtime errors, **performance concerns** in the page object implementations, and a **thin test suite** that leaves critical paths uncovered. This report breaks these down by severity.

---

## Severity Legend

| Tag             | Meaning                                                   |
| --------------- | --------------------------------------------------------- |
| 🔴 **Critical** | Will cause runtime failures or data loss                  |
| 🟠 **High**     | Architectural violation, type unsafety, or fragile design |
| 🟡 **Medium**   | Performance, maintainability, or test coverage gap        |
| 🟢 **Low**      | Nitpicks, cosmetic, or nice-to-have                       |

---

## 🔴 Critical Issues

### 1. `CreateClaimUseCase.execute()` return type is a lie

**File:** `src/app/usecases/CreateClaimUseCase.ts:30`

```typescript
async execute(
  platform: string,
  input: ClaimInputDTO
): Promise<Record<string, unknown>> {  // ← declared return
  // ...
  if (!result.success) {
    return Result.fail(new AutomationError(result.error.message));  // ← actual return: Result<T,E>
  }
  return result;  // ← also Result<T,E>
}
```

The method declares `Promise<Record<string, unknown>>` but actually returns `Result<Record<string, unknown>>`. TypeScript compiles this because both satisfy `Record<string, unknown>` at the structural level, but `ClaimController.ts:28` then does:

```typescript
if (!ticketCreationResult.success) { ... }  // success doesn't exist on Record<string, unknown>
```

This **works at runtime by accident** (the `Result` shape happens to have a `success` property), but the type system provides zero protection. If someone refactors the `Result` type, this breaks silently.

**Fix:** Change the return type to `Promise<Result<Record<string, unknown>>>` and update `ClaimController` to properly narrow:

```typescript
async execute(
  platform: string,
  input: ClaimInputDTO
): Promise<Result<Record<string, unknown>>>
```

### 2. `BrowserManager.createAuthenticatedSession()` leaks pages on cache hit

**File:** `src/automation/playwright/BrowserManager.ts:115-119`

```typescript
const existing = this.authenticatedContexts.get(platform);
if (existing) {
  this.logger.debug({ platform }, 'Reusing authenticated browser context');
  const page = await existing.newPage();
  return { context: existing, page }; // No semaphore acquired!
}
```

When a context already exists, the method creates a new `Page` directly without going through `createSession()`, which means:

- The **semaphore is bypassed** — there is no upper bound on the number of concurrent pages within a reused context
- Under load, this can exhaust browser memory since each `Page` consumes ~50–100 MB

**Fix:** Either acquire the semaphore on all paths or implement a separate page-level semaphore within each authenticated context:

```typescript
if (existing) {
  await this.semaphore.acquire(); // Count this page toward the concurrency limit
  // ... but make sure releaseSession releases it for this path too
}
```

Also note that `releaseSession()` currently does **not** release the semaphore for authenticated contexts (it `return`s early at line 156), so pages from reused contexts never decrement the counter even if the semaphore were acquired.

---

## 🟠 High Severity

### 3. Port interface depends on application-layer types (inverted dependency)

**File:** `src/automation/ports/IAutomationPort.ts`

```typescript
import { ProductSearchOutput } from '../../app/usecases/SearchProductsUseCase';
import { ClaimInputDTO } from '../../app/dto';
```

The port interfaces live in `src/automation/ports/` but import from `src/app/`. In Clean Architecture, ports are the boundary — the application layer depends on ports, not the other way around. This creates a circular conceptual dependency: `app/usecases` → `automation/ports` → `app/usecases`.

**Fix:** Move shared types (`ProductSearchOutput`, `ClaimInputDTO`) into `src/shared/types/` or a dedicated `src/core/contracts/` directory. Alternatively, define these types directly in the ports file since they represent the contract between layers.

### 4. Validation middleware bypassed on `/api/:platform/search`

**File:** `src/app/http/routes/search.routes.ts:6`

```typescript
router.post('/', /*validate(searchInputSchema),*/ controller.search);
```

The Zod validation middleware is **commented out**. Any payload — including completely empty or malformed bodies — will pass through to the controller and use case. The `SearchController` accesses `req.body.claimInput` without a guard, which will cause an opaque 500 error.

**Fix:** Uncomment the validation and ensure the `searchInputSchema` matches the expected payload shape, or create the correct wrapper schema:

```typescript
router.post('/', validate(searchInputSchema), controller.search);
```

### 5. Use case and controller disagree on search request shape

**File:** `src/app/http/controllers/SearchController.ts:16` vs `src/app/dto/SearchDTO.ts`

The `SearchDTO` defines:

```typescript
export const searchInputSchema = z.object({
  values: z.array(z.string()).min(1),
});
```

But the controller extracts `req.body.claimInput` which is a `ClaimInputDTO` — not `{ values: string[] }`. These are completely different shapes. The DTO and the actual API contract are misaligned. Even if validation were re-enabled, it would reject valid requests.

**Fix:** Align the DTO with what the endpoint actually expects. If the search endpoint receives a full `ClaimInputDTO`, the schema should validate that:

```typescript
export const searchInputSchema = z.object({
  claimInput: claimInputSchema,
});
```

---

## 🟠 Medium Severity

### 6. `extractProducts()` performs N sequential `textContent` calls per row

**File:** `src/automation/playwright/pages/fakeUI/OrderListPage.ts:87-142`

The comment on line 87 says:

> "avoids N+1 round-trips for large tables"

But the implementation does exactly the opposite — for each row, it makes **11 sequential `page.textContent()` calls** (one per column). With 25 rows and 3 pages, that's 825 round-trips to the browser. Each call is an async IPC message to the Chromium process.

**Fix:** Use `page.$$eval()` to extract all data in a **single browser evaluation**:

```typescript
async extractProducts(): Promise<ProductResult[]> {
  return this.page.$$eval('tr[data-testid^="po-list-row-"]', (rows) => {
    return rows.map((row) => {
      const get = (suffix: string) =>
        row.querySelector(`[data-testid$="-${suffix}"]`)?.textContent?.trim() ?? '';
      return {
        itemCode: get('item-code'),
        productName: get('product'),
        vendor: get('vendor'),
        // ... all fields
        quantityOrdered: Number(get('quantity-ordered')),
        quantityBilled: Number(get('quantity-billed')),
        quantityReceived: Number(get('quantity-received')),
      };
    });
  });
}
```

This reduces 825 round-trips to exactly 1.

### 7. `hasNextPage()` uses fragile button text selector

**File:** `src/automation/playwright/pages/fakeUI/OrderListPage.ts:145-151`

```typescript
const nextBtn = this.page.locator('button[type="button"]', {
  hasText: 'Next',
});
```

This will match **any** button on the page containing "Next" — not just the pagination control. It also breaks if the SaaS app localizes to a non-English language.

**Fix:** Use the project's established pattern of `data-testid` attributes:

```typescript
async hasNextPage(): Promise<boolean> {
  const btn = this.page.locator('[data-testid="po-list-pagination-next"]');
  return (await btn.count()) > 0 && !(await btn.isDisabled());
}
```

### 8. Container registration key mismatches

**File:** `src/app/config/server.ts:54`

The shutdown handler resolves `'browserSession'`:

```typescript
const browserManager = container.resolve<BrowserManager>('browserSession');
```

But in the container, the `BrowserManager` is registered under the name `'browserSession'` (line 96 of `container.ts`), which is the `IBrowserSession` interface name, not the class name. The integration test also uses `'browserSession'`. This is consistent but confusing — the registration key doesn't match the class name. If someone adds a second implementation of `IBrowserSession`, the naming breaks down.

**Fix:** Register with the class name and alias:

```typescript
container.register({
  browserManager: asClass(BrowserManager, { lifetime: 'SINGLETON' }),
});
// And resolve with:
container.resolve<BrowserManager>('browserManager');
```

### 9. Logging `input.customer` as `orderCode`

**File:** `src/app/usecases/CreateClaimUseCase.ts:35`

```typescript
this.logger.info(
  { platform, orderCode: input.customer }, // ← logs entire customer object
  'CreateClaimUseCase: starting'
);
```

The key is named `orderCode` but the value is `input.customer` (the entire customer object). This is misleading in log searches.

**Fix:** Either rename the key or log the right value:

```typescript
this.logger.info(
  { platform, customer: input.customer.name },
  'CreateClaimUseCase: starting'
);
```

### 10. Hardcoded `/tmp/` screenshot path (Linux-only)

**File:** `src/automation/playwright/pages/fakeUI/BasePage.ts:61`

```typescript
const path = `/tmp/playwright-screenshots/${name}-${Date.now()}.png`;
```

This hardcodes a Linux filesystem path that doesn't exist on Windows or macOS. In Docker, `/tmp/` is ephemeral and screenshots are lost after container restart.

**Fix:** Use `os.tmpdir()` and make the base path configurable:

```typescript
import os from 'os';
import path from 'path';
const dir =
  process.env.SCREENSHOT_DIR ??
  path.join(os.tmpdir(), 'playwright-screenshots');
```

### 11. `gotoWithRetry` uses same timeout for each attempt

**File:** `src/automation/playwright/utils/retry.ts:22-27`

```typescript
await page.goto(url, {
  timeout: DEFAULT_TIMEOUTS.navigation, // 15_000ms every attempt
  waitUntil: 'domcontentloaded',
});
```

With 3 retries and exponential backoff delays (1s + 2s), the total worst-case time is ~51s, which is close to the `workflow` timeout of 60s. If the retry base delay is increased, this could easily exceed the workflow timeout.

**Fix:** Either shorten navigation timeout on retries or ensure the workflow timeout accounts for worst-case retry duration.

---

## 🟡 Low Severity

### 12. Dead import in SearchController

**File:** `src/app/http/controllers/SearchController.ts:3`

```typescript
import { ClaimInputDTO, SearchInputDTO } from '../../dto';
```

`SearchInputDTO` is imported but never used anywhere in the file.

### 13. Variable name typo: `lostNumber` instead of `lotNumber`

**File:** `src/automation/playwright/pages/fakeUI/OrderListPage.ts:116`

```typescript
const lostNumber = await this.page.textContent(
  `[data-testid="po-list-row-${index}-lot-number"]`
);
```

Should be `lotNumber`. While functionally harmless (it's used correctly later), it's misleading during debugging.

### 14. `getMatchedProduct` parameter casing inconsistency

**File:** `src/automation/playwright/interactions/fakeUI/PlaywrightSearchAutomation.ts:175`

```typescript
private getMatchedProduct(
  products: ProductResult[],
  product: ProductDTO,
  customername: string  // ← lowercase 'n', inconsistent with camelCase
): { found: boolean; product?: ProductDTO }
```

### 15. `OrderListSelectors` defined but not used in `OrderListPage`

**File:** `src/automation/playwright/selectors/orderList.ts`

The selectors file defines constants like `OrderListSelectors.table`, `OrderListSelectors.search`, etc., but `OrderListPage.ts` uses hardcoded string literals (`'[data-testid="po-list-table"]'`) instead of referencing the constants. This defeats the purpose of centralized selectors.

### 16. Docker CMD path mismatch

**File:** `Dockerfile` and `package.json`

`Dockerfile` line 18: `CMD ["npm", "start"]`  
`package.json` line 5: `"main": "dist/app/config/server.js"`  
`package.json` line 7: `"start": "node dist/app/server.js"`

The `"main"` field points to `dist/app/config/server.js` but the `"start"` script runs `dist/app/server.js`. The README also says `"main": "dist/app/config/server.js"`. One of these is wrong — if the build outputs to `dist/app/config/server.js`, the `start` script will fail.

---

## 🟢 Observations & Suggestions

### 17. Test coverage is thin for a "production-grade" service

**Current state:** 3 test files covering:

- `Result` type and `AppError` subclasses (unit)
- `ClaimInputDTO` Zod validation (unit)
- `/api/:platform/claim` integration with mocks

**Untested critical paths:**

- `BrowserManager`: session creation, reuse, release, shutdown
- `FormPage`: field filling, items table, submit with retry
- `OrderListPage`: search, pagination, no-results handling
- `PlaywrightSearchAutomation`: term extraction, matching, classification
- `retry.ts`: exponential backoff, RetryableError discrimination
- `PlaywrightLoginWorkflow`: success/error paths, URL-based detection
- `createApp()` middleware chain: rate limiter, auth, timeout

**Recommendation:** Add focused unit tests for the retry utility (critical infrastructure), the search automation matching logic (pure function, easy to test), and at least one integration test for the search endpoint.

### 18. Dependency freshness

All dependencies are current (Express 5, Playwright 1.61, TypeScript 6, Zod 3.24). The project uses modern versions across the board — excellent.

### 19. What's working well ✅

| Area                       | Notes                                                                                                                                                                                 |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **DI container**           | Clean factory-function pattern for multi-platform resolution. The `asValue()` approach (avoiding `asFunction()`'s parameter-name resolution) is correctly documented and implemented. |
| **Result monad**           | Simple, correct, and used consistently throughout the automation layer.                                                                                                               |
| **Retry infrastructure**   | `RetryableError` class with `isRetryableStatus()` check is a clean pattern — only transient server errors trigger retries, client errors fail fast.                                   |
| **Error hierarchy**        | `AppError` with typed subclasses mapped to HTTP status codes. Clean and extensible.                                                                                                   |
| **Middleware composition** | Order is correct: JSON parse → log → timeout → health (no auth) → rate limit → API key → routes → error handler.                                                                      |
| **Config loading**         | Multi-platform env-var parsing with `SAAS_{NAME}_{PROPERTY}` convention. Redaction function prevents password leakage in logs.                                                        |
| **Graceful shutdown**      | Proper `SIGTERM`/`SIGINT` handling with a 10s forced-exit safety net.                                                                                                                 |
| **Login detection**        | URL-change-based login success detection (not DOM-dependent) is robust against UI changes in the target SaaS.                                                                         |
| **Form submit**            | `Promise.race` between success/error/server-error selectors with HTTP status-aware retry decision is sophisticated and correct.                                                       |
| **Declarative forms**      | `FormConfig` with nested `FieldDescriptor` trees and `ItemsConfig` is a clean Strategy pattern — new forms require only configuration, not code.                                      |

---

## Summary of Recommended Actions

| #   | Severity | File(s)                                       | Action                                                                                       |
| --- | -------- | --------------------------------------------- | -------------------------------------------------------------------------------------------- |
| 1   | 🔴       | `CreateClaimUseCase.ts`, `ClaimController.ts` | Fix return type to `Promise<Result<...>>`                                                    |
| 2   | 🔴       | `BrowserManager.ts`                           | Acquire semaphore on cached-context page creation; release in `releaseSession` for that path |
| 3   | 🟠       | `IAutomationPort.ts`                          | Move shared types out of `app/` to break inverted dependency                                 |
| 4   | 🟠       | `search.routes.ts`                            | Re-enable Zod validation middleware                                                          |
| 5   | 🟠       | `SearchDTO.ts` or `SearchController.ts`       | Align DTO schema with actual request shape (`{ claimInput: ClaimInputDTO }`)                 |
| 6   | 🟠       | `OrderListPage.ts`                            | Replace N sequential `textContent` calls with single `$$eval()`                              |
| 7   | 🟠       | `OrderListPage.ts`                            | Replace fragile `hasText: 'Next'` locator with `data-testid`                                 |
| 8   | 🟡       | `container.ts`, `server.ts`                   | Align container registration key with class name                                             |
| 9   | 🟡       | `CreateClaimUseCase.ts`                       | Fix misleading log key (`orderCode: input.customer`)                                         |
| 10  | 🟡       | `BasePage.ts`                                 | Use `os.tmpdir()` + configurable screenshot directory                                        |
| 15  | 🟡       | `OrderListPage.ts`                            | Use `OrderListSelectors` constants instead of hardcoded strings                              |
| 16  | 🟡       | `Dockerfile`, `package.json`                  | Align `"start"` script with actual build output path                                         |
| 17  | 🟢       | `tests/`                                      | Add unit tests for retry, search matching, and integration test for search endpoint          |

---

_End of report._
