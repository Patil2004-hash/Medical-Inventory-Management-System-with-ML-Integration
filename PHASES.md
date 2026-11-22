# MIMS Phase Delivery PRD

## Phase 1: Core Operations

**Goal:** Deliver a usable pharmacy operations core.

**Includes:**
- React/Vite client shell.
- Express API and health endpoint.
- JWT demo authentication boundary.
- Medicine register and search.
- Suppliers, customers, purchases, and sales registers.
- Dashboard metrics and low-stock visibility.
- Purchase line items and receiving contract.
- Sale stock validation and inventory movement.
- Stock adjustment audit contract.
- Demo fallback when MongoDB is unavailable.

**Acceptance criteria:**
- Client production build succeeds.
- API syntax check succeeds.
- Unauthenticated business reads are rejected.
- Authenticated demo login works.
- Sales decrement stock and reject insufficient stock.
- Receiving increases stock once.
- Adjustments record an audit event.

## Phase 2: Inventory Governance

**Goal:** Make inventory and access controls production-ready.

**Includes:** immutable medicine batches, full audit history, user administration UI, server validation schemas, transaction-safe stock mutations, notifications, and stronger deployment configuration.

**Implemented slice:** centralized mutation validation, immutable in-process audit events for stock adjustments, sales, purchase creation, and purchase receiving; administrator-only audit access; administrator-only team status management; self-suspension protection; idempotent receiving validation.

**Current acceptance evidence:** `server/governance.test.mjs` validates invalid sales, audit visibility, and administrator self-suspension protection. Existing Phase 1 tests remain the regression baseline.

**Phase 2 status:** Complete for the current demo-first release. Batch metadata, mutation validation, audit events, notifications contracts, deployment templates, and administrator governance UI are implemented and validated.

## Phase 3: Intelligence

**Goal:** Add decision support without bypassing the API boundary.

**Includes:** FastAPI demand forecasting, expiry-risk prediction, Gemini assistant, confidence/horizon display, service health, and fallback behavior.

**Implemented slice:** authenticated demand forecast and expiry-risk API routes, sales-aware Node-to-FastAPI demand signals, an offline-exported medicine catalog, reproducible train/test dataset generation, a loaded Random Forest artifact, local forecast and assistant fallbacks, and a React Intelligence view that labels synthetic demo forecasts.

**Current acceptance evidence:** `server/intelligence.test.mjs` validates protected intelligence routes, forecast fallback output, expiry-risk output, and local assistant behavior.

**Phase 3 status:** Complete for the current release baseline. Node-to-FastAPI forecast communication uses the POST contract, local fallback behavior is covered, and intelligence service health is exposed.

## Phase 4: Experience and Release

**Goal:** Complete the operational product experience.

**Includes:** receipt printing and Bluetooth ESC/POS, reports and exports, 12-theme runtime switcher, responsive polish, observability, deployment documentation, and release checks.

**Next active phase:** Phase 4.

**Phase 4 status:** Complete for the current release baseline. The client now includes 12 runtime themes, reports and text export, browser print, Bluetooth thermal-print attempt with fallback, notifications display, responsive styling, health endpoints, and deployment documentation in `DEPLOYMENT.md`.

## Phase Gate

A phase is complete only when its acceptance criteria pass, the implementation is documented, and the next phase can be added without invalidating existing contracts.
