# Customer Status Dictionary

**Status:** Frozen (CUSTOMER-MOBILE-002)

Never show raw internal enums (`sent_to_accounting`, `approval_status`, calculator keys) as primary UX.

| Customer status | Internal signals | Explanation | Next | Action? |
|-----------------|------------------|-------------|------|---------|
| `submitted` | Inquiry created / just sent | We received your cargo details. | Logistix will review your request. | No |
| `under_review` | `pending` / `in_progress` + sent | Operations is reviewing your request. | Confirmation and costing. | No |
| `action_needed` | Rejected / missing info (when exposed) | We need something from you. | Update or contact support. | Yes |
| `quote_ready` | `quotation_sent` or customer-safe quote | Your quote is ready. | Review quote and respond. | Yes |
| `confirmed` | Approved confirmation | Your request is confirmed. | Fulfillment / next ops steps. | No |
| `in_progress` | Warehouse milestones linked (Phase 8) | Your cargo is being processed. | Next milestone. | No |
| `completed` | `completed` | This request is finished. | View documents / history. | Optional |
| `cancelled` | Rejected/cancelled terminal | This request was closed. | Contact support if needed. | Optional |

## Filter buckets

- **Active:** submitted, under_review, quote_ready, confirmed, in_progress, action_needed
- **Action needed:** action_needed, quote_ready
- **Completed:** completed, cancelled
