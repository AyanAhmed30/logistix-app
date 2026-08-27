# STEP 2 — CUSTOMER IDENTITY & DATA OWNERSHIP AUDIT

**Mode:** Analysis + implementation plan only. **Zero code / DB / RLS / UI changes.**  
**Context:** [`STEP1_UI_CONTRACT_BUSINESS_DATA_BLUEPRINT.md`](./STEP1_UI_CONTRACT_BUSINESS_DATA_BLUEPRINT.md)  
**Labels:** **CONFIRMED** · **INFERRED** · **GAP** · **RECOMMENDATION**

---

## P0 remediation status (updated)

**Implemented (Option B — opaque server sessions):** migration `014_identity_hardening_sessions.sql` + mobile auth/portal wiring.

| P0 item | Status |
|---------|--------|
| Stop trusting bare `p_user_id` for portal | **Done** — `get_customer_portal_by_session(p_session_token)`; legacy user-id/phone RPCs revoked from anon |
| Anon cannot SELECT `users` / `password_hash` | **Done** — policies dropped; grants revoked |
| Login/register via SECURITY DEFINER RPCs | **Done** — password verified in DB; no hash returned |
| Session TTL + logout revoke | **Done** — 30-day `user_sessions`; `logout_user` + `queryClient.clear()` |
| Demo mock fallback in production | **Done** — `__DEV__` only |

**Step 2 remaining (015):**

| Item | Status |
|------|--------|
| Profile update (name/email; phone read-only) | **Done** — `update_customer_profile` + Profile → Edit |
| Change password (logged-in) | **Done** — `change_customer_password` + Profile → Security |
| Forgot password | **Done** — phone + email verify → reset token → `complete_password_reset` (no SMS gateway; identity factors) |

**Still later (not Step 2):** SMS OTP delivery, phone change with re-verify, Supabase Auth migration, inquiry detail live wiring.

> Historical sections below describe the **pre-P0** system. Prefer this status table for current security posture.

---

## Critical verdict (read this first)

> **If we connect the Requests screen to real Supabase data tomorrow, can we confidently guarantee that Customer A can ONLY see Customer A’s requests?**

### Answer: **NO**

**Why (CONFIRMED):**

1. **No Supabase Auth.** Mobile uses anon key + custom `public.users`. There is no `auth.uid()` bound to the request.
2. **`get_customer_portal_by_user_id(p_user_id)` trusts a client-supplied UUID.** It is `SECURITY DEFINER` and granted to **`anon`**. Anyone who can call the API with the anon key and a victim’s `users.id` receives that victim’s portal payload.
3. **`public.users` is selectable by anon** (`008_direct_users_access.sql`), including **`password_hash`**, so IDs (and hashes) are enumerable/readable.
4. **Phone matching still uses last-10-digit equality**, which can merge distinct numbers that share the same last 10 digits (**CONFIRMED** in `013` `phones_match`).
5. **App session is a local JSON blob** with no server token, no expiry, no revocation.

Until these are fixed, live Requests data is **not production-safe** for multi-customer confidentiality.

---

## 1. Current Authentication Flow

### CONFIRMED — what actually happens

```
Signup: phone → wizard → bcrypt hash (client) → INSERT public.users
Login:  SELECT users WHERE phone = ? INCLUDING password_hash
        → client bcrypt verify
        → save { user, loggedInAt } to SecureStore / AsyncStorage
Tabs:   AuthProvider.user gates navigation (client-only)
Portal: rpc('get_customer_portal_by_user_id', { p_user_id: user.id })
Logout: clear SecureStore; set user = null
```

| Topic | Finding | Classification |
|-------|---------|----------------|
| Supabase Auth | **Not used.** `persistSession: false`; comment: “Database-only client” | CONFIRMED — `client.ts` |
| `auth.uid()` | **Never used** in mobile identity path | CONFIRMED |
| `auth.users` | **Not part of mobile auth** | CONFIRMED |
| Session storage | SecureStore (native) / AsyncStorage (web); key `logistix_app_session` | CONFIRMED |
| Session contents | Full `AppUser` JSON + `loggedInAt` — **not** a signed JWT | CONFIRMED |
| Session expiry | **None** — `loggedInAt` stored but never checked | CONFIRMED / GAP |
| Logout | Clears local session only; no server revoke | CONFIRMED |
| Device change | New install = empty SecureStore → must log in again | CONFIRMED |
| Invalid session | Corrupt JSON deleted; otherwise any stored user treated as valid forever | CONFIRMED |
| Password reset | UI exists; **local fake success only** | CONFIRMED — ForgotPasswordScreen |

### Auth flow diagram

```
Mobile App (anon key)
  → public.users (select/insert policies: using(true) / with check(true))
  → local SecureStore session { id, phone, email, names }
  → Portal RPC(p_user_id)  [NO proof user is that id]
```

---

## 2. Current Customer Identity Flow

### CONFIRMED chain

```
AppUser.id  (from local session)
  → public.users.id
  → public.users.phone          (looked up INSIDE RPC — good)
  → phones_match(phone, leads.number)
     UNION phones_match(phone, customers.phone_number → lead)
  → lead_inquiries WHERE sent_to_accounting = true
  → JSON { leads[], inquiries[] }
```

| Step | Mechanism | Classification |
|------|-----------|----------------|
| Auth user → `public.users` | Same row; custom table is the account | CONFIRMED |
| User → “Logistix customer” | **Indirect:** phone overlap with `leads` / `customers` | CONFIRMED |
| Formal FK user→lead | **None** | CONFIRMED / GAP |
| Customer ID shown in business | `leads.lead_id_formatted` as `lead_number` | CONFIRMED |
| Contacts table in portal | **Not used** by mobile portal RPC | CONFIRMED |

**Business meaning:** A mobile account is a **phone-based portal login**. It is **not** a first-class CRM contact row. Ownership of freight data is **phone-match to staff-created leads**, not “this user owns this inquiry_id.”

---

## 3. `get_customer_portal_by_user_id` Analysis

**Source:** `logistix-app/supabase/migrations/013_customer_portal_by_user_id.sql`

### Inputs / outputs

| | |
|--|--|
| **Input** | `p_user_id uuid` (client-supplied) |
| **Output** | JSONB `{ leads: [...], inquiries: [...] }` |
| **Security** | `SECURITY DEFINER`, `search_path = public` |
| **Grants** | `EXECUTE` to **`anon`, `authenticated`** |
| **Uses `auth.uid()`?** | **NO** |

### Execution flow (CONFIRMED)

1. If `p_user_id` null → raise `unauthorized_user`.
2. `SELECT phone FROM users WHERE id = p_user_id`; if missing → `unauthorized_user`.
3. Call `_customer_portal_for_user_phone(phone)`:
   - Short/invalid phone → empty arrays.
   - Match leads by `phones_match(leads.number, phone)`.
   - Also match via `customers.phone_number` → `customers.lead_id` → lead.
   - Inquiries: `lead_inquiries` for matched leads with **`sent_to_accounting = true` only**.
   - Strip costing; force `shipping_mark`/`origin`/`destination` = null.

### Authorization assumption (CONFIRMED weakness)

The function assumes: **“Whoever knows/supplies this user UUID is that user.”**  
With anon execute + enumerable `users.id`, that assumption is **false**.

### Duplicate / edge handling

| Case | Behavior | Classification |
|------|----------|----------------|
| Missing user id | Exception | CONFIRMED |
| User exists, no matching lead | Empty leads/inquiries | CONFIRMED |
| Multiple matching leads | All returned (DISTINCT union) | CONFIRMED |
| Multiple inquiries | All sent inquiries for those leads | CONFIRMED |
| Deprecated `get_customer_portal_by_phone` | Still granted to anon; resolves phone via `phones_match` on `users` then same payload | CONFIRMED — extra attack surface |

### Phone match rules (013 — CONFIRMED)

Match if:

- `phone_match_key` equal (PK `0…` → `92…`), **OR**
- both digit strings length ≥ 10 and **`right(..., 10)` equal**

**Risk:** Last-10 collision / over-matching across different country codes or similar numbers.

*(Note: migration `010` briefly had looser `LIKE '%…%'` matching; `013` removed that. Current intended production function is `013`.)*

---

## 4. Customer ↔ Lead Relationship

| Model | Reality |
|-------|---------|
| 1 user : 1 lead | **Not enforced** |
| 1 phone : many leads | **Possible** — portal returns multiple | CONFIRMED |
| 1 lead_id_formatted : many leads | **Possible** on web (duplicate phone sharing) | CONFIRMED (Step 1 / web migrations) |
| User FK to lead | **Missing** | GAP |

**Business handling for mobile:** Treat portal result as **“all leads matching this account phone”** — a collection, not a single lead. UI already shows multi-lead note (**CONFIRMED** Requests screen).

---

## 5. Customer ↔ Inquiry Relationship

```
Inquiry belongs to lead_id
Lead matched by phone to users.phone
Visibility filter: sent_to_accounting = true
```

| Rule | Classification |
|------|----------------|
| Customer never sees unsent drafts via portal | CONFIRMED |
| No per-inquiry ACL row for mobile user | CONFIRMED |
| Ownership = transitive phone match only | CONFIRMED |

---

## 6. RLS / RPC Security Analysis

### `public.users` (mobile auth table)

| Item | Status |
|------|--------|
| RLS enabled | Yes (005) then policies opened in 008 |
| Policy select | `using (true)` for anon/authenticated | CONFIRMED **CRITICAL** |
| Policy insert | `with check (true)` | CONFIRMED |
| Grant | `select, insert` to anon | CONFIRMED |
| Effect | Any anon client can **list users and read `password_hash`** | CONFIRMED **CRITICAL** |

### Portal RPCs

| Item | Status |
|------|--------|
| SECURITY DEFINER | Yes — runs with owner rights; bypasses table RLS for reads inside function | CONFIRMED |
| auth.uid() check | Absent | CONFIRMED **CRITICAL** |
| Grant execute anon | Yes | CONFIRMED **CRITICAL** |
| Internal helper `_customer_portal_for_user_phone` | EXECUTE revoked from public | CONFIRMED (good) |

### Leads / inquiries / quotes / orders / invoices

| Surface | Mobile direct access? | Classification |
|---------|----------------------|----------------|
| Web tables RLS | Typically “service role full access” on web; not customer-scoped | CONFIRMED pattern |
| Anon grants on `leads` / `lead_inquiries` | Not granted by mobile migrations reviewed; **PostgREST likely denies direct select** unless project-wide grants exist | INFERRED — verify in live Supabase grants |
| Path that works today | **Only** security-definer portal RPCs (+ users table) | CONFIRMED |

**INFERRED residual risk:** If production ever granted `anon` select on `lead_inquiries`, RLS “service role” policies would **not** protect customers. Must verify live grants before go-live.

### Orders / shipments / invoices / notifications

No customer RPCs yet. Not directly exposed by mobile app code. Risk rises when Step 3+ adds RPCs if same “trust p_user_id” pattern is copied.

---

## 7. Multiple Lead Handling

**CONFIRMED behavior:**

- Portal returns **array of leads** + inquiries for all matched lead IDs.
- App filters inquiries to lead IDs present in response.
- UI can show “N leads matched your phone.”

**Business impact:** Legitimate if one person has multiple staff-created leads. **Risk** if last-10 matching or shared family phones pull **another person’s** leads.

**RECOMMENDATION:** Keep multi-lead support; add optional lead picker; tighten phone match; consider explicit `users`↔`lead` link table for high-assurance accounts.

---

## 8. Customer Ownership Model (target vs today)

### Today (CONFIRMED)

```
AUTH ID          = users.id (claimed by client)
USER             = public.users row
CUSTOMER IDENTITY= phone string
CUSTOMER RECORD  = soft-match leads/customers (no FK)
INQUIRIES        = sent inquiries under matched leads
QUOTATIONS/…     = not in portal yet
```

### Recommended model (RECOMMENDATION — do not implement in this Step)

```
Authenticated principal (Supabase Auth JWT OR signed custom session)
  → server resolves auth.uid() / validated session → users.id
  → users.phone (or explicit user_leads links)
  → ownership check inside SECURITY DEFINER: only data for that resolved identity
  → customer-safe DTO → mobile UI
```

**Avoid:** Mobile supplies arbitrary customer/user/inquiry IDs that the DB honors without proving the caller.

---

## 9. Security Test Scenarios

| Scenario | Expected | Current behavior | Safe? |
|----------|----------|------------------|-------|
| **A** Valid account + matching phone + 1 lead | Own data | Portal returns that lead’s sent inquiries | **YES** for happy path |
| **B** Multiple matching leads | All own leads | All returned | **YES** if match correct; **RISKY** if over-match |
| **C** Valid account, no lead | Empty / unlinked | Empty arrays; UI may show **demo mocks** | Empty OK; **demo mocks unsafe for prod** |
| **D** Phone mismatch vs staff lead | No foreign data | No match → empty | **YES** if phones_match correct |
| **E** Two accounts, same/duplicate phone | Undefined business | `users.phone` UNIQUE → second signup fails; leads may still share phones across people | **PARTIAL** — account unique; lead collision still possible |
| **F** Attacker passes victim `p_user_id` | Deny | **RPC returns victim data** | **NO — CRITICAL** |
| **G** Session expired | Re-auth | **Never expires** | **NO** |
| **H** Logout then other user login | No stale data | Query key includes userId (OK); **React Query cache not cleared on logout**; old user’s cache may linger in memory until GC | **MOSTLY OK** display-wise; should invalidate on signOut |

---

## 10. Forgot Password Audit

| Item | Finding |
|------|---------|
| UI | Exists — `ForgotPasswordScreen` |
| Backend | **None** — `setTimeout` then success copy |
| Supabase Auth reset | **N/A** — Auth not used |
| Deep links | None |
| Production ready | **NO** — GAP |

**RECOMMENDATION:** Either adopt Supabase Auth (email/phone OTP) or implement tokenized reset RPC + out-of-band SMS/email. Out of scope until authorized.

---

## 11. Profile Update Audit

| Item | Finding |
|------|---------|
| Editable profile API | **None** in `src` (no update to `users`) |
| Profile UI | Shows session name/phone/email; company/Customer ID from mock |
| Phone change | Not implemented |
| If phone changed later | Would **rebind** portal data set (identity is phone-match) — high business risk |

**RECOMMENDATION:** Allow name/email update; treat **phone change as sensitive** (re-verify OTP; warn that requests list will follow new phone).

---

## 12. Identity Risks

| Risk | Current behavior | Severity | Business impact | Recommended fix |
|------|------------------|----------|-----------------|-----------------|
| Client-supplied `p_user_id` trusted | RPC returns that user’s portal data | **Critical** | Cross-customer inquiry leakage | Bind RPC to real auth (`auth.uid()`) or signed session; stop anon execute without proof |
| Anon `SELECT` on `users` incl. hashes | Full table readable | **Critical** | Credential stuffing / ID enumeration / offline crack | Revoke select; login via SECURITY DEFINER RPC that returns user **without** hash to client, or verify hash in DB |
| Anon insert on `users` | Open signup | Medium | Spam accounts | Rate limit; captcha; optional invite-only |
| Last-10 phone match | Possible over-merge | **High** | Wrong customer sees wrong freight | Prefer exact `phone_match_key` only; drop last-10 or require country code |
| Deprecated phone RPC still granted | Alternate entry | **High** | Same class of abuse | Revoke `get_customer_portal_by_phone` from anon or require auth |
| No session expiry / revocation | Forever-valid local session | Medium | Stolen device / shared phone | TTL + server session table or Supabase Auth |
| Demo mocks when portal empty | Shows fake requests | Medium | Customer believes fake cargo is real | Prod flag: never show demo |
| No user↔lead FK | Phone-only soft link | Medium | Ambiguous ownership | Optional link table after OTP verify |
| SECURITY DEFINER without auth check | Bypasses RLS | Critical when combined with above | Data exfil | Auth gate inside every customer RPC |
| Query cache not cleared on logout | Stale memory cache | Low–Medium | Brief cross-user flash unlikely but unclean | `queryClient.clear()` on signOut |
| Password hashing on client | Hash sent/stored from app | Medium | Weaker control vs DB crypt | Prefer DB-side crypt in login/register RPC |
| Public inquiry image URLs | Anyone with URL | Medium | Document leakage | Signed URLs later |

---

## 13. Confirmed Findings

1. Mobile auth is **custom `public.users`**, not Supabase Auth.  
2. Portal RPC resolves phone **server-side from `users.id`** (good design intent).  
3. Portal only returns **`sent_to_accounting = true`** inquiries.  
4. Costing fields are excluded from portal payload.  
5. Multi-lead phone match is intentional and implemented.  
6. Anon can execute portal RPCs and read `users`.  
7. RPC does **not** verify the caller is `p_user_id`.  
8. Forgot password and profile update are not production backends.  
9. No session expiry logic.

---

## 14. Inferred Findings

1. Direct anon select on `leads`/`lead_inquiries` is probably blocked by missing grants — **must confirm on production Supabase**.  
2. Copying the same `p_user_id` pattern to future detail/quote RPCs would multiply leakage.  
3. Shared household phones will legitimately share portal views under current rules.

---

## 15. Gaps

| Gap | Blocks |
|-----|--------|
| Cryptographic session / `auth.uid()` binding | Safe live Requests |
| Lock down `users` select (no hash to clients) | Credential security |
| Revoke/replace anon portal execute model | Ownership guarantee |
| Stricter phone match policy | Over-matching |
| Session TTL + logout cache clear | Device sharing |
| Real password reset | Account recovery |
| Explicit empty state without demo mocks in prod | Trust |
| Optional verified user–lead link | High-assurance B2B |

---

## 16. Recommended Fixes (plan only — do not implement yet)

### Priority 0 — before any broader live data

1. **Stop trusting bare `p_user_id` from anon.**  
   - Preferred: migrate to **Supabase Auth**; portal RPC uses `auth.uid()` → `users` mapping.  
   - Alternative: issue **signed session token** (JWT) at login; RPC verifies JWT before resolving user.
2. **Revoke `SELECT` on `public.users` from anon.**  
   - Login/register via SECURITY DEFINER RPCs that never return `password_hash` to the client.
3. **Revoke or auth-gate `get_customer_portal_by_phone`.**
4. **Production: disable demo mock fallback** on Requests when portal empty.
5. **Invalidate React Query on signOut.**

### Priority 1 — identity quality

6. Tighten `phones_match` (exact key only; document last-10 decision with business).  
7. Session TTL (e.g. 30 days) using `loggedInAt` or server sessions.  
8. Real forgot-password flow.  
9. Profile update for name/email; phone change = verified flow.

### Priority 2 — business linking

10. Optional `user_lead_links` after staff or OTP confirmation.  
11. Enrich portal with `lead_id_formatted` for Profile Customer ID (read-only).

---

## 17. Exact Implementation Tasks Required (for when authorized)

| Task ID | Task | Depends on |
|---------|------|------------|
| ID-001 | Audit production grants: `users`, `leads`, `lead_inquiries`, RPC executes | — |
| ID-002 | Design auth binding choice: Supabase Auth **or** custom signed JWT | Business decision |
| ID-003 | Implement login/register RPCs; revoke anon table select on `users` | ID-002 |
| ID-004 | Rewrite portal RPC to use `auth.uid()` / verified JWT only | ID-002, ID-003 |
| ID-005 | Revoke anon execute on deprecated phone portal RPC | ID-004 |
| ID-006 | Tighten `phones_match` per business rule | Product sign-off |
| ID-007 | Remove/guard demo mock fallback behind `__DEV__` or env flag | — |
| ID-008 | `queryClient.clear()` on signOut; optional session TTL | — |
| ID-009 | Real password reset | ID-002 |
| ID-010 | Profile update (name/email); phone change policy | ID-004 |
| ID-011 | Penetration checklist: IDOR on portal with swapped UUIDs | ID-004 |
| ID-012 | **Only then** proceed to Step 3 live Requests detail wiring | ID-004–008 |

---

## Recommended customer-safe access model (summary)

```
Authenticated caller (JWT)
  → RPC reads auth.uid() / verified subject
  → Resolve public.users (1:1)
  → Resolve phone or explicit lead links
  → Return only sent inquiries for those leads
  → Mobile UI (unchanged)
```

**Not:**

```
Mobile passes any UUID + anon key → SECURITY DEFINER returns data
```

---

## Final review answers

| # | Question | Answer |
|---|----------|--------|
| 1 | Who is authenticated user? | Local session `AppUser`; **not** Supabase Auth principal |
| 2 | How become Logistix customer? | Phone match to staff leads/customers |
| 3 | Link to leads/inquiries? | Soft phone match + `sent_to_accounting` |
| 4 | Ownership enforced? | **Weakly** — by phone inside RPC, **not** by caller identity |
| 5 | RPCs secure? | **No** for multi-tenant confidentiality |
| 6 | RLS protect customer data? | Users table **open**; leads rely on no anon grants + definer RPC |
| 7 | Multiple leads? | Supported (array) |
| 8 | Unmatched? | Empty portal (+ risky demo UI) |
| 9 | Duplicate/mismatch phones? | Users unique phone; leads can collide; last-10 over-match risk |
| 10 | Changes before live data? | **Yes — ID-002–ID-008 minimum** |

---

## Success criteria status

Step 2 **analysis** is complete: identity, linking, RPC/RLS risks, scenarios, and implementation tasks are documented.

**Step 2 remediation is NOT done** (by design — no implementation yet).

**Do not start Step 3 (live Requests detail) until P0 identity fixes are authorized and completed.**

---

*Zero code changes made. Audit only.*
