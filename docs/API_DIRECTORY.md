# FoodXchange — API Directory & Endpoints

Complete directory of backend API routes in `app/api/`.

---

## 1. Authentication & Admin Routes

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/api/admin/login` | `POST` | Validates master password, checks rate-limits, and issues `admin_session` cookie |
| `/api/admin/logout` | `POST` | Clears `admin_session` cookie and redirects to `/admin/login` |
| `/api/admin/products` | `GET`, `POST` | Manage product catalog entries, categories, and published flags |
| `/api/admin/scraper/products` | `POST` | Triggers Firecrawl v2 spider to scrape supplier product web pages |
| `/api/admin/digest/send` | `POST` | Triggers periodic digest summaries to the administrator |

---

## 2. Lead Ingestion & Sourcing Engine

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/api/lead/submit` | `POST` | Handles `/en/contact` form submissions, triggers AI matching, stores lead, and sends Resend notifications |
| `/api/sourcing/submit` | `POST` | Handles comprehensive sourcing intake forms from the `/en/sourcing` portal |
| `/api/match/portfolio` | `POST` | Real-time intent detection and portfolio scenario matching for the contact page widget |
| `/api/matching/find` | `POST` | Deep database search pairing buyer requirements against verified supplier products |

---

## 3. Buyer & Supplier Portal Routes

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/api/buyer/notifications` | `GET` | Polling endpoint for buyer deal match notifications |
| `/api/supplier-portal/notifications` | `GET` | Polling endpoint for supplier inquiry notifications |
| `/api/suppliers/enquiry` | `POST` | Direct inquiry routing from a specific supplier profile page |
| `/api/proposals/[token]` | `GET` | Generates tokenized shareable product proposals for prospective retail buyers |

---

## 4. Content & Marketing Routes

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/api/blog` | `GET` | Retrieves published blog articles filtered by tag or language |
| `/api/newsletter` | `POST` | Handles newsletter subscription requests with double-optin support |
| `/api/card/track` | `POST` | Digital business card visit and interaction telemetry (`/business-card/udi`) |
| `/api/vcard/udi` | `GET` | Serves direct `.vcf` contact card download |

---

## 5. Cron & Background Automation

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/api/cron/send-reminders` | `POST` | Automated daily runner (09:00 UTC) checking for unresponded supplier actions (3-day and 7-day automated reminders) |
| `/api/cron/sync-products` | `POST` | Background catalog data health check |
