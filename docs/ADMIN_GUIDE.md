# FoodXchange Admin Guide

## Overview

The admin dashboard is available at `/admin` (production: `https://fdx.trading/admin`).  
Login uses a **magic link** — no password. Enter your admin email and check your inbox.

---

## 1. Dashboard

`/admin` — shows platform activity at a glance:

- **Sourcing requests** — new buyer submissions needing review
- **Supplier actions** — pending responses from suppliers
- **Recent events** — last 50 platform events from `platform_events`
- **Notification bell** — unseen admin notifications from `admin_notifications`

---

## 2. Processing Sourcing Requests

### Flow
1. Buyer submits a sourcing request via `/en/contact` or the portal
2. Request appears in `sourcing_requests` table, status = `new`
3. Admin reviews and routes to matching suppliers

### Steps in the dashboard

**a) Review request** — click into the request to see buyer details, product category, quantity, and any attachments.

**b) Find suppliers** — use the supplier search or the matching tool at `/admin/scraper` to identify candidates.

**c) Create supplier actions** — for each supplier you want to approach, create a record in `supplier_actions`:
```sql
INSERT INTO supplier_actions (sourcing_request_id, supplier_id, action_type, request_message, status)
VALUES ('<request_id>', '<supplier_id>', 'outreach', 'Your message here', 'pending');
```
Or use the admin UI "Add Supplier Action" button on the request detail page.

**d) Update request status** — move from `new` → `in_progress` once suppliers are contacted.

---

## 3. Managing Supplier Responses

Supplier actions live in `supplier_actions`. Statuses:

| Status | Meaning |
|---|---|
| `pending` | Awaiting supplier response |
| `responded` | Supplier replied |
| `matched` | Confirmed match, moving to deal |
| `declined` | Supplier passed |
| `expired` | No response after 7+ days |

### Reminder emails (automated)
The cron job at `/api/cron/send-reminders` runs daily at **09:00 UTC** and:
- Sends a **3-day reminder** if `status = pending` and created 3 days ago with no `last_reminder_3d_sent`
- Sends a **7-day reminder** if still pending at 7 days with no `last_reminder_7d_sent`

Set up the external cron at [cron-job.org](https://cron-job.org):
- URL: `https://fdx.trading/api/cron/send-reminders`
- Method: `POST`
- Header: `Authorization: Bearer <CRON_SECRET>`
- Schedule: daily 09:00 UTC

### Manually updating a supplier action
```sql
UPDATE supplier_actions
SET status = 'responded', updated_at = now()
WHERE id = '<action_id>';
```

---

## 4. Sourcing Matches

When a supplier confirms interest, create a match in `sourcing_matches`:
```sql
INSERT INTO sourcing_matches (sourcing_request_id, supplier_id, match_notes, status)
VALUES ('<request_id>', '<supplier_id>', 'Supplier confirmed availability', 'active');
```

- **Buyer notification bell** at `/en/portal` — polls `/api/buyer/notifications` every 30s, shows new matches
- **Supplier notification bell** at `/en/supplier-portal` — polls `/api/supplier-portal/notifications` every 30s

---

## 5. Supplier Product Scraper

`/admin/scraper` — bulk-import supplier product catalogs.

1. Enter a supplier website URL
2. Uses **Firecrawl v2** to crawl and extract product data
3. Products saved to `supplier_products`
4. Run matching against open sourcing requests via `matchSuppliers.ts`

---

## 6. Bulk Outreach

For campaigns targeting multiple suppliers:

1. Export supplier emails from `supplier_profiles` filtered by category/region
2. Use Resend bulk send (or the newsletter route `/api/newsletter`) to send
3. Log the campaign in `platform_events` for tracking:
```sql
INSERT INTO platform_events (event_type, metadata)
VALUES ('bulk_outreach', '{"campaign": "Q3 dairy suppliers", "count": 45}');
```

---

## 7. Portal Impersonation

Admins can impersonate a buyer or supplier to troubleshoot their experience.

1. In the admin dashboard, find the buyer/supplier record
2. Click "View as buyer" or "View as supplier"
3. A signed impersonation cookie is set via the auth callback
4. An orange banner appears in the portal: "Impersonating [name]"
5. Click "End session" to clear the cookie

Cookie is signed with HMAC using `IMPERSONATION_SECRET` and expires after 1 hour.

---

## 8. Auth & Login

### Magic link login
1. Go to `/admin/login`
2. Enter your admin email (must be in `ADMIN_EMAILS` env var)
3. Check email for the magic link — valid for **1 hour**
4. Clicking the link hits `/admin/auth/callback`, verifies OTP, sets session cookie

### Admin session cookie
- HMAC-SHA256 signed with `ADMIN_SESSION_SECRET`
- Expires after 8 hours
- HttpOnly, Secure, SameSite=Lax

### Adding a new admin
Add the email to the `ADMIN_EMAILS` Netlify env var (comma-separated):
```
netlify env:set ADMIN_EMAILS "udi@fdx.trading,newadmin@fdx.trading"
```

---

## 9. Environment Variables

| Variable | Where set | Purpose |
|---|---|---|
| `ADMIN_EMAILS` | Netlify | Comma-separated list of authorized admin emails |
| `ADMIN_SESSION_SECRET` | Netlify | HMAC key for admin session cookies |
| `CRON_SECRET` | Netlify | Bearer token for `/api/cron/send-reminders` |
| `SUPABASE_SERVICE_ROLE_KEY` | Netlify | Server-side Supabase admin access |
| `RESEND_API_KEY` | Netlify | Email sending via Resend |
| `NEXT_PUBLIC_SUPABASE_URL` | Netlify + .env.local | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Netlify + .env.local | Supabase anon key |
| `NEXT_PUBLIC_SITE_URL` | .env.local only | Local dev URL (http://localhost:3000) — do NOT set on Netlify |

---

## 10. Database Migrations

Migration files live in `supabase/migrations/`. They must be run **manually** in the Supabase SQL editor (not auto-applied).

To apply a migration:
1. Open [Supabase Dashboard](https://app.supabase.com) → your project → SQL Editor
2. Paste the migration file contents
3. Run

Pending migration: `supabase/migrations/20260616_supplier_actions_reminders.sql` — adds `last_reminder_3d_sent` and `last_reminder_7d_sent` columns to `supplier_actions`.

---

## 11. Daily Operations Checklist

- [ ] Check admin dashboard for new sourcing requests
- [ ] Review any supplier actions with status `pending` > 3 days
- [ ] Confirm cron reminder emails are sending (check `platform_events` for `supplier_action_reminder_3d` / `supplier_action_reminder_7d` entries)
- [ ] Review new `sourcing_matches` and notify relevant buyers if bell hasn't fired
- [ ] Check `newsletter_subscribers` for new signups

---

## 12. FAQ

**Q: Magic link expired or not received?**  
Wait 60 seconds (rate limit), then try again. Check spam. Links are valid for 1 hour.

**Q: Admin login returns "Invalid session"?**  
`ADMIN_SESSION_SECRET` may be missing from Netlify. Set it:  
```
netlify env:set ADMIN_SESSION_SECRET "<32+ char random string>"
```

**Q: Buyer/supplier redirected to wrong portal after login?**  
Check that `buyers.contact_email` (for buyers) and `supplier_profiles.email` (for suppliers) match the Supabase auth user email exactly.

**Q: Notification bell not showing new matches?**  
Check the API routes `/api/buyer/notifications` and `/api/supplier-portal/notifications`. Confirm `sourcing_matches` has records with the correct `buyer_id` or `supplier_id`.

**Q: Cron reminders not sending?**  
1. Verify cron-job.org is configured with correct URL and `Authorization` header
2. Check Netlify function logs for `/api/cron/send-reminders`
3. Confirm migration `20260616_supplier_actions_reminders.sql` was applied

---

## 13. Support

For platform issues: check Netlify deploy logs, Supabase logs, and `platform_events` table.  
Resend delivery issues: check [Resend dashboard](https://resend.com) for bounces/failures.
