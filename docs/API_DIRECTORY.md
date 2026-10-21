# FoodXchange — API Directory & Endpoints

> **Complete catalog of backend API routes in `app/api/`**  
> *Last updated: October 21, 2026*

---

## 1. Authentication & Session Security

| Endpoint | Method | Auth | Description |
| :--- | :--- | :---: | :--- |
| `/api/admin/login` | `POST` | Public | Validates master password, checks rate-limits, and issues encrypted `admin_session` cookie |
| `/api/admin/logout` | `POST` | Admin | Clears `admin_session` cookie and redirects to `/admin/login` |
| `/api/admin/auth/callback` | `GET` | Public | Verifies magic link token and establishes admin session |

---

## 2. Deal Execution & Meeting Intelligence (New)

| Endpoint | Method | Auth | Description |
| :--- | :--- | :---: | :--- |
| `/api/admin/meetings/schedule` | `POST` | Admin | Provisions Google Meet room URL, generates dual-timezone calendar links, posts invite into `match_messages`, and updates `sourcing_matches.match_breakdown.active_meeting` |
| `/api/admin/meetings/summarize` | `POST` | Admin | Ingests call transcript/notes, extracts structured commercial intelligence via Gemini/Claude, logs summary card, and advances deal stage |
| `/api/admin/pipeline/bulk-rfq` | `POST` | Admin | Dispatches simultaneous RFQs to selected European suppliers via Resend and logs `supplier_actions` |
| `/api/admin/pipeline/generate-po` | `POST` | Admin | Generates bilingual English/Hebrew B2B Purchase Order with commercial milestone payments (30/70) |
| `/api/admin/pipeline/release-production` | `POST` | Admin | Authorizes factory production run upon confirmation of advance deposit receipt |
| `/api/buyer/request-sample` | `POST` | Buyer | Allows Israeli importers to order express DHL tasting samples with delivery address and sensory requirements |

---

## 3. Lead Ingestion & Sourcing Engine

| Endpoint | Method | Auth | Description |
| :--- | :--- | :---: | :--- |
| `/api/lead/submit` | `POST` | Public | Handles `/en/contact` form submissions, triggers AI matching, stores lead, and sends Resend notifications |
| `/api/sourcing/submit` | `POST` | Public | Handles comprehensive sourcing intake forms from the `/en/sourcing` portal |
| `/api/match/portfolio` | `POST` | Public | Real-time intent detection and portfolio scenario matching for the contact page widget |
| `/api/matching/find` | `POST` | Admin | Deep database search pairing buyer requirements against verified supplier products |

---

## 4. Catalog Scraper & Ingestion (Firecrawl v2)

| Endpoint | Method | Auth | Description |
| :--- | :--- | :---: | :--- |
| `/api/admin/scraper/products` | `POST` | Admin | Triggers Firecrawl v2 spider to scrape supplier product web pages |
| `/api/admin/products` | `GET`, `POST` | Admin | Manage product catalog entries, categories, and published flags |
| `/api/admin/import-guide` | `GET`, `POST` | Admin | CRUD operations for the 43 Israeli import regulation guides |

---

## 5. Buyer & Supplier Portal Routes

| Endpoint | Method | Auth | Description |
| :--- | :--- | :---: | :--- |
| `/api/buyer/notifications` | `GET` | Buyer | Polling endpoint for buyer deal match notifications |
| `/api/supplier-portal/notifications` | `GET` | Supplier | Polling endpoint for supplier inquiry notifications |
| `/api/suppliers/enquiry` | `POST` | Public | Direct inquiry routing from a specific supplier profile page |
| `/api/proposals/[token]` | `GET` | Public | Generates tokenized shareable product proposals for prospective retail buyers |

---

## 6. Content, Marketing & Business Card

| Endpoint | Method | Auth | Description |
| :--- | :--- | :---: | :--- |
| `/api/blog` | `GET` | Public | Retrieves published blog articles filtered by tag or language |
| `/api/newsletter` | `POST` | Public | Handles newsletter subscription requests with double-optin support |
| `/api/card/track` | `POST` | Public | Digital business card visit and interaction telemetry (`/business-card/udi`) |
| `/api/vcard/udi` | `GET` | Public | Serves direct `.vcf` contact card download |

---

## 7. Background Automation & Cron

| Endpoint | Method | Auth | Description |
| :--- | :--- | :---: | :--- |
| `/api/cron/send-reminders` | `POST` | Cron Token | Automated daily runner (09:00 UTC) checking for unresponded supplier actions (3-day and 7-day automated reminders) |
| `/api/cron/sync-products` | `POST` | Cron Token | Background catalog data health check |
