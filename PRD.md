# MIMS Backend Product Requirements Document (PRD)

**Product:** Medical Inventory Management System (MIMS) - Server & API Specification  
**Version:** 2.0.0 (Production / Working MongoDB Architecture)  
**Target Backend:** Node.js, Express, MongoDB (Mongoose), JWT, Bcrypt, FastAPI ML Integration, Gemini AI  
**Author:** MIMS Architecture Team  

---

## 1. System Vision & Architecture

The Medical Inventory Management System (MIMS) backend server is a production-grade REST API built using **Node.js**, **Express**, and **MongoDB (via Mongoose)**. It acts as the core business logic, security boundary, persistent data store, and intelligence gateway for the React client.

### Architecture Topology

```text
                                +---------------------------+
                                |  React + Vite Frontend    |
                                +-------------+-------------+
                                              | Axios HTTP / REST (JWT Auth)
                                              v
                                +-------------+-------------+
                                |    Node.js + Express      |
                                |     Backend API           |
                                +------+------+------+------+
                                       |      |      |
                    +------------------+      |      +------------------+
                    |                         |                         |
                    v                         v                         v
       +------------+------------+  +---------+---------+  +------------+------------+
       |   MongoDB Database      |  | FastAPI ML      |  | Google Gemini AI API    |
       |  (Mongoose ORM / URL)   |  | Service (:8000) |  | (Generative REST API)   |
       +-------------------------+  +-------------------+  +-------------------------+
```

---

## 2. Core Operational Outcomes & Security Requirements

1. **Persistent & Dual-Mode Operations**:
   - Supports connection to MongoDB via standard URL string (`MONGO_URI` / `MONGODB_URI`).
   - Automatically seeds default demo dataset (Admin credentials, default medicines, notifications) if collections are empty.
   - Provides seamless in-memory fallback when MongoDB URL is omitted or connection fails.
2. **Server-Side Role-Based Access Control (RBAC)**:
   - Evaluates JWT claims on protected endpoints.
   - Restricts sensitive operations (stock adjustment, purchase creation/receiving, user account suspension) based on assigned user role (`Administrator`, `Pharmacist`, `Staff`).
3. **Atomic Stock & Audit Integrity**:
   - Validates available inventory before confirming sales. Rejects sales if requested stock exceeds current balances.
   - Decrements medicine stock atomically upon sale creation.
   - Increments medicine stock upon purchase receiving and enforces idempotency (prevents double-receiving).
   - Generates immutable audit log entries for all stock-altering actions, sales, purchases, and governance events.
4. **Resilient Intelligence Fallbacks**:
   - Serves local statistical demand forecasting and batch expiry risk calculation if the FastAPI ML service is unreachable.
   - Provides keyword-matched heuristic answers if `GEMINI_API_KEY` is omitted or the Gemini service is unavailable.

---

## 3. Role-Based Access Control (RBAC) Matrix

| Capability / API Endpoint | Administrator | Pharmacist | Staff |
|---|:---:|:---:|:---:|
| `POST /api/auth/login` | Public | Public | Public |
| `GET /api/health` | Public | Public | Public |
| `GET /api/dashboard` | Yes | Yes | Yes |
| `GET /api/medicines` | Yes | Yes | Yes |
| `POST /api/medicines/stock-adjustment` | **Yes** | **Yes** | No |
| `GET /api/medicines/stock-adjustments` | Yes | Yes | Yes |
| `GET /api/sales` | Yes | Yes | Yes |
| `POST /api/sales` | **Yes** | **Yes** | **Yes** |
| `GET /api/purchases` | Yes | Yes | Yes |
| `POST /api/purchases` | **Yes** | **Yes** | No |
| `PATCH /api/purchases/:id/receive` | **Yes** | **Yes** | No |
| `GET /api/team` | **Yes** | No | No |
| `PATCH /api/team/:id/status` | **Yes** | No | No |
| `GET /api/audit-events` | **Yes** | **Yes** | No |
| `GET /api/notifications` | Yes | Yes | Yes |
| `PATCH /api/notifications/:id/read` | Yes | Yes | Yes |
| `GET /api/reports/summary` | Yes | Yes | Yes |
| `GET /api/forecast/*` | Yes | Yes | Yes |
| `POST /api/assistant` | Yes | Yes | Yes |

---

## 4. Database Schema Specifications (MongoDB / Mongoose)

### 4.1. User Schema (`users`)
- `id` (String, Unique Index)
- `name` (String, Required)
- `email` (String, Required, Unique, Lowercase)
- `password` (String, Required - Bcrypt hashed)
- `role` (String, Enum: `['Administrator', 'Pharmacist', 'Staff']`, Default: `'Staff'`)
- `active` (Boolean, Default: `true`)
- `lastActive` (String, Default: `'Just now'`)

### 4.2. Medicine Schema (`medicines`)
- `id` (String, Unique Index)
- `name` (String, Required)
- `category` (String, Required)
- `sku` (String, Required, Unique)
- `stock` (Number, Required, Min: 0)
- `reorderLevel` (Number, Required, Min: 0)
- `unit` (String, Required, e.g., `'tablets'`, `'capsules'`, `'vials'`)
- `price` (Number, Required, Min: 0)
- `expiryDate` (String / ISO Date string)
- `status` (String, Enum: `['In stock', 'Low stock', 'Critical']`)
- `batches`: Array of subdocuments:
  - `batch` (String)
  - `quantity` (Number)
  - `expiryDate` (String)

### 4.3. Sale Schema (`sales`)
- `id` (String, Unique Index)
- `invoiceNumber` (String, Required, Unique, e.g., `'INV-123456'`)
- `customer` (String, Default: `'Walk-in customer'`)
- `total` (Number, Required)
- `items` (Number, Required)
- `lineItems`: Array of subdocuments:
  - `medicineId` (String, Required)
  - `name` (String, Required)
  - `quantity` (Number, Required, Min: 1)
  - `unitPrice` (Number, Required)
- `createdAt` (Date String / ISO)

### 4.4. Purchase Schema (`purchases`)
- `id` (String, Unique Index)
- `purchaseNumber` (String, Required, Unique, e.g., `'PO-123456'`)
- `supplier` (String, Required)
- `total` (Number, Required)
- `items` (Number, Required)
- `lineItems`: Array of subdocuments:
  - `medicineId` (String, Required)
  - `name` (String, Required)
  - `quantity` (Number, Required, Min: 1)
  - `unitPrice` (Number, Required)
- `status` (String, Enum: `['Pending', 'Received']`, Default: `'Pending'`)
- `receivedAt` (String / ISO)
- `createdAt` (String / ISO)

### 4.5. StockAdjustment Schema (`stock_adjustments`)
- `id` (String, Unique Index)
- `medicineId` (String, Required)
- `medicineName` (String, Required)
- `delta` (Number, Required - positive or negative)
- `reason` (String, Required)
- `resultingStock` (Number, Required)
- `adjustedBy` (String, Required - User ID)
- `createdAt` (String / ISO)

### 4.6. AuditEvent Schema (`audit_events`)
- `id` (String, Unique Index)
- `type` (String, Required, e.g., `'sale.created'`, `'purchase.received'`, `'stock.adjusted'`, `'user.status_changed'`)
- `entity` (String, Required, e.g., `'medicine'`, `'sale'`, `'purchase'`, `'user'`)
- `entityId` (String, Required)
- `details` (Object/Mixed)
- `userId` (String, Required)
- `createdAt` (String / ISO)

### 4.7. Notification Schema (`notifications`)
- `id` (String, Unique Index)
- `title` (String, Required)
- `message` (String, Required)
- `type` (String, Default: `'info'`)
- `read` (Boolean, Default: `false`)
- `createdAt` (String / ISO)

---

## 5. API Endpoints Specification

### 5.1. Auth & System Health
- **`GET /api/health`**
  - **Auth:** None
  - **Returns:** `{ status: 'ok', database: 'mongodb-connected' | 'demo-mode', service: 'mims-api' }`
- **`POST /api/auth/login`**
  - **Auth:** None
  - **Body:** `{ email: string, password: string }`
  - **Logic:** Compares hashed bcrypt password in MongoDB (or demo fallback credentials). Returns signed JWT token valid for 24h.
  - **Response 200:** `{ token: string, user: { id, name, email, role } }`
  - **Response 401:** `{ message: 'Invalid credentials or user suspended.' }`

### 5.2. Dashboard & Inventory
- **`GET /api/dashboard`**
  - **Auth:** Bearer JWT
  - **Response 200:** `{ metrics: { inventoryValue, revenue, lowStock, expiring }, medicines: [...], sales: [...], alerts: [...] }`
- **`GET /api/medicines?search=query`**
  - **Auth:** Bearer JWT
  - **Response 200:** Array of medicine records filtered by search query. Status computed server-side (`Critical` if stock <= reorderLevel / 2, `Low stock` if stock <= reorderLevel, else `In stock`).
- **`POST /api/medicines/stock-adjustment`**
  - **Auth:** Bearer JWT (`Administrator`, `Pharmacist`)
  - **Body:** `{ name: string, delta: number, reason: string }`
  - **Logic:** Finds medicine by name/id, applies delta, saves adjustment record, creates audit event (`stock.adjusted`).
  - **Response 200:** `{ medicine: {...}, id, delta, reason, resultingStock, adjustedBy, createdAt }`
- **`GET /api/medicines/stock-adjustments`**
  - **Auth:** Bearer JWT
  - **Response 200:** Array of recent stock adjustments (limit 50).

### 5.3. Sales & Billing
- **`GET /api/sales`**
  - **Auth:** Bearer JWT
  - **Response 200:** Array of sales.
- **`POST /api/sales`**
  - **Auth:** Bearer JWT (`Administrator`, `Pharmacist`, `Staff`)
  - **Body:** `{ customer: string, total: number, items: number, lineItems: [{ medicineId, name, quantity, unitPrice }] }`
  - **Logic:** Validates stock sufficiency for all items. Decrements stock atomically. Creates sale record & audit event (`sale.created`).
  - **Response 201:** Created sale object.
  - **Response 400/409:** `{ message: '...' }` if quantity invalid or stock insufficient.

### 5.4. Purchases & Supplier Management
- **`GET /api/purchases`**
  - **Auth:** Bearer JWT
  - **Response 200:** Array of purchase orders.
- **`POST /api/purchases`**
  - **Auth:** Bearer JWT (`Administrator`, `Pharmacist`)
  - **Body:** `{ supplier: string, total: number, items: number, lineItems: [{ medicineId, name, quantity, unitPrice }] }`
  - **Logic:** Creates purchase order with `status: 'Pending'`. Logs audit event (`purchase.created`).
  - **Response 201:** Created purchase object.
- **`PATCH /api/purchases/:id/receive`**
  - **Auth:** Bearer JWT (`Administrator`, `Pharmacist`)
  - **Logic:** Validates purchase existence. Idempotency check: if `status === 'Received'`, returns `{ purchase, alreadyReceived: true }`. Otherwise increments inventory stock for line items, sets `status: 'Received'`, records `receivedAt`, logs audit event (`purchase.received`).
  - **Response 200:** `{ purchase, alreadyReceived: boolean }`

### 5.5. Team & Governance
- **`GET /api/team`**
  - **Auth:** Bearer JWT (`Administrator` only)
  - **Response 200:** Array of team members.
- **`PATCH /api/team/:id/status`**
  - **Auth:** Bearer JWT (`Administrator` only)
  - **Body:** `{ active: boolean }`
  - **Logic:** Guards against self-suspension (`req.user.id === targetId`). Updates `active` flag in MongoDB/store. Logs audit event (`user.status_changed`).
  - **Response 200:** Updated user object.

### 5.6. Audit Events & Notifications
- **`GET /api/audit-events`**
  - **Auth:** Bearer JWT (`Administrator`, `Pharmacist`)
  - **Response 200:** Array of recent audit events (limit 100).
- **`GET /api/notifications`**
  - **Auth:** Bearer JWT
  - **Response 200:** Array of notification objects.
- **`PATCH /api/notifications/:id/read`**
  - **Auth:** Bearer JWT
  - **Response 200:** Updated notification object with `read: true`.

### 5.7. Analytics, Forecasting & Intelligence
- **`GET /api/reports/summary`**
  - **Auth:** Bearer JWT
  - **Response 200:** `{ inventoryUnits, inventoryValue, salesCount, revenue, lowStock: [...] }`
- **`GET /api/forecast/demand`**
  - **Auth:** Bearer JWT
  - **Logic:** Calls `ML_SERVICE_URL/forecast/demand` if set; defaults to internal planning algorithm.
- **`GET /api/forecast/expiry`**
  - **Auth:** Bearer JWT
  - **Logic:** Calculates batch-level days until expiry and risk status (`Critical`, `Watch`, `Low`).
- **`GET /api/intelligence/health`**
  - **Auth:** Bearer JWT
  - **Response 200:** `{ ml: 'connected' | 'unavailable' | 'fallback', gemini: 'configured' | 'fallback' }`
- **`POST /api/assistant`**
  - **Auth:** Bearer JWT
  - **Body:** `{ prompt: string }`
  - **Logic:** Uses `GEMINI_API_KEY` via REST call to Google Gemini API. Falls back to local domain assistant.

---

## 6. Environment Configurations

| Environment Variable | Description | Default Value / Example | Required |
|---|---|---|:---:|
| `PORT` | HTTP Listening Port for Express API | `5000` | No |
| `MONGO_URI` / `MONGODB_URI` | MongoDB Connection URL | Atlas URL
| `JWT_SECRET` | Secret key for signing and verifying JWT tokens | `mims-development-secret` | Recommended in Production |
| `ML_SERVICE_URL` | Base URL for Python FastAPI ML microservice | `http://localhost:8000` | Optional |
| `GEMINI_API_KEY` | Google Gemini API Key | `AIzaSy...` | Optional |

---

## 7. Verification & Acceptance Criteria

1. **MongoDB Integration:** When `MONGO_URI` is supplied, server connects to MongoDB, creates collections, seeds default documents if empty, and performs all CRUD operations on MongoDB models.
2. **Server Security & RBAC:** Unauthenticated requests receive HTTP `401 Unauthorized`. Non-admin access to team management returns `403 Forbidden`.
3. **Inventory Operations:** Stock adjustments, sales stock deductions, purchase creations, and idempotent purchase receiving operate atomically with audit logging.
4. **Automated Testing Pass:** All automated unit & integration tests run via `npm test` and pass cleanly with zero errors.
