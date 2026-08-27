# Customer Mobile Information Architecture

**Status:** Frozen for MVP+ (CUSTOMER-MOBILE-001)

## Primary tabs

| Tab | Route | Purpose |
|-----|-------|---------|
| Home | `/(tabs)` | Active requests, pending actions, alerts, quick actions |
| Requests | `/(tabs)/requests` | Freight requests (formerly “Inquiries”) |
| Documents | `/(tabs)/documents` | Cross-request customer-safe files |
| Account | `/(tabs)/account` | Profile, security, support, notifications, billing |

## Removed from customer IA (kill list)

- Mock ops dashboard KPIs / revenue / “Sarah” greeting
- Mock Orders list (ops persona)
- Mock Tracking map as a primary tab (real tracking is Phase 8, accessed from request/home)
- Scan Barcode quick action
- Ops “command center” copy

## Nested / secondary screens

- Request detail: `/(tabs)/requests/[id]`
- Submit request: `/(tabs)/requests/new`
- Quote detail: `/(tabs)/requests/[id]/quote`
- Edit profile: `/(tabs)/account/edit`
- Forgot password: `/(auth)/forgot-password`
- Reset password: `/(auth)/reset-password`
- Notifications: `/(tabs)/account/notifications`
- Support: `/(tabs)/account/support`
- Billing: `/(tabs)/account/billing`
- Tracking (milestones): `/(tabs)/account/tracking` or request-linked

## Naming

- Customer-facing name: **Request** (not Inquiry, Lead, SO, JE)
- Customer ID: show `lead_id_formatted` as **Customer ID**
