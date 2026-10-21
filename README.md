# FoodXchange (FDX.TRADING)

> **B2B Food Sourcing & Deal Execution Platform Connecting European Food Manufacturers with Israeli Importers, Supermarket Chains & HoReCa.**

---

## 📖 Overview

**FoodXchange** bridges European food and beverage producers with the Israeli food retail and HoReCa sectors. The platform combines AI-driven sourcing intent parsing, catalog web scraping, and an institutional 6-stage deal facilitation desk — ensuring full compliance with Israeli import regulations, Chief Rabbinate kosher standards, and private-label packaging requirements.

- **Production URL**: [https://fdx.trading](https://fdx.trading)
- **Staging / Dev**: [http://localhost:3000](http://localhost:3000)
- **Hosting**: Netlify Edge CDN
- **Deal Desk**: `udi@fdx.trading`

---

## 🛠️ Technology Stack

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Framework** | Next.js 16 (App Router + Turbopack) | High-performance React server components, static generation & API routes |
| **Language** | TypeScript 5 & Node.js 20 | Strict static type safety across client and server |
| **Styling** | Tailwind CSS v4 | Dark-theme optimized design system with high-contrast UI components |
| **Database & Auth** | Supabase (PostgreSQL + pgvector + RLS) | Relational deal tables, product catalog, vector embeddings, sessions & storage |
| **Vector Embeddings** | Voyage AI (`voyage-3`) | 1024-dimensional dense semantic representations of buyer inquiries & products |
| **Dual AI Engines** | Google Gemini 2.0 & Anthropic Claude 3.5 | Sourcing intent parsing (PIP), call transcript summarization & catalog extraction |
| **Web Scraping** | Firecrawl v2 (`@mendable/firecrawl-js`) | Deep spidering of European factory websites and dynamic JavaScript catalogs |
| **Video & Scheduling** | Google Meet & Calendar API Engine | Instant room provisioning, 1-click calendar invites & dual-timezone alignment (Israel/Europe) |
| **Email Delivery** | Resend API | Transactional lead alerts, bulk RFQ outreach & automated supplier reminders |
| **Error Monitoring** | Sentry (`@sentry/nextjs`) | Real-time crash monitoring and production trace telemetry |
| **Analytics** | Next-Plausible | Privacy-first site traffic and conversion analytics |

---

## 🌟 The 6-Stage B2B Sourcing Lifecycle

FoodXchange provides a complete transaction desk spanning the entire B2B sourcing lifecycle:

```
[ 1. Inquiry & AI Match ] ➔ [ 2. Bulk RFQ ] ➔ [ 3. Tasting Samples ] ➔ [ 4. Meet & AI Call ] ➔ [ 5. Bilingual PO ] ➔ [ 6. Production & Vessel ]
```

1. **Inquiry & Semantic Matching (`match_v3`)**: Hybrid ranking combining Voyage AI 1024-d dense vectors with deterministic trade gates (packaging formats, temperature regimes, private-label capabilities).
2. **Bulk RFQ Outreach**: 1-click simultaneous outreach to verified European producers with CIF Haifa/Ashdod target pricing.
3. **Physical Tasting Samples Hub**: Express courier tracking (DHL/FedEx AWB) and 5-dimension sensory scorecard (Taste, Texture, Packaging, Shelf life, Retail fit).
4. **Google Meet & AI Intelligence**: Instant video calls with dual-timezone synchronization (Israel IDT vs. Europe CEST) and AI extraction of commercial agreements, CIF terms, and action items.
5. **Bilingual B2B Purchase Orders**: Contract generation with institutional 30/70 payment milestone splits (30% advance / 70% against Bill of Lading copy).
6. **Packaging Compliance & Production Release**: Israeli Standard SI 1145 audit, Front-of-Package Red Badges calculation, Chief Rabbinate supervision schedules, and vessel tracking into Israeli ports.

---

## 📚 Repository Documentation Center

Detailed technical specifications and operational SOPs are maintained in [`/docs`](./docs):

- **[Product Story & Deal Lifecycle (`docs/PRODUCT_STORY.md`)](./docs/PRODUCT_STORY.md)**: Platform mission, buyer/supplier personas, and the complete 6-stage lifecycle.
- **[System Architecture & Data Model (`docs/ARCHITECTURE.md`)](./docs/ARCHITECTURE.md)**: Cloud topology, AI engine specifications, Supabase ER diagram, and security architecture.
- **[API Directory & Endpoints (`docs/API_DIRECTORY.md`)](./docs/API_DIRECTORY.md)**: Complete catalog of backend routes, payloads, and authentication rules.
- **[Admin Operations Guide & Playbook (`docs/ADMIN_GUIDE.md`)](./docs/ADMIN_GUIDE.md)**: Step-by-step SOPs for managing sourcing requests, bulk RFQs, meetings, and POs.
- **[Strategic Roadmap & Milestones (`docs/ROADMAP.md`)](./docs/ROADMAP.md)**: Completed milestones, active tasks, and upcoming quarterly roadmaps.

---

## 🚀 Getting Started

### 1. Prerequisites
- Node.js `v20.x` or higher
- npm `v10.x` or higher

### 2. Environment Variables
Create a `.env.local` file in the project root with the following keys:

```bash
# Admin Authentication
ADMIN_PASSWORD="<your-admin-password>"
ADMIN_SESSION_SECRET="<random-hmac-sha256-secret>"
ADMIN_EMAILS="udi@fdx.trading"

# Supabase
NEXT_PUBLIC_SUPABASE_URL="https://<project-ref>.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="<public-anon-key>"
SUPABASE_SERVICE_ROLE_KEY="<service-role-key>"

# AI Providers
AI_PROVIDER="gemini" # or "anthropic"
GEMINI_API_KEY="AIzaSy..."
ANTHROPIC_API_KEY="sk-ant-..."
VOYAGE_API_KEY="pa-..."

# Email (Resend)
RESEND_API_KEY="re_..."
RESEND_FROM_EMAIL="FoodXchange <info@fdx.trading>"
RESEND_FROM="FoodXchange <info@fdx.trading>"
NOTIFY_EMAIL_TO="udi@fdx.trading"

# Web Scraper
FIRECRAWL_API_KEY="fc-..."

# Telemetry
NEXT_PUBLIC_SENTRY_DSN="https://..."
```

### 3. Installation & Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

---

## 🧪 Quality Assurance & Typecheck

```bash
# Run full TypeScript compiler verification
npx tsc --project tsconfig.json --noEmit

# Run project linting
npm run lint
```
