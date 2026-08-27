# Customer Portal API Contract

**Status:** Frozen (CUSTOMER-MOBILE-003)

## Principles

- Mobile uses **anon key + customer-safe RPCs** only (never service role).
- Never return calculator values, staff notes, or internal approval actor IDs.
- Identity: resolve phone **server-side** from `public.users` via `p_user_id`.

## RPCs

| RPC | Purpose | Phase |
|-----|---------|-------|
| `get_customer_portal_by_user_id` | Leads + requests | Live / extended |
| `get_customer_request_detail` | Single request + timeline + quote summary | 2 |
| `reset_customer_password` | Password reset with token | 1 |
| `request_customer_password_reset` | Issue reset token | 1 |
| `update_customer_profile` | Name/email update | 1 |
| `get_customer_notifications` | In-app inbox | 4 |
| `mark_customer_notification_read` | Mark read | 4 |
| `submit_customer_request` | Self-service intake | 5 |
| `get_customer_quote` | Commercial quote fields | 6 |
| `respond_customer_quote` | Accept/decline → notify staff | 6 |
| `get_customer_shipment_milestones` | Read-only tracking | 8 |
| `get_customer_invoices` | Billing visibility | 8 |

## Portal inquiry fields (safe)

Included: id, lead_id, lead_number, inquiry_number, product_name, description, quantity, total_weight, cbm, link_url, image_url, additional_image_urls, status, approval_status (mapped only), created_at, sent_at, updated_at, customer_status, has_quote, quote_total (optional), rejection_reason (safe).

Excluded: calculator_values, ops costing, staff IDs, internal chatter.

## shipping_mark / origin / destination

Reserved; return null until schema + staff capture exist.
