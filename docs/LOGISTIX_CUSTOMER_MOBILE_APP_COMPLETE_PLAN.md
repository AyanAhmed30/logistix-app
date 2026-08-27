# LOGISTIX CUSTOMER MOBILE APPLICATION — COMPLETE PLANNING & FUTURE ENHANCEMENTS

**Document type:** Product blueprint + implementation roadmap + future vision  
**Apps:** `mega/logistix` (Next.js web ERP) · `mega/logistix-app` (Expo / React Native customer app)  
**Core product decision:** The customer app’s job is **transparent self-service around freight requests** (`lead_inquiries`), not cloning the staff ERP.  
**Pay Now:** Deferred until a payment provider is chosen (none exists in the codebase today).

---

## Table of contents

1. [Executive summary](#1-executive-summary)
2. [How Logistix works today](#2-how-logistix-works-today)
3. [What the mobile app is today](#3-what-the-mobile-app-is-today)
4. [Customer personas](#4-customer-personas)
5. [Customer problems to solve](#5-customer-problems-to-solve)
6. [Complete customer journey](#6-complete-customer-journey)
7. [Experience principles](#7-experience-principles)
8. [Navigation (information architecture)](#8-navigation-information-architecture)
9. [Feature map by phase](#9-feature-map-by-phase)
10. [Home / dashboard strategy](#10-home--dashboard-strategy)
11. [Request (inquiry) flow](#11-request-inquiry-flow)
12. [Quotation flow](#12-quotation-flow)
13. [Orders, tracking & warehouse](#13-orders-tracking--warehouse)
14. [Documents](#14-documents)
15. [Billing & payments](#15-billing--payments)
16. [Notifications & action center](#16-notifications--action-center)
17. [Support, history & profile](#17-support-history--profile)
18. [Customer-facing status system](#18-customer-facing-status-system)
19. [Web vs mobile responsibilities](#19-web-vs-mobile-responsibilities)
20. [Self-service opportunity map](#20-self-service-opportunity-map)
21. [Realistic customer scenarios](#21-realistic-customer-scenarios)
22. [MVP / V1 / V2 / Future](#22-mvp--v1--v2--future)
23. [Development roadmap & task IDs](#23-development-roadmap--task-ids)
24. [Launch readiness, risks & open questions](#24-launch-readiness-risks--open-questions)
25. [Final product vision](#25-final-product-vision)

---

## 1. Executive summary

Logistix is a **multi-company freight logistics ERP**. Staff run CRM, sales, ops costing/confirmation, accounting, and warehouse on the **web**. Customers today are mostly served via **WhatsApp and PDF**.

The mobile app already has:

- Live phone/password signup and login
- Read-only “My Inquiries” via Supabase RPC (`sent_to_accounting = true`)
- Mock Home / Orders / Tracking screens that look like an ops app (these should not ship as customer product)

**Target product:** A customer companion where a shipper can:

1. Register and link to their Customer ID by phone  
2. See every freight **request** with clear status, next step, and documents  
3. Later submit requests and review quotes  
4. Later see warehouse milestones and invoices  

…without calling or WhatsApping for “any update?”

**MVP for market launch:** Honest customer navigation + identity trust + request list/detail/timeline/docs + real Home + action center + support.  

**Not MVP:** Payment gateway, live GPS maps, staff ops tools, costing calculator, warehouse scan mutation APIs.

---

## 2. How Logistix works today

### Business model

Sales captures cargo **inquiries** (product, weight, CBM, images). Operations costs via calculator and submits confirmation. Admin approves/rejects. Commercial path continues via contacts → quotations / sales orders → accounting invoices / payments. Physical cargo: warehouse books orders/cartons, assigns consoles, QR scans inward / outward / re-inward.

### Three parallel spines (do not present as one funnel to customers)

| Spine | Core entities | Purpose |
|-------|---------------|---------|
| **Freight request** | `leads`, `lead_inquiries`, `inquiry_confirmations`, `inquiry_quotations` | Quote / ops handoff |
| **Commercial** | `contacts`, `quotations`, `accounting_customer_invoices`, payments | Money & sales docs |
| **Warehouse** | `orders`, `cartons`, `carton_scans`, `consoles` | Physical cargo |

**Customer identity hub:** phone + `lead_id_formatted` (shown as **Customer ID**).

### Web application (staff)

- Next.js + custom JWT (`app_users`) + Supabase (service-role server actions)
- Modules: Admin, Contacts, CRM, Sales, Accounting, Operations, Warehouse, Organization partner portal
- **No end-customer login portal** on web
- Organization portal = B2B partner RFQs (not the mobile persona)
- Public `/carton` / `/scan` = warehouse QR; scan **writes** data — must not be reused as customer API
- No payment gateway found in codebase

---

## 3. What the mobile app is today

| Area | Status |
|------|--------|
| Splash / marketing | Live (static) |
| Signup (phone) + wizard | Live → `public.users` |
| Login | Live |
| My Inquiries | Live (read-only portal RPC) |
| Profile | Hybrid (identity live; menus mostly placeholder) |
| Home dashboard | Mock ops KPIs |
| Orders | Mock |
| Tracking | Mock |
| Push notifications | None |
| Create request / quotes / billing | None |

**Portal rule today:** Only inquiries with `sent_to_accounting = true`, matched by phone. Costing and internal approvals are excluded from the RPC.

---

## 4. Customer personas

| Persona | Who | App role |
|---------|-----|----------|
| **Shipper / end customer** | Phone-matched to leads/customers | Primary mobile user |
| **Business contact** | Same person for a company | Same account; company fields later |
| **Partner organization** | Web `/organization` | Stays on web — out of mobile MVP |
| **Staff** | Portal roles | Web only — never customer IA |

---

## 5. Customer problems to solve

1. No visibility after WhatsApp handoff  
2. Unclear status language  
3. Documents scattered in chat  
4. Don’t know the next step / required action  
5. Cost uncertainty until a PDF arrives  
6. “Where is my cargo?” after warehouse starts  
7. Invoice / payment opacity  
8. Mock UI destroys trust  
9. Repeated data entry for similar cargo  

Every feature in this plan must map to at least one of these problems.

---

## 6. Complete customer journey

```
Discover Logistix
  → Register (phone)
  → Auto-link Customer ID by phone
  → Home snapshot
  → View or submit freight request
  → Under review by Logistix
  → Quote ready
  → Accept / contact sales
  → Confirmed → ops & warehouse
  → Milestones & documents
  → Invoice visibility
  → Completed → history
  → Repeat / duplicate request
```

| Phase | Journey coverage |
|-------|------------------|
| **MVP** | Discover → Register → Link → Home → **View** requests → status / timeline / docs → support |
| **V1** | + Submit request + quote view/response + notifications |
| **V2** | + Warehouse milestones + invoice visibility (+ Pay Now after provider choice) |

---

## 7. Experience principles

1. **Simplicity** — customers should not learn internal Logistix jargon  
2. **Transparency** — always answer WHAT / WHY / WHEN / WHO / NEXT / ACTION / COST / DOCUMENT  
3. **Predictability** — next step is always visible  
4. **Minimum data entry** — reuse known profile and past requests  
5. **Error prevention** — validate before submit  
6. **Actionability** — “things you need to do” are obvious  
7. **Trust** — no fake mock operational data in production UI  
8. **Visibility** — important info not buried  
9. **Consistency** — “Request” means the same thing everywhere  
10. **Speed** — common tasks in few steps  

**Hard rule:** Never expose `sent_to_accounting`, calculator keys, journal entries, console phases, or staff usernames as primary UX.

---

## 8. Navigation (information architecture)

### Target tabs (customer, not ops)

| Tab | Purpose | Key screens |
|-----|---------|-------------|
| **Home** | 10-second clarity + actions | Dashboard, action center |
| **Requests** | Core object (freight inquiries) | List, detail, new, quote |
| **Documents** | Stop hunting WhatsApp for files | Hub by request |
| **Account** | Trust & settings | Profile, notifications, support, billing (V2), tracking entry (V2) |

### Remove from customer IA

- Mock ops dashboard KPIs / revenue / fake “Sarah” greeting  
- Mock Orders list  
- Mock Tracking as a primary tab  
- Scan Barcode quick action  
- Ops “command center” copy  

### Naming

- Customer-facing name: **Request** (not Inquiry, Lead, SO, JE)  
- Show `lead_id_formatted` as **Customer ID**

---

## 9. Feature map by phase

| Area | MVP | V1 | V2 | Future |
|------|-----|----|----|--------|
| Auth / profile / password reset | Yes | — | — | 2FA, multi-user |
| Home + Action Center | Yes | — | — | — |
| Request list / detail / timeline / docs | Yes | — | — | — |
| Submit / duplicate request | — | Yes | — | Templates |
| Quotes view / respond | — | Yes | Accept → SO automation | — |
| In-app notifications | Lite | Full | Push | — |
| Documents hub | Lite in detail | Tab | Vault + signed URLs | — |
| Warehouse milestones | — | — | Read-only | ETA / map |
| Invoices | — | — | List / PDF | Pay Now gateway |
| Support | Contact + FAQ | — | Tickets / chat | — |
| History / search | Basic filters | — | Full history | — |

### Never in the customer app

Calculator rates, admin confirmation UI, console assignment, scan mutation, chart of accounts, portal user admin.

---

## 10. Home / dashboard strategy

When the customer opens the app for ~10 seconds, show in this order:

1. **Pending actions** (quote ready, action needed, unpaid invoice later)  
2. **Active requests** count + top 3 cards  
3. **Alerts** (delay / rejection when safe to show)  
4. **Recent activity**  
5. **Quick actions:** New request (V1), Contact support, View documents  

Keep full filters, full timelines, invoice archives, and profile settings **deeper** in the app—not on Home.

---

## 11. Request (inquiry) flow

### Today

Staff creates `lead_inquiries`. Customer sees them only after `sent_to_accounting = true`.

### Target customer experience

| Step | Customer sees | Can do | Notify |
|------|---------------|--------|--------|
| Draft (V1) | Saved draft | Edit / submit | — |
| Submitted | Submitted | Wait | In-app |
| Sent to Logistix | Under review | Wait | In-app |
| Rejected | Action needed + reason | Contact / resubmit | Push + in-app |
| Approved | Confirmed | Wait | In-app |

**V1 submit fields:** product name, quantity, weight and/or CBM, optional description, optional images, optional notes.  
Origin/destination stay out until the schema actually stores them for customers (portal currently returns null placeholders).

---

## 12. Quotation flow

### Today

`inquiry_quotations` and/or sales quotations; WhatsApp/PDF to customer; no in-app accept.

### Target (V1)

- Show only commercial-safe fields: quotation number, product/service, qty, unit price, total, notes, dates  
- Hide rate tables and duty calculator  
- Actions: **Review** → **Accept** (notify sales) / **Decline** / **Contact sales**  
- Default: Accept **notifies staff**; do not silently create a Sales Order until web rules exist  

---

## 13. Orders, tracking & warehouse

### Customer mental model

| Term | Meaning |
|------|---------|
| **Request** | Freight inquiry (cargo + commercial intent) |
| **Confirmed booking** | Approved / quoted path progressing |
| **Shipment** | Warehouse order/carton activity when linkable (V2) |

Do **not** expose warehouse “Book Order” as the customer’s primary create action.

### Tracking

- **High-level (MVP):** status badge + last update on list/Home  
- **Detailed (V2):** read-only milestones from orders / cartons / scans / console loading  
- **Never** call `/api/scan` (it mutates warehouse state)

### Warehouse → customer language

| Internal | Customer-facing |
|----------|-----------------|
| Order created | Shipment registered |
| Inward scan | Cargo received at warehouse |
| Outward scan | Cargo dispatched from warehouse |
| Re-inward | Returned to warehouse |
| Console loading phases | Preparing load / Loading / Load closed |

### Delivery

No rich last-mile module found. Use inquiry `completed` / SO delivery signals when present. Label simply **Completed**.

---

## 14. Documents

| Source | Customer-visible | Phase |
|--------|------------------|-------|
| Inquiry images + `link_url` | Yes | MVP |
| Inquiry / sales quotation PDF | Yes when available | V1 |
| Accounting invoice PDF | Yes | V2 |
| Ops-only / costing attachments | No | — |
| Customer uploads on submit | Yes | V1 |

Documents hub aggregates files across requests. Prefer **signed URLs** later (bucket is public today — launch risk).

---

## 15. Billing & payments

- Staff accounting invoices/payments exist; **no payment gateway** in the repo  
- **V2:** Invoice list (amount, due, payment state in plain language), PDF/view, outstanding total on Home  
- **Pay Now:** After launch, choose provider (bank transfer instructions first, then local gateway)  
- Until then: “Pay via bank / contact accounts”

---

## 16. Notifications & action center

### Notifications

| Event | In-app | Push | Phase |
|-------|--------|------|-------|
| Account linked / first requests | Yes | — | MVP |
| Under review / confirmed / completed | Yes | V1 | MVP–V1 |
| Action needed / quote ready | Yes | Yes | V1 |
| Warehouse milestone | Yes | Yes | V2 |
| Invoice due / paid | Yes | Yes | V2 |

Rule: useful + timely + actionable only.

### Action center (“Things you need to do”)

Fed by: quote ready, action needed, missing docs (V1), unpaid invoices (V2).  
Each row: title + request id + CTA → detail.

---

## 17. Support, history & profile

### Support

- **MVP:** Account → Support (WhatsApp / phone / email) + FAQ (statuses, phone linking)  
- **V2:** Ticket / issue report linked to a request  
- Goal: answer status/docs/cost **before** the customer needs to call  

### History

- Filters: All / Active / Action needed / Completed  
- Search by product / Customer ID / request number (V1)  
- Unified timeline on request detail first; global History in V2  

### Profile

- **MVP:** name, email, phone (read), edit name/email, password reset, logout, support  
- **V1:** company name/notes  
- **Future:** multi-user company accounts  

### Repeat business

- **V1:** Duplicate past request  
- **V2:** Saved cargo templates, company profile  
- Addresses/favorites only when origin/destination exist in data  

---

## 18. Customer-facing status system

| Customer status | Meaning | Typical next | Action? |
|-----------------|---------|--------------|---------|
| **Submitted** | We received cargo details | Logistix review | No |
| **Under review** | Ops reviewing / costing | Confirmation | No |
| **Action needed** | We need something from you | Update / contact | Yes |
| **Quote ready** | Commercial quote available | Review & respond | Yes |
| **Confirmed** | Request confirmed | Fulfillment | No |
| **In progress** | Warehouse / shipment activity | Next milestone | No |
| **Completed** | Finished | View docs / history | Optional |
| **Cancelled** | Closed | Contact support | Optional |

Timeline sources: `created_at`, `sent_at`, `updated_at`, confirmation outcomes, quote sent, warehouse scans (V2), payment posted (V2) — always via **customer-safe RPCs**.

---

## 19. Web vs mobile responsibilities

| Layer | Owns |
|-------|------|
| **Web** | Staff ops, costing, confirmation, sales orders, accounting posting, warehouse control, org partners |
| **Mobile** | Customer identity, visibility, intake, quote response, docs, notifications, later milestones/invoices |
| **Shared** | Same Supabase project; mobile uses **customer-safe RPCs only** (never service-role in the app) |

---

## 20. Self-service opportunity map

| Customer problem | Manual today | Mobile solution | Business benefit |
|------------------|--------------|-----------------|------------------|
| Status check | WhatsApp / call | Status + timeline | Fewer interruptions |
| Find photos / PDFs | Chat scroll | Documents on request | Faster ops |
| Quote decision | WhatsApp PDF | In-app quote | Faster conversion |
| New cargo request | Call sales | Submit request | Cleaner intake |
| Where is cargo | Call warehouse | Milestones | Trust |
| What do I owe | Email accounts | Invoice list | Faster collection |
| Password issues | Staff reset | In-app reset | Lower support load |

---

## 21. Realistic customer scenarios

1. **New customer** — Register → empty or unlinked state → FAQ → wait under review when first request appears  
2. **Existing customer** — Home → “Quote ready” → accept / contact → confirmed  
3. **Tracking (V2)** — Open request → Received → Dispatched milestones  
4. **Warehouse exception** — Action needed + reason → contact support  
5. **Payment (V2)** — Invoice due on Home → view invoice → pay offline / gateway later  
6. **Delay** — Notification → detail explains next expected update  
7. **Repeat** — Duplicate last cargo request → submit  

---

## 22. MVP / V1 / V2 / Future

### MVP — required for market launch

- Honest customer IA (no mock ops data)  
- Auth trust + password reset  
- Real Home + Action Center  
- Requests list + detail + customer status + timeline + documents  
- Support / FAQ  
- Professional empty / loading / error states  

### V1 — important after launch

- Submit / duplicate request  
- Quote view + respond  
- In-app notifications (+ push)  
- Profile edit  
- Documents hub  
- Richer lifecycle timeline  

### V2 — advanced

- Read-only warehouse milestones  
- Invoice visibility  
- Delay alerts  
- Issue reporting  
- Optional Pay Now after provider selection  

### Future — strategic expansion

- Multi-user company accounts  
- Signed document vault  
- GPS / live map (only if data exists)  
- Payment gateway  
- In-app chat / tickets  
- Cargo templates & analytics  
- Accept quote → automated Sales Order  

### Priority labels

| Priority | Features |
|----------|----------|
| **P0** | Kill mocks, request detail + status, Home, auth reset, docs on detail, action center |
| **P1** | Intake, quotes, notifications / push |
| **P2** | Tracking milestones, invoices |
| **P3** | Pay gateway, chat, multi-user |

---

## 23. Development roadmap & task IDs

### Dependency order

```
Foundation (IA / status / API contracts)
  → Identity (auth / reset / profile)
  → Request visibility (detail / timeline / docs)
  → Home + Action Center
  → Notifications
  → Intake (submit request)
  → Quotes
  → Push + launch polish
  → Warehouse milestones + invoices
  → Post-launch (Pay Now, chat, multi-user)
```

### Phases

| Phase | Name | Outcome |
|-------|------|---------|
| 0 | Foundation | IA freeze, status dictionary, API contract |
| 1 | Identity | Session trust, reset, profile, unlinked UX |
| 2 | Request visibility | Detail, status, timeline, filters, docs |
| 3 | Home + Action Center | Real dashboard |
| 4 | Notifications | In-app inbox (+ badge) |
| 5 | Intake | Customer submit + web receive rules |
| 6 | Quotes | Safe quote RPC + UI + respond |
| 7 | Push + polish + launch | Store readiness |
| 8 | Warehouse + billing | Milestones + invoices |
| 9 | Post-launch | Pay Now, chat, multi-user |

### Task checklist (for later implementation)

#### Phase 0

- `MOBILE-CUSTOMER-001` — Freeze customer IA; remove mock tabs from product; rename Inquiries → Requests  
- `MOBILE-CUSTOMER-002` — Finalize customer status dictionary  
- `MOBILE-CUSTOMER-003` — Finalize portal / detail / timeline / quote RPC contracts  

#### Phase 1

- `MOBILE-CUSTOMER-010` — Session expiry messaging + secure session review  
- `MOBILE-CUSTOMER-011` — Auto-login after signup → Home  
- `MOBILE-CUSTOMER-012` — Forgot / reset password (RPC + screens)  
- `MOBILE-CUSTOMER-013` — Unlinked-phone empty state + support CTA  
- `MOBILE-CUSTOMER-014` — Edit profile (name / email)  

#### Phase 2

- `MOBILE-CUSTOMER-020` — Extend portal/detail RPC (customer-safe only)  
- `MOBILE-CUSTOMER-021` — Request detail route / screen  
- `MOBILE-CUSTOMER-022` — Status banner (explanation, next, action)  
- `MOBILE-CUSTOMER-023` — Show description / dates / product facts  
- `MOBILE-CUSTOMER-024` — Documents section on detail  
- `MOBILE-CUSTOMER-025` — Timeline component  
- `MOBILE-CUSTOMER-026` — List filters: Active / Action needed / Completed  

#### Phase 3

- `MOBILE-CUSTOMER-030` — Replace Home mock with portal aggregates  
- `MOBILE-CUSTOMER-031` — Action Center module  
- `MOBILE-CUSTOMER-032` — Quick actions (Requests, Support; New Request after Phase 5)  

#### Phase 4

- `MOBILE-CUSTOMER-040` — `customer_notifications` model + web write hooks  
- `MOBILE-CUSTOMER-041` — Inbox UI  
- `MOBILE-CUSTOMER-042` — Badges on Home / Account  

#### Phase 5

- `MOBILE-CUSTOMER-050` — Web intake rules for customer-originated drafts  
- `MOBILE-CUSTOMER-051` — Mobile submit wizard + image upload  
- `MOBILE-CUSTOMER-052` — Notify staff on submit  
- `MOBILE-CUSTOMER-053` — Duplicate past request  

#### Phase 6

- `MOBILE-CUSTOMER-060` — Safe quote RPC  
- `MOBILE-CUSTOMER-061` — Quote detail UI  
- `MOBILE-CUSTOMER-062` — Accept / Decline → staff notification  

#### Phase 7

- `MOBILE-CUSTOMER-070` — Push provider wiring  
- `MOBILE-CUSTOMER-071` — Push for quote / action / completed  
- `MOBILE-CUSTOMER-072` — Launch checklist (privacy, monitoring, store)  
- `MOBILE-CUSTOMER-073` — Copy audit; purge placeholders  

#### Phase 8

- `MOBILE-CUSTOMER-080` — Read-only milestones RPC (no scan write)  
- `MOBILE-CUSTOMER-081` — Tracking UI on request / account  
- `MOBILE-CUSTOMER-082` — Invoice list safe RPC + UI  

**Definition of done for every task:** customer status language only; loading / empty / error states; linked / unlinked / zero-request cases; no costing leakage; no scan mutation; manual test notes.

---

## 24. Launch readiness, risks & open questions

### Launch checklist

| Item | Level |
|------|-------|
| Auth login / signup | Required |
| Phone ↔ Customer ID linking clarity | Required |
| Request visibility + status transparency | Required |
| No mock operational data in production UI | Required |
| Empty / error states | Required |
| Support contact | Required |
| Password reset | Required |
| Privacy review (public images, RPC auth model) | Required |
| Push notifications | Recommended |
| Create request / quotes | Recommended |
| Pay Now / GPS / chat | Future |

### Risks

- Weak portal auth model (anon key + user id)  
- Public inquiry image bucket  
- Inquiry ↔ warehouse order link may be missing  
- Dual party models (contacts / customers / leads)  
- Staff may not update statuses consistently  
- Scope creep into cloning the web ERP  
- No payment provider chosen  

### Open questions

1. Production support WhatsApp / phone / email  
2. Whether quote Accept may auto-create Sales Order  
3. Exact meaning of “Completed” (inquiry vs SO delivered vs invoice paid)  
4. Payment provider choice  
5. Confirm single shared Supabase project per environment  

**Defaults used in this plan:** visibility-first MVP; Accept notifies staff; Completed = inquiry `completed` until warehouse/SO link matures; Pay Now after provider selection.

### Product-level acceptance criteria

- Customer never sees mock ops KPIs in production builds  
- Can explain status + next step for every visible request without staff help  
- Documents for a request open from the app  
- Unlinked phone is explained, not a blank failure  
- Staff jargon absent from primary UI  

---

## 25. Final product vision

**If a customer installs Logistix after this roadmap is delivered, they should be able to:**

Register with phone → see Customer ID–linked freight **requests** → understand status, next step, and documents → (V1) submit new requests and review quotes → (V2) follow warehouse milestones and invoices → keep history and repeat — **without WhatsApping for status, docs, or “what’s next?”**

### Ideal end-to-end flow (adapted to Logistix)

**Discover → Register → Request → Quote → Approve → Confirmed booking → Warehouse receive/dispatch milestones → Documents → Invoice visibility → Completion → History → Repeat request**

This is **not** a mobile clone of the web ERP.  
It is a **customer-friendly, transparent, self-service logistics companion** centered on the freight request.

---

## Related docs in this repo

- [`docs/CUSTOMER_IA.md`](./CUSTOMER_IA.md) — navigation freeze  
- [`docs/CUSTOMER_STATUS_DICTIONARY.md`](./CUSTOMER_STATUS_DICTIONARY.md) — status mapping  
- [`docs/CUSTOMER_PORTAL_API_CONTRACT.md`](./CUSTOMER_PORTAL_API_CONTRACT.md) — RPC contract  

---

*Last consolidated from the Logistix Customer Mobile App Complete Product Blueprint. Update this file when product decisions change.*
