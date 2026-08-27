# STEP 5 — Customer inquiry submit & CRM routing

## CRM create / send (existing — unchanged)

Sales creates inquiries from:

1. **CRM:** Qualified opportunity → **Send Inquiry** → `/crm/opportunities/[id]/inquiry`
2. **Sales agent:** Lead detail → inquiry workspace

Shared UI: `LeadInquiryWorkspace`

| Action | Server | Result |
|--------|--------|--------|
| Save as Draft | `saveInquiry` | `approval_status=draft`, `sent_to_accounting=false` |
| Send Inquiry | `saveAndSendInquiry` → `sendInquiryToAccounting` | `sent_to_accounting=true`, `approval_status=sent`, notify Operations |

**Product fields (same for customer app):**

- `product_name`
- `quantity` (whole number)
- `total_weight` (decimal kg)
- `cbm` (decimal)
- `description` (other details)
- images optional (`image_url` / `additional_image_urls`) — mobile V1 submits without images

After Sales **Send**, Operations receives the normal `inquiry_sent` lifecycle notification and continues confirmation / admin approval as today.

---

## Customer mobile submit (new)

Migration: `016_customer_inquiry_submit.sql`  
RPC: `submit_customer_inquiry(session_token, product fields…)`

### Routing rule (agreed)

```
Customer phone (public.users)
  → Match CRM contacts.phone / contacts.mobile
  → Sales owner:
       1) contacts.created_by → sales_agents.username  (“who added the phone”)
       2) else contacts.salesperson_id
  → Find/create lead under that sales_agent_id + contact_id
  → Insert lead_inquiries as DRAFT + customer_submitted=true
  → Notify that sales agent (event: customer_submitted)
```

Customer submissions are **not** sent to Operations automatically.

### Visibility

| Who | Sees it when |
|-----|----------------|
| Customer app | Portal shows `sent_to_accounting` **or** `customer_submitted` |
| Sales agent | On their lead’s inquiry list / workspace (banner: “Submitted by customer”) |
| Operations | Only after Sales uses existing **Send Inquiry** |

---

## End-to-end flow

```
Customer app Submit
  → Draft inquiry on Contact owner’s lead
  → Sales reviews (CRM or sales-agent workspace)
  → Sales Send Inquiry (unchanged)
  → Operations / admin / quoting (unchanged)
  → Customer sees status updates via portal
```

## Apply

Run in Supabase SQL Editor (in order if not already applied):

1. `016_customer_inquiry_submit.sql`
2. `017_fix_customer_inquiry_agent_routing.sql` ← **required fix for no_sales_owner**

### If submit still fails with no_sales_owner

In CRM → Contacts, open the customer contact and set **Salesperson** to the correct sales agent, then retry.
