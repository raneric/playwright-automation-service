# Architectural Code Review: Playwright Automation Service

**Date:** 2026-07-16  
**Reviewer:** Senior Software Architect  
**Focus:** Configurable browser automation framework for multi-SaaS onboarding

---

## Executive Summary

This project implements a REST API that drives Playwright-based browser automation against external SaaS applications. The codebase demonstrates solid software engineering fundamentals — hexagonal architecture, dependency injection, structured error handling, and good observability. However, **the framework falls short of its stated goal of onboarding new SaaS applications purely through configuration**. While the `FormPage` is genuinely configuration-driven, the rest of the automation pipeline (login, search, list extraction, navigation, workflow orchestration) requires writing new TypeScript code for each SaaS target.

**Overall assessment:** The architecture is ~30% configuration-driven. The foundation is strong, but significant refactoring is needed to achieve the "configuration, not code" vision.

---

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│  HTTP Layer (Express)                                   │
│  controllers → routes → validation (Zod)                │
├─────────────────────────────────────────────────────────┤
│  Application Layer (Use Cases)                          │
│  CreateClaimUseCase / SearchProductsUseCase             │
├─────────────────────────────────────────────────────────┤
│  Domain Layer                                           │
│  Entities / DTOs / Ports (IAutomationPort, IBrowserSession) │
├─────────────────────────────────────────────────────────┤
│  Infrastructure Layer                                   │
│  BrowserManager / Playwright*Automation / Page Objects  │
└─────────────────────────────────────────────────────────┘
```

The hexagonal (ports & adapters) structure is well-executed. The DI container (`awilix`) correctly inverts dependencies so that use cases depend on port interfaces, not concrete Playwright classes.

---

## 2. What Works Well

### 2.1 Configuration-Driven Form Filling (`FormPage` + `FormConfig`)

The `FormPage` class and its `FormConfig`/`FieldDescriptor` types are the **strongest part of the architecture**. A new SaaS form can be described declaratively:

```typescript
// customerClaim.ts — purely declarative, no code changes needed for new forms
export const customerClaimConfig: FormConfig = {
  prefix: 'cc',
  fields: [
    {
      key: 'request',
      children: [
        { key: 'date_of_request', path: 'request.date_of_request' },
        { key: 'requestor', path: 'request.requestor' },
      ],
    },
    // ...
  ],
  items: {
    addButtonTestId: 'cc-add-item-btn',
    rowFields: [
      /* ... */
    ],
  },
  submitTestId: 'submit-btn',
  successTestId: 'success-message',
};
```

This is exactly the right pattern. The `FormPage.fillNode()` method recursively walks the field tree and resolves dot-path values from the data object — generic, reusable, and SaaS-agnostic.

### 2.2 Multi-Platform Support

`AppConfig` supports multiple SaaS platforms via `SAAS_PLATFORMS=acme,contoso` with per-platform environment variables (`SAAS_ACME_BASE_URL`, `SAAS_CONTOSO_USERNAME`, etc.). The `BrowserManager` maintains one authenticated `BrowserContext` per platform, avoiding redundant logins.

### 2.3 Error Handling & Resilience

- **`Result<T, E>` type** — forces explicit success/failure handling, no unchecked exceptions.
- **`RetryableError` + `isRetryableStatus()`** — the `retry()` utility only retries on transient HTTP status codes (5xx, 429, 408); deterministic failures fail fast.
- **`gotoWithRetry()`** — exponential backoff for navigation flakiness.
- **Error classification hierarchy** — `AppError` → `ValidationError`, `AutomationError`, `NavigationError`, etc., each with appropriate HTTP status codes.

### 2.4 Observability

- Structured logging with `pino` throughout — every automation step, navigation, and error is logged with contextual metadata.
- `redactConfig()` ensures passwords are never logged.
- Screenshot capability in `BasePage` for CI debugging.

### 2.5 Dependency Injection

The `buildContainer()` function in `container.ts` is well-documented and correctly uses `asValue()` for factory functions (avoiding Awilix's `CLASSIC` mode parameter-resolution pitfalls). The per-platform factory pattern (`getClaimAutomation(platformName)`) is a clean approach to multi-tenant automation.

### 2.6 Graceful Shutdown

`server.ts` properly handles `SIGTERM`/`SIGINT` with a 10-second forced-exit timeout, and cleans up the browser instance.

---

## 3. Critical Architectural Gaps

### 3.1 🔴 Port Interfaces Leak Playwright's `Page` Type

**File:** `src/core/ports/IAutomationPort.ts`, `src/core/ports/IBrowserSession.ts`

```typescript
import { Page } from 'playwright';  // ← Infrastructure concern in core layer

export interface IClaimAutomationPort {
  createClaim(page: Page, claimData: Record<string, unknown>): Promise<Result<...>>;
}
```

The core ports import `Page` from `playwright`, making the entire domain/application layer **permanently coupled to Playwright**. If you ever want to support Puppeteer, Selenium, or a pure-HTTP API adapter, you cannot — the port contract demands a Playwright `Page`.

**Recommendation:** Define a framework-agnostic `IAutomationContext` interface in the core layer:

```typescript
// core/ports/IAutomationContext.ts
export interface IAutomationContext {
  navigate(url: string): Promise<void>;
  fill(selector: string, value: string): Promise<void>;
  click(selector: string): Promise<void>;
  textContent(selector: string): Promise<string>;
  waitForSelector(selector: string, state: 'visible' | 'hidden'): Promise<void>;
  // ... minimal surface area
}
```

Then implement a `PlaywrightAutomationContext` adapter in infrastructure. This is the **Adapter pattern** — the core missing piece.

### 3.2 🔴 `OrderListPage` Is Entirely Hardcoded

**File:** `src/infrastructure/playwright/pages/fakeUI/OrderListPage.ts`

While `FormPage` is configuration-driven, `OrderListPage` has every selector, every extraction field, and every interaction hardcoded:

```typescript
// Hardcoded selectors — cannot be reused for another SaaS
async extractProducts(): Promise<ProductResult[]> {
  const rows = await this.page.$$('tr[data-testid^="po-list-row-"]');
  // ...
  const itemCode = await this.page.textContent(
    `[data-testid="po-list-row-${index}-item-code"]`
  );
  const productName = await this.page.textContent(
    `[data-testid="po-list-row-${index}-product"]`
  );
  // ... 4 more hardcoded fields
}
```

There is no `ListConfig` or `TableConfig` equivalent to `FormConfig`. To onboard a new SaaS with a different table structure, you must write a new `OrderListPage` subclass from scratch.

**Recommendation:** Create a `TableConfig` type and a generic `TablePage` (or `ListPage`) class:

```typescript
export interface TableConfig {
  prefix: string; // e.g., "po-list"
  rowSelector: string; // e.g., 'tr[data-testid^="po-list-row-"]'
  searchInputTestId: string;
  searchButtonTestId?: string;
  loadingIndicatorTestId?: string;
  emptyStateTestId?: string;
  nextButtonSelector?: string; // e.g., 'button:has-text("Next")'
  columns: Record<string, string>; // e.g., { itemCode: 'item-code', productName: 'product' }
}
```

### 3.3 🔴 `CreateClaimUseCase.toFormData()` Is SaaS-Specific Business Logic

**File:** `src/core/usecases/CreateClaimUseCase.ts`

```typescript
private toFormData(input: ClaimInputDTO): Record<string, unknown> {
  const firstVendor = input.products[0]?.vendor;
  return {
    request: { date_of_request: input.requestInfo.dateOfRequest, ... },
    vendor: { id: firstVendor?.id ?? 0, name: firstVendor?.name ?? '', ... },
    customer: { ... },
    issues: input.issues,
    items: input.products.map(pl => ({ ... })),
  };
}
```

This mapping from the API DTO to the form's flat `Record<string, unknown>` is **entirely specific to one SaaS's form structure**. If a new SaaS has a different form layout (e.g., no vendor section, or a different field naming convention), you must modify this use case or write a new one.

**Recommendation:** Move the DTO→form-data mapping into the `FormConfig` itself, or into a separate `DataMapper` configuration:

```typescript
export interface FormConfig {
  // ... existing fields ...
  /** Maps the API DTO to the flat form data structure */
  dataMapper?: Record<string, string>; // e.g., { 'request.date_of_request': 'requestInfo.dateOfRequest' }
}
```

Or better, make the use case generic — accept `Record<string, unknown>` and let the API layer handle mapping via a configurable transformer.

### 3.4 🔴 `PlaywrightClaimAutomation` Statically Imports `customerClaimConfig`

**File:** `src/infrastructure/playwright/automation/fakeUI/PlaywrightClaimAutomation.ts`

```typescript
import { customerClaimConfig } from '../../../config/form'; // ← hardcoded import

export class PlaywrightClaimAutomation implements IClaimAutomationPort {
  async createClaim(page: Page, claimData: Record<string, unknown>) {
    const formPage = new FormPage(page, this.logger, customerClaimConfig);
    // ...
  }
}
```

The `FormConfig` is not injected — it's a static import. This means **every platform must use the same form structure**. If "AcmeSaaS" has a different claim form than "ContosoSaaS", you cannot support both without writing separate automation classes.

**Recommendation:** Accept `FormConfig` as a constructor parameter (or resolve it from the `PlatformConfig`):

```typescript
constructor(
  private readonly platform: PlatformConfig,
  private readonly formConfig: FormConfig,  // ← injected
  private readonly logger: Logger
) {}
```

Then register per-platform form configs in the DI container or in `PlatformConfig` itself.

### 3.5 🟡 `PagePath` Is Global, Not Per-Platform

**File:** `src/shared/constants/PagePath.ts`

```typescript
export const PagePath = {
  login: '/login',
  purchaseOrderList: '/purchase-orders',
  customerClaim: '/customer-claim',
} as const;
```

URL paths are global constants. Different SaaS applications will have different URL structures (e.g., `/claims` vs `/customer-claim`).

**Recommendation:** Move page paths into `PlatformConfig`:

```typescript
export interface PlatformConfig {
  // ... existing fields ...
  pages: {
    login: string;
    claimForm: string;
    orderList: string;
    // extensible: Record<string, string>
  };
}
```

### 3.6 🟡 `LoginPage` Selectors Are Centralized But Not Configurable

**File:** `src/infrastructure/playwright/selectors/login.ts`

```typescript
export const LoginSelectors = {
  username: 'login-username',
  password: 'login-password',
  submitBtn: 'login-submit-btn',
  error: 'login-error',
} as const;
```

While centralized (good), this is still a hardcoded TypeScript file. A new SaaS with different `data-testid` values requires a code change.

**Recommendation:** Move login selectors into `PlatformConfig`:

```typescript
export interface PlatformConfig {
  // ...
  login: {
    url: string;
    usernameSelector: string;
    passwordSelector: string;
    submitSelector: string;
    errorSelector: string;
    /** How to detect successful login: 'url-change' | 'selector' */
    successDetection: 'url-change' | { selector: string };
  };
}
```

### 3.7 🟡 `BrowserManager` Depends on Concrete `PlaywrightLoginWorkflow`

**File:** `src/infrastructure/playwright/BrowserManager.ts`

```typescript
constructor(
  private readonly config: AppConfig,
  private readonly logger: Logger,
  private readonly getLoginWorkflow: (platform: string) => PlaywrightLoginWorkflow
  //                                                  ^^^^^^^^^^^^^^^^^^^^^^^^
  //                                                  Concrete class, not interface
) {}
```

The `BrowserManager` depends on the concrete `PlaywrightLoginWorkflow` class rather than an `ILoginWorkflow` port. This couples the browser session manager to a specific login implementation.

**Recommendation:** Define an `ILoginWorkflow` port and depend on that:

```typescript
// core/ports/ILoginWorkflow.ts
export interface ILoginWorkflow {
  login(context: IAutomationContext): Promise<void>;
}
```

### 3.8 🔴 No Workflow Orchestration Abstraction

Each automation class (`PlaywrightClaimAutomation`, `PlaywrightSearchAutomation`) hardcodes its workflow sequence:

```typescript
// PlaywrightClaimAutomation.createClaim():
// 1. gotoWithRetry(url)
// 2. formPage.waitForForm()
// 3. formPage.fillFields(data)
// 4. formPage.fillItems(data.items)
// 5. formPage.submit()
```

This is a **Command pattern** waiting to happen. A true configuration-driven framework would define workflows as sequences of steps:

```typescript
export interface WorkflowStep {
  type:
    | 'navigate'
    | 'fill-form'
    | 'fill-items'
    | 'submit'
    | 'search'
    | 'extract-table';
  config: Record<string, unknown>;
}

export interface WorkflowConfig {
  name: string;
  steps: WorkflowStep[];
}
```

Then a generic `WorkflowEngine` executes steps from configuration, with each step type handled by a registered **Strategy**:

```typescript
class WorkflowEngine {
  private strategies = new Map<string, StepStrategy>();

  register(type: string, strategy: StepStrategy): void { ... }

  async execute(config: WorkflowConfig, context: IAutomationContext, data: unknown): Promise<Result<unknown>> {
    for (const step of config.steps) {
      const strategy = this.strategies.get(step.type);
      const result = await strategy.execute(context, step.config, data);
      // handle result, merge data, etc.
    }
  }
}
```

### 3.9 🟡 No Plugin Discovery / Registration Mechanism

The DI container manually registers every automation class:

```typescript
// container.ts
const getClaimAutomation = (platformName: string): IClaimAutomationPort => {
  const platform = getPlatform(platformName);
  return new PlaywrightClaimAutomation(platform, logger);
};
```

There is no **Plugin pattern** — no way for a new SaaS integration to self-register. Every new SaaS requires editing `container.ts`.

**Recommendation:** Implement a plugin registry where SaaS integrations register themselves:

```typescript
// Each SaaS plugin is a directory with an index.ts that exports:
export const acmePlugin: SaaSAutomationPlugin = {
  name: 'acme',
  formConfigs: { claim: acmeClaimConfig, purchaseOrder: acmePOConfig },
  tableConfigs: { orderList: acmeOrderListConfig },
  loginConfig: {
    /* ... */
  },
  pagePaths: {
    /* ... */
  },
  workflows: {
    /* ... */
  },
};
```

The container would then auto-discover plugins from a `plugins/` directory.

### 3.10 🟡 `BasePage` Mixes `data-testid` and CSS Class Selectors

**File:** `src/infrastructure/playwright/pages/fakeUI/BasePage.ts`

```typescript
async clickByTestId(testId: string): Promise<void> { /* uses [data-testid] */ }
async clickByClass(className: string): Promise<void> { /* uses .className */ }
async clickBySelector(selector: string): Promise<void> { /* raw CSS */ }
```

The `OrderListPage.search()` method uses `clickByClass('po-list-search-btn')` — a CSS class selector — while the rest of the codebase uses `data-testid`. CSS classes are brittle (they change with styling refactors) and violate the convention.

**Recommendation:** Deprecate `clickByClass` and `clickBySelector` from `BasePage`. Enforce `data-testid` as the only selector strategy, and document this as a contract that SaaS applications must fulfill.

---

## 4. Additional Findings

### 4.1 🔴 `fakeUI/` Directory Naming

The entire automation implementation lives under `src/infrastructure/playwright/automation/fakeUI/` and `src/infrastructure/playwright/pages/fakeUI/`. The name `fakeUI` suggests this is test-only or temporary scaffolding, but it is the **production implementation**. This is misleading to new contributors.

**Recommendation:** Rename to something like `saas/` or `generic/`, or remove the subdirectory entirely and place files directly under `automation/` and `pages/`.

### 4.2 🟡 `SearchController` Error Handling Inconsistency

**File:** `src/infrastructure/http/controllers/SearchController.ts` vs `ClaimController.ts`

```typescript
// ClaimController — safe cast
message: (result.error as Error).message,

// SearchController — direct access (could crash if error is not Error-shaped)
message: result.error.message,
```

The `Result` type allows `E` to be anything. `SearchController` assumes `.message` exists, which will crash if the error is a string or custom object.

### 4.3 🟡 `validation.test.ts` Imports from `playwright/test`

**File:** `tests/unit/validation.test.ts`

```typescript
import { expect } from 'playwright/test'; // ← wrong test runner
```

A unit test for Zod validation should not depend on Playwright's test runner. This should use Jest's `expect` (or `@jest/globals`).

### 4.4 🟢 Empty `FakeUISaas.ts`

**File:** `src/shared/types/FakeUISaas.ts` — exists but is empty. Either populate it with shared SaaS type definitions or remove it.

### 4.5 🟡 `tsconfig.json` Uses `"module": "commonjs"`

The project targets ES2022 but outputs CommonJS. For a Node.js service in 2026, ESM (`"module": "nodenext"` or `"module": "ES2022"`) would be more appropriate and enable tree-shaking, top-level await, and better alignment with the ecosystem.

### 4.6 🟢 Good: `Dockerfile` Runs as Non-Root

```dockerfile
USER pwuser
```

This is a security best practice that many projects overlook.

### 4.7 🟡 Missing: No Input Sanitization Before Form Filling

The `FormPage.fillNode()` method directly passes values to `page.fill()`:

```typescript
await this.page.fill(sel, String(value ?? ''));
```

If the data contains special characters or is extremely long, this could cause issues. Consider adding value sanitization/truncation in the `FormConfig` (e.g., `maxLength`, `pattern`).

---

## 5. Pattern Compliance Matrix

| Pattern                  | Status     | Notes                                                                                                |
| ------------------------ | ---------- | ---------------------------------------------------------------------------------------------------- |
| **Strategy**             | ⚠️ Partial | `FormPage` uses config-driven strategy for form filling. No equivalent for tables, search, or login. |
| **Adapter**              | ❌ Missing | Ports expose Playwright `Page` directly. No `IAutomationContext` adapter.                            |
| **Factory**              | ✅ Present | Per-platform factory functions in DI container.                                                      |
| **Command**              | ❌ Missing | Workflows are hardcoded sequences, not configurable command chains.                                  |
| **Plugin**               | ❌ Missing | No self-registration mechanism for new SaaS integrations.                                            |
| **Template Method**      | ⚠️ Partial | `BasePage` provides template methods, but subclasses override with hardcoded logic.                  |
| **Dependency Injection** | ✅ Strong  | Awilix container with proper lifetime scoping.                                                       |

---

## 6. Recommendations — Prioritized Roadmap

### Phase 1: Decouple Playwright from Core (High Impact, Medium Effort)

1. **Introduce `IAutomationContext`** — a framework-agnostic interface in `core/ports/`. Implement `PlaywrightAutomationContext` in infrastructure.
2. **Update all ports** (`IAutomationPort`, `IBrowserSession`, `ILoginWorkflow`) to use `IAutomationContext` instead of Playwright's `Page`.
3. **Define `ILoginWorkflow` port** and have `BrowserManager` depend on it instead of the concrete `PlaywrightLoginWorkflow`.

### Phase 2: Make List/Table Extraction Configuration-Driven (High Impact, Medium Effort)

4. **Create `TableConfig` type** (analogous to `FormConfig`) with column definitions, row selectors, pagination selectors.
5. **Create generic `TablePage`** that reads `TableConfig` and performs extraction without hardcoded selectors.
6. **Migrate `OrderListPage`** to use `TablePage` with a `customerClaimTableConfig`.

### Phase 3: Configuration-Driven Workflows (High Impact, High Effort)

7. **Define `WorkflowStep` and `WorkflowConfig` types** for declarative workflow definitions.
8. **Implement `WorkflowEngine`** with a Strategy registry for step types (`navigate`, `fill-form`, `submit`, `search`, `extract-table`, `paginate`).
9. **Replace `PlaywrightClaimAutomation` and `PlaywrightSearchAutomation`** with a single generic `WorkflowAutomation` class that executes configured workflows.

### Phase 4: Plugin Architecture (Medium Impact, Medium Effort)

10. **Define `SaaSAutomationPlugin` interface** with form configs, table configs, login config, page paths, and workflows.
11. **Implement plugin discovery** — scan a `plugins/` directory or accept a plugin registry in configuration.
12. **Remove hardcoded per-platform factories** from `container.ts`.

### Phase 5: Cleanup & Hardening (Low Impact, Low Effort)

13. **Rename `fakeUI/` directories** to `saas/` or remove the nesting.
14. **Move `PagePath` into `PlatformConfig`** as `platform.pages`.
15. **Move `LoginSelectors` into `PlatformConfig`** as `platform.login`.
16. **Inject `FormConfig`** into `PlaywrightClaimAutomation` instead of statically importing it.
17. **Fix `SearchController` error handling** to safely cast `result.error`.
18. **Fix `validation.test.ts`** to use Jest's `expect`, not Playwright's.
19. **Remove or populate** `src/shared/types/FakeUISaas.ts`.
20. **Deprecate `clickByClass`/`clickBySelector`** from `BasePage`.

---

## 7. Target Architecture (North Star)

```
┌──────────────────────────────────────────────────────────────────┐
│                        HTTP API Layer                             │
│  Generic controllers → Zod validation → WorkflowEngine           │
├──────────────────────────────────────────────────────────────────┤
│                     Application Layer                             │
│  GenericWorkflowUseCase (platform, workflowName, data) → Result   │
├──────────────────────────────────────────────────────────────────┤
│                       Domain Layer                                │
│  Ports: IAutomationContext, IWorkflowEngine, IPluginRegistry      │
│  Entities: WorkflowConfig, StepConfig, TableConfig, FormConfig    │
├──────────────────────────────────────────────────────────────────┤
│                    Infrastructure Layer                           │
│  ┌─────────────────────┐  ┌──────────────────────────────────┐   │
│  │ PlaywrightAdapter   │  │ Plugin Registry                   │   │
│  │ (implements         │  │ ┌──────────────────────────────┐ │   │
│  │  IAutomationContext)│  │ │ acme/plugin.ts               │ │   │
│  └─────────────────────┘  │ │  ├─ formConfigs: { claim, po }│ │   │
│                           │ │  ├─ tableConfigs: { orders }  │ │   │
│  ┌─────────────────────┐  │ │  ├─ loginConfig: { ... }     │ │   │
│  │ WorkflowEngine      │  │ │  └─ workflows: { ... }       │ │   │
│  │  ├─ NavigateStep    │  │ ├──────────────────────────────┤ │   │
│  │  ├─ FillFormStep    │  │ │ contoso/plugin.ts            │ │   │
│  │  ├─ SubmitStep      │  │ │  └─ ...                      │ │   │
│  │  ├─ SearchStep      │  │ └──────────────────────────────┘ │   │
│  │  └─ ExtractTableStep │  └──────────────────────────────────┘   │
│  └─────────────────────┘                                          │
└──────────────────────────────────────────────────────────────────┘
```

In this target architecture, onboarding a new SaaS requires:

1. Creating a plugin directory with JSON/YAML configuration files (no TypeScript required for simple cases)
2. Optionally providing custom step strategies if the SaaS has unique interaction patterns

---

## 8. Summary

| Dimension               | Current                       | Target                          |
| ----------------------- | ----------------------------- | ------------------------------- |
| Form filling            | ✅ Configuration-driven       | ✅ Same                         |
| Table extraction        | ❌ Hardcoded per SaaS         | ✅ `TableConfig`-driven         |
| Login                   | ❌ Hardcoded selectors        | ✅ `PlatformConfig.login`       |
| Navigation URLs         | ❌ Global constants           | ✅ Per-platform in config       |
| Workflow orchestration  | ❌ Hardcoded in classes       | ✅ `WorkflowConfig` steps       |
| DTO→Form mapping        | ❌ Hardcoded in use case      | ✅ Configurable mapper          |
| Plugin discovery        | ❌ Manual DI registration     | ✅ Auto-discovered plugins      |
| Browser engine coupling | ❌ Playwright `Page` in ports | ✅ `IAutomationContext` adapter |

The project has a **solid foundation** with good separation of concerns, error handling, and observability. The `FormPage`/`FormConfig` pattern is the blueprint to follow. The primary gap is that this pattern was not extended to the rest of the automation surface (tables, search, login, workflows). Addressing the prioritized recommendations above will transform this from a "code-per-SaaS" service into a true configuration-driven automation framework.
