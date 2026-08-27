# LOGISTIX CUSTOMER MOBILE
# STEP 1 — UI CONTRACT + BUSINESS DATA BLUEPRINT

**Mode:** Analysis only. Zero code / DB / Supabase / UI changes.  
**Apps:** `mega/logistix` (web) · `mega/logistix-app` (mobile)  
**Labels:** **CONFIRMED** = verified in code/SQL · **INFERRED** = strongly implied · **GAP** = UI/business need without backend · **RECOMMENDATION** = next-phase guidance  

**Hard constraint (CONFIRMED):** There is **no Inventory module**. Warehouse ≠ inventory. Do not map inventory mock ideas to real tables.

---

## 1. Executive Summary

Logistix today is a **staff ERP** (web) with a **customer companion** (mobile). The customer’s commercial core is the **freight inquiry** (`lead_inquiries`), not warehouse stock.

| Layer | Reality today |
|-------|----------------|
| Web | Full inquiry → confirmation → (inquiry/sales) quote → accounting invoice; warehouse carton/console ops |
| Mobile live | Auth (`public.users`) + Requests list via `get_customer_portal_by_user_id` (sent inquiries only) |
| Mobile mock | Home, Orders, Tracking, request/order detail, New request, notifications, forgot-password |
| Inventory | **Does not exist** |

**Step 1 freeze:** Keep UI as-is. Real-data work must plug into a **customer-safe service/RPC layer**, reusing portal RPC first, then adding detail/quote/milestones RPCs—without redesigning screens.

**Biggest blockers for full live app:**

1. Request **detail** still reads mock (live list IDs don’t load detail).  
2. No customer-safe **quote** / **submit request** / **notifications** APIs.  
3. **No FK** from warehouse `orders` → leads/contacts (Orders/Tracking cannot be honestly linked yet).  
4. Accounting invoices are **staff-only** (data exists; no customer RPC).  
5. Portal RPC returns `origin` / `destination` / `shipping_mark` as **null placeholders**.

---

## 2. Current System Understanding

### Business spines (CONFIRMED)

```
FREIGHT:  leads/contacts → lead_inquiries → inquiry_confirmations → inquiry_quotations
COMMERCIAL: contacts → quotations (SO) → accounting_customer_invoices → payments
WAREHOUSE:  app_users.username → orders → cartons → carton_scans ↔ consoles
```

These spines meet at **Customer ID** (`lead_id_formatted` / contact ID) for commercial identity, **not** via a guaranteed inquiry→warehouse order link.

### Actual customer journey today (CONFIRMED)

```
Staff creates lead (phone) → staff creates inquiry → staff sends (sent_to_accounting=true)
  → ops calculator + confirmation → admin approve/reject
  → optional inquiry quotation / sales quotation → optional accounting invoice
  → optional warehouse book/scan (separate username-based path)

Mobile customer: register/login by phone → see sent inquiries if phone matches lead/customer
```

Customer does **not** currently create inquiries, accept quotes, or track warehouse cargo in production APIs.

---

## 3. Confirmed Web Capabilities

| Capability | Status | Evidence |
|------------|--------|----------|
| Leads / CRM / Contacts | CONFIRMED | migrations + CRM/Sales modules |
| Inquiry draft/send/versioning | CONFIRMED | `inquiries.ts`, `lead_inquiries` |
| Ops confirmation + admin approve/reject | CONFIRMED | `inquiry_confirmations.ts` |
| Inquiry quotations (staff) | CONFIRMED | `inquiry_quotations` |
| Sales quotations → SO → accounting invoice | CONFIRMED | `quotations`, `accounting_customer_invoices.sales_order_id` |
| Staff accounting AR/AP/GL | CONFIRMED | `/accounting/*` gated |
| Warehouse book order / carton QR / console loading | CONFIRMED | `orders`, `cartons`, `carton_scans`, `consoles` |
| Staff inquiry lifecycle notifications | CONFIRMED | `inquiry_lifecycle_notifications` (roles: sales/ops/admin) |
| Inquiry image storage | CONFIRMED | bucket `inquiry-images` |
| End-customer web portal | **GAP** | Org portal = partner RFQ only |
| Inventory / stock | **DOES NOT EXIST** | only future comments on products |

---

## 4. Confirmed Mobile Capabilities

| Capability | Mode | Notes |
|------------|------|-------|
| Register / login | **LIVE** | `public.users` + bcrypt; SecureStore session |
| Splash / marketing / welcome | LIVE session / static UI | |
| Forgot password | **MOCK** | local demo only |
| Requests list | **HYBRID** | portal RPC; empty → demo mocks |
| Request detail | **MOCK** | live UUID falls back to demo |
| New request | **MOCK** | Alert: demo only |
| Home dashboard | **MOCK** | firstName from session if present |
| Orders list/detail | **MOCK** | |
| Tracking | **MOCK** | |
| Profile | **HYBRID** | identity LIVE; company/Customer ID MOCK |
| Notifications | **MOCK** | |
| Support | Static constants | |

---

## 5. Verified Mobile Screen Inventory

| Screen | Route | Entry | Purpose | Mode |
|--------|-------|-------|---------|------|
| Splash | `/(auth)/splash` | App start | Brand + session gate | LIVE session |
| Marketing home | `/(auth)/home` | Splash (logged out) | Value prop + CTA | MOCK/static |
| Signup phone | `/(auth)/signup` | Marketing | Capture phone | HYBRID (local) |
| Signup wizard | `/(auth)/signup-wizard` | Signup | Create account | LIVE |
| Login | `/(auth)/login` | Marketing | Sign in | LIVE |
| Forgot password | `/(auth)/forgot-password` | Login | Reset UX | MOCK |
| Welcome | `/(auth)/welcome` | (rarely used) | Post-auth intro | LIVE session + static |
| Home | `/(tabs)` | Tabs | Action center + overview | MOCK |
| Requests list | `/(tabs)/inquiries` | Tabs / Home | View freight requests | HYBRID |
| New request | `/(tabs)/inquiries/new` | FAB / Home | Submit request | MOCK |
| Request detail | `/(tabs)/inquiries/[id]` | List / Home | Transparency hub | MOCK |
| Orders list | `/(tabs)/orders` | Tabs | Shipments list | MOCK |
| Order detail | `/(tabs)/orders/[id]` | List / Home | Order summary | MOCK |
| Tracking | `/(tabs)/tracking` | Tabs / Order | Milestones | MOCK |
| Profile | `/(tabs)/profile` | Tabs | Account | HYBRID |
| Notifications | `/(tabs)/profile/notifications` | Profile / Home bell | Inbox | MOCK |
| Support | `/(tabs)/profile/support` | Profile / actions | Contact + FAQ | Static |

**Count (CONFIRMED):** 17 user-facing screens (plus layouts/redirects). Not “11” anymore.

---

## 6. Screen-by-Screen Data Requirements

### Home
- greeting name · Customer ID · company · action items · active requests · recent shipments · notification unread · quick actions  
- **Live today:** firstName (session) only  
- **Rest:** mock / GAP for shipments & actions derived from live data  

### Requests list
- request id · number · product · qty/weight · customer status · next step · lead name/number · filters  
- **Live:** portal inquiries + leads when phone matches and `sent_to_accounting=true`  

### Request detail
- status banner (label, explanation, next, action) · product facts · description · dates · quote total · timeline · documents · support CTA  
- **Live:** GAP (no detail RPC; mock only)  

### New request
- product · quantity · weight · cbm · notes · (images optional later)  
- **Live:** GAP (no submit RPC)  

### Orders / Order detail / Tracking
- reference · origin/destination · status · cartons · weight · CBM · shipping mark · ETA · payment · timeline milestones · progress  
- **Live:** GAP (no customer-safe warehouse RPC; no inquiry↔order link)  

### Profile
- name · phone · email · company · Customer ID · city/country · menus  
- **Live:** name/phone/email; company/Customer ID/city GAP or from lead/contact  

### Notifications
- title · body · time · read · deep link  
- **Live:** GAP (staff-only lifecycle tables)  

### Support
- phone · WhatsApp · email · FAQ — config constants (OK for MVP)  

---

## 7. Complete UI Data Contract (master)

| Screen | UI field | Business meaning | Source today | Table/RPC | DB field | Transform | Req? | Customer-safe? | Gap? |
|--------|----------|------------------|--------------|-----------|----------|-----------|------|----------------|------|
| Auth | phone | Login identity | LIVE | `users` | `phone` | normalize | Y | Y | — |
| Auth | password | Credential | LIVE | `users` | `password_hash` | bcrypt | Y | Y | — |
| Requests | product name | Cargo product | LIVE portal | `lead_inquiries` | `product_name` | trim | Y | Y | — |
| Requests | inquiry number | Version/ref | LIVE | `lead_inquiries` | `version_number` or id slice | coalesce | Y | Y | — |
| Requests | qty / weight / cbm | Cargo facts | LIVE | same | `quantity`,`total_weight`,`cbm` | — | N | Y | — |
| Requests | images / link | Docs | LIVE | same | `image_url`,`additional_image_urls`,`link_url` | — | N | Y | Public bucket risk |
| Requests | status (DB) | Lifecycle | LIVE | same | `status` | map → customer status | Y | Partial | Need approval/quote signals |
| Requests | sent_at | Hand-off time | LIVE | same | `sent_at` | ISO→display | N | Y | — |
| Requests | lead number | Customer ID | LIVE | `leads` | `lead_id_formatted` | — | N | Y | — |
| Requests | shipping_mark / origin / destination | Logistics | RPC returns **null** | — | — | — | N | Y | **GAP** — placeholders in RPC |
| Requests | calculator | Costing | Excluded | — | `calculator_values` | — | — | **NO** | Must stay internal |
| Requests | approval_status | Staff approval | Not in portal | `lead_inquiries` | `approval_status` | map action_needed/confirmed | — | Partial | **GAP** for accurate Actions |
| Detail | full request | Same as list + more | MOCK | — | — | — | Y | — | **GAP** detail RPC |
| Detail | timeline | Events | MOCK | logs/notifs | various | project to customer events | Y | — | **GAP** |
| Detail | quote total | Commercial offer | MOCK | `inquiry_quotations` | `total_amount` | when sent_to_client | N | Y | **GAP** quote RPC |
| New request | form fields | Intake | MOCK | would write `lead_inquiries` | — | — | Y | Y | **GAP** submit API + staff rules |
| Home | actions | Quote/action/pay | MOCK | derived | — | — | Y | Y | **GAP** |
| Home | Customer ID / company | Identity | MOCK | leads/contacts | `lead_id_formatted`, name | — | N | Y | **GAP** enrich portal |
| Orders/* | all fields | Shipment | MOCK | `orders`/`cartons`/scans | — | customer labels | — | Y | **GAP** link + read RPC |
| Tracking | milestones | Warehouse events | MOCK | `carton_scans`, console phases | `scan_type`, etc. | map inward→Received | — | Y | **GAP** + no scan write |
| Tracking | ETA | Promise date | MOCK | — | — | — | N | Y | **GAP** no confirmed ETA field for customers |
| Tracking | map/GPS | Location | MOCK placeholder | — | — | — | N | — | **FUTURE** |
| Invoices | amounts | AR | MOCK on Home action | `accounting_customer_invoices` | amounts, payment_state | plain language | — | Y | **GAP** customer RPC; UI staff-only |
| Notifications | inbox | Events | MOCK | lifecycle tables staff-only | — | new recipient=customer | — | Y | **GAP** |
| Profile | company/city | Business profile | MOCK | contacts/leads | optional | — | N | Y | **GAP** |
| Forgot PW | reset | Security | MOCK | — | — | — | Y | Y | **GAP** real reset |

---

## 8. Mock Data Audit

| Mock field / feature | Screen | Real source? | Available? | Notes |
|----------------------|--------|--------------|------------|-------|
| mockCustomer.customerId | Home/Profile | `leads.lead_id_formatted` / contacts | Via portal lead_number | Enrich profile from portal |
| mockRequests.* | Home/Requests | `lead_inquiries` portal | List YES; detail NO | Demo when empty |
| quoteTotal | Detail/Home | `inquiry_quotations.total_amount` | Not exposed | GAP |
| mockOrders.requestId link | Orders | **No FK** inquiry→order | NO | Fake relationship |
| origin/destination on orders | Orders/Tracking | Warehouse order has destination; not inquiry | Partial | Don’t invent |
| estimatedDelivery | Orders/Tracking | No customer ETA service | NO | GAP / FUTURE |
| paymentStatus/amount on order | Order detail | Accounting invoices | Staff data exists | GAP customer RPC |
| mockShipments events | Tracking | carton_scans / console phases | Possible later | Map carefully; no inventory |
| mockNotifications | Notifications | Staff lifecycle only | NO for customers | GAP |
| mockDocuments names | Detail | image URLs / PDFs | Partial | Images yes; invoice PDF GAP |
| New request submit | New | Would insert inquiry | NO | GAP |
| Forgot password | Auth | — | NO | GAP |
| Inventory quantities | — | — | **N/A** | **FUTURE — not in system** |
| Legacy `mock/dashboard.ts` etc. | unused | — | — | Dead mock files |

---

## 9. Business Entity Map (confirmed)

| Entity | Table(s) | Created by | Updated by | Customer visibility |
|--------|----------|------------|------------|---------------------|
| Mobile user | `public.users` | Customer signup | — | Own account |
| Lead | `leads` | Sales | Sales | Via portal match |
| Contact | `contacts` | Staff | Staff | Indirect (future) |
| Legacy customer | `customers` | Win conversion | Staff | Phone match path in portal |
| Inquiry / Request | `lead_inquiries` | Sales (today) | Sales/Ops/Admin | Sent only |
| Confirmation | `inquiry_confirmations` | Ops | Admin | Indirect via approval |
| Inquiry quotation | `inquiry_quotations` | Admin/accounting | Staff | When sent_to_client (future UI) |
| Sales quotation/SO | `quotations` | Sales | Sales | Not in mobile yet |
| AR invoice | `accounting_customer_invoices` | Accounting/Sales | Staff | FUTURE mobile |
| Warehouse order | `orders` | Warehouse user | Warehouse | FUTURE if linked |
| Carton / scan | `cartons`, `carton_scans` | Warehouse | Warehouse | FUTURE milestones |
| Console | `consoles`, … | Ops | Ops | Internal / mapped labels only |
| Staff notification | `inquiry_lifecycle_notifications` | System | Staff | Not customer |
| Document file | Storage `inquiry-images` | Staff/sales | — | Public URL if shared |

**Inventory entity:** **DOES NOT EXIST.**

---

## 10. Entity Relationship Map (evidence-based)

```
public.users.phone
    └─phones_match─► leads.number  ─┬─► lead_inquiries (sent_to_accounting)
                     customers.phone─┘         │
                                               ├─► inquiry_confirmations
                                               └─► inquiry_quotations

contacts.lead_id_formatted ◄── migrate/bridge ── leads.lead_id_formatted
contacts ──► quotations (sales_order) ──► accounting_customer_invoices

orders.username (warehouse) ──► cartons ──► carton_scans
consoles ◄── console_orders ──► orders

NO CONFIRMED FK: lead_inquiries.id → orders.id
```

---

## 11. Customer Identity & Ownership Model

**CONFIRMED chain:**

```
AUTH: AppUser.id (SecureStore session)
  → public.users.phone
  → RPC get_customer_portal_by_user_id
  → phones_match → leads (+ customers→leads)
  → lead_inquiries where sent_to_accounting = true
```

| Question | Answer |
|----------|--------|
| What identifies the customer in mobile? | `users.id` + stored phone |
| What identifies business Customer ID? | `lead_id_formatted` (shown as lead_number) |
| Multiple leads per phone? | Possible (portal returns multiple) |
| Unmatched phone? | Empty portal → UI may show demo mocks |
| Duplicate phones on leads? | Can share same `lead_id_formatted` (web design) |

**RECOMMENDATION:** Treat demo mocks as **dev-only**; production empty state = “No requests linked to this phone” + support CTA.

---

## 12. Customer Data Visibility Model

| Data | Classification |
|------|----------------|
| Product name, qty, weight, CBM, description, images, link | **CUSTOMER VISIBLE** |
| Inquiry status (mapped), sent_at, lead_id_formatted | **CUSTOMER VISIBLE** |
| Inquiry quotation totals/notes when sent to client | **CUSTOMER VISIBLE** (not wired) |
| Invoice amounts / payment_state | **CUSTOMER VISIBLE** (future; sensitive commercially) |
| `calculator_values`, duty formulas, rate tables | **INTERNAL ONLY** |
| Ops/admin usernames, rejection internals (maybe sanitized reason) | **INTERNAL** / careful |
| JE, CoA, lock dates | **INTERNAL ONLY** |
| Carton scan mutation APIs | **INTERNAL / DANGEROUS** — never customer |
| Inventory stock | **N/A — does not exist** |

---

## 13. Complete Status Mapping

### Inquiries (`lead_inquiries.status`) — CONFIRMED

| DB status | Meaning | Mobile mapper today | Recommended customer label | Explanation | Next |
|-----------|---------|---------------------|----------------------------|-------------|------|
| pending | Awaiting progress | submitted / under_review (if sent) | Submitted / Under review | Received / being reviewed | Wait |
| in_progress | Ops working | under_review | Under review | Operations reviewing | Wait |
| quotation_sent | Quote path | quote_ready | Quote ready | Quote available | Review quote |
| completed | Done | completed | Completed | Finished | Docs |

### Approval (`approval_status`) — CONFIRMED, not in portal

| DB | Recommended customer | Notes |
|----|----------------------|-------|
| draft | (hide / Submitted) | Pre-send |
| sent | Under review | Portal filter uses sent_to_accounting |
| approved | Confirmed | GAP in portal |
| rejected | Action needed | GAP; may expose sanitized reason |

### Sales quotation — CONFIRMED (not in mobile)

quotation → quotation_sent → customer_review → sales_order | cancelled | expired  

### Warehouse scans — CONFIRMED (customer FUTURE)

| Internal | Customer label |
|----------|----------------|
| inward | Cargo received at warehouse |
| outward | Cargo dispatched |
| re_inward | Returned to warehouse |
| console loading phases | Preparing load / Loading / Load closed |

### Payments (invoices) — CONFIRMED staff; FUTURE mobile

not_paid / in_payment / partial / paid / overdue → plain language.

---

## 14. Customer Action Mapping

| Action | Today | Entity | DB change | Who receives | Gap? |
|--------|-------|--------|-----------|--------------|------|
| Register/login | LIVE | users | insert/select | — | — |
| View requests list | LIVE | inquiries | read RPC | — | — |
| View request detail | MOCK | inquiries | — | — | Detail RPC |
| Submit request | MOCK | would be inquiries | insert + notify staff | Sales/ops | API + rules |
| Review/accept quote | MOCK UI only | inquiry_quotations | notify staff | Sales | Quote RPC |
| Track shipment | MOCK | orders/scans | read-only | — | Link + RPC |
| View invoice | MOCK | accounting_* | read | — | Customer RPC |
| Pay | Not real | — | — | — | Provider FUTURE |
| Forgot password | MOCK | users | — | — | Real reset |
| Contact support | Static links | — | — | Staff | Config numbers |

---

## 15. Web vs Mobile Responsibility

| Concern | Web / backend | Mobile |
|---------|---------------|--------|
| Costing calculator | Staff only | Never expose |
| Confirmation approve/reject | Admin/ops | See result only |
| Create SO / post invoice | Staff | See status later |
| Book order / scan QR | Warehouse | Read milestones only |
| Customer identity matching | RPC/SQL | Pass user id only |
| Status dictionary | Shared contract | Display mapped labels |
| UI presentation | — | Owns UX |

Mobile must **not** recreate the ERP.

---

## 16. Existing RPC / Service Reuse Opportunities

| Asset | Reuse? | Role |
|-------|--------|------|
| `get_customer_portal_by_user_id` | **YES — primary** | List + identity |
| `phones_match` / phone keys | **YES** | Keep server-side |
| Direct `users` insert/select | Exists | Auth (harden later) |
| `find_lead_by_normalized_phone` | Web | Possible intake linking |
| Inquiry lifecycle notifications | Structure only | Need customer recipient model |
| `next_carton_serial` / scan APIs | **NO for customers** | Mutation risk |
| JE / reconcile RPCs | **NO** | Staff finance |

**RECOMMENDED future RPCs (do not build in Step 1):**  
`get_customer_request_detail`, `submit_customer_request`, `get_customer_quote`, `respond_customer_quote`, `get_customer_notifications`, `get_customer_shipment_milestones`, `get_customer_invoices`, password reset pair.

---

## 17. Data Gaps (prioritized)

| Gap | UI need | Existing | Priority |
|-----|---------|----------|----------|
| Request detail by id | Detail screen | List RPC only | **P0** |
| approval_status / has_quote in portal | Accurate Actions | Columns exist | **P0** |
| Quote commercial payload | Quote UI | `inquiry_quotations` | **P1** |
| Submit request | New request | Staff create only | **P1** |
| Customer notifications | Inbox / Home | Staff-only tables | **P1** |
| Inquiry ↔ warehouse order link | Orders/Tracking truth | No FK | **P1–P2** (business decision) |
| Customer invoices RPC | Billing | Staff accounting | **P2** |
| Origin/destination on inquiry | Tracking copy | RPC nulls | **P2** / schema |
| ETA | Tracking | No field | **P2** / FUTURE |
| Real password reset | Auth | Mock | **P0** |
| Inventory | None | **N/A** | FUTURE only |
| Signed document URLs | Docs security | Public bucket | **P1** security |

---

## 18. Future Business Capabilities

*(Not currently supported — do not map as live)*

- Inventory / stock / SKU quantities  
- GPS live map tracking  
- Payment gateway (Pay Now)  
- Customer chat / tickets  
- Multi-user company accounts  
- Auto Sales Order on quote accept  
- Saved templates / repeat booking automation  
- Advanced analytics  

Warehouse **milestones** (receive/dispatch) are a **future customer feature** grounded in existing scan tables—not inventory.

---

## 19. Risks & Inconsistencies

1. Hybrid list shows **demo mocks** when empty — can confuse production users.  
2. Live list id → mock detail mismatch.  
3. Fake `requestId` on mock orders invents a link that DB lacks.  
4. Anon key + `user_id` RPC trust model is weak for scale.  
5. Public `inquiry-images` URLs.  
6. Dual identity (leads/contacts/customers).  
7. Naming: `sent_to_accounting` means ops handoff.  
8. Treating warehouse as inventory would be incorrect.  
9. Orphan mock files (`dashboard.ts`, old `orders.ts`) vs `customer.ts`.  

---

## 20. Recommended Next Implementation Steps

After this freeze, implement **in order** (still separate from this Step 1 doc):

1. **Step 2 — Identity hardening** (reset password, profile enrichment from portal, production empty states without demo unless flagged).  
2. **Step 3 — Requests live** (detail RPC; extend portal with approval/quote flags; remove demo when live data exists).  
3. **Step 4 — Home from live derived actions.**  
4. **Step 5 — Submit request** (customer-safe insert + staff notify).  
5. **Step 6 — Quotes.**  
6. **Step 7 — Notifications.**  
7. **Step 8 — Orders/Tracking** only after business defines inquiry↔order link; read-only milestones.  
8. **Step 9–10 — Documents hardening + invoice visibility.**  
9. **Never** invent inventory tables for mobile.

---

## Senior review checklist

| Question | Answer |
|----------|--------|
| Customer identified? | **YES** — users.phone → portal match |
| Which records belong to customer? | Sent `lead_inquiries` for matched leads |
| Each mobile field source known? | **Mostly** — see §7; detail/orders/quotes marked GAP |
| Customer-safe clarity? | **YES** — costing excluded |
| Lifecycle known? | **YES** — inquiry spine |
| Statuses known? | **YES** — mapping in §13 |
| Actions that change state? | Submit/accept not live yet |
| Missing data listed? | **YES** — §17 |
| Assumed non-existent features? | Inventory explicitly excluded |
| Mock treated as real? | Marked MOCK/GAP |
| Warehouse ≠ inventory? | **YES** |
| UI can stay unchanged? | **YES** — swap data layer |
| Next engineer unblocked? | **YES** — this blueprint |

---

## Architecture target (for later — not built now)

```
Supabase (existing tables)
  → Customer-safe RPCs (extend portal; add detail/quote/…)
  → Mobile services (replace mock repositories)
  → Existing UI screens (unchanged layouts)
```

---

*Step 1 complete: UI contract frozen against verified Logistix business/data. Do not implement Step 2 until explicitly requested.*
