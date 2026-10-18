# FoodXchange (FDX.TRADING)

> **B2B Food Sourcing & Matching Platform Connecting European Manufacturers with Israeli Food Importers & Retailers.**

---

## 📖 Overview

**FoodXchange** bridges European food and beverage producers with the Israeli food retail and HoReCa sectors. The platform pairs AI-driven intent parsing and product taxonomy scraping with managed business-to-business deal facilitation, ensuring compliance with Israeli import requirements, Chief Rabbinate kosher standards, and private label specifications.

- **Production URL**: [https://fdx.trading](https://fdx.trading)
- **Staging / Dev**: [http://localhost:3000](http://localhost:3000)
- **Hosting**: Netlify
- **Primary Admin**: `udi@fdx.trading`

---

## 🛠️ Technology Stack

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Framework** | Next.js 16 (App Router + Turbopack) | Modern server components, static generation & API routes |
| **Language** | TypeScript 5 & Node.js 20 | Strict type safety across client and server |
| **Styling** | Tailwind CSS v4 | High-contrast dark theme and responsive design |
| **Database & Auth** | Supabase (PostgreSQL + RLS + Storage) | Relational data, product catalog, media storage & sessions |
| **AI & NLP** | Anthropic Claude SDK & Perplexity API | Sourcing intent extraction, taxonomy tagging & semantic matching |
| **Web Scraping** | Firecrawl v2 (`@mendable/firecrawl-js`) | Automated supplier catalog extraction |
| **Email Delivery** | Resend API | Transactional lead alerts, notifications & supplier outreach |
| **Error Monitoring** | Sentry (`@sentry/nextjs`) | Real-time crash monitoring and trace performance |
| **Analytics** | Next-Plausible | Privacy-first site traffic analytics |

---

## 📚 Repository Documentation

Detailed technical and product guides are maintained in [`/docs`](./docs):

- **[Product Story & Workflow (`docs/PRODUCT_STORY.md`)](./docs/PRODUCT_STORY.md)**: What we build, buyer and manufacturer personas, and the end-to-end deal lifecycle.
- **[System Architecture & Tech Stack (`docs/ARCHITECTURE.md`)](./docs/ARCHITECTURE.md)**: Cloud services, data models, database tables, and security mechanisms.
- **[API Directory & Data Flow (`docs/API_DIRECTORY.md`)](./docs/API_DIRECTORY.md)**: Complete catalog of all `/api/*` endpoints, payloads, and integrations.
- **[Admin Operations Guide (`docs/ADMIN_GUIDE.md`)](./docs/ADMIN_GUIDE.md)**: Step-by-step instructions for managing sourcing requests, matches, and scraper jobs.

---

## 🚀 Getting Started

### 1. Prerequisites
- Node.js `v20.x` or higher
- npm `v10.x` or higher

### 2. Environment Variables
Create a `.env.local` file in the project root with the following variables:

```bash
# Admin Authentication
ADMIN_PASSWORD="<your-admin-password>"
ADMIN_SESSION_SECRET="<random-hmac-sha256-secret>"

# Supabase
NEXT_PUBLIC_SUPABASE_URL="https://<project-ref>.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="<public-anon-key>"
SUPABASE_SERVICE_ROLE_KEY="<service-role-key>"

# AI Providers
AI_PROVIDER="anthropic" # or "openai"
ANTHROPIC_API_KEY="sk-ant-..."
PERPLEXITY_API_KEY="pplx-..."

# Email (Resend)
RESEND_API_KEY="re_..."
RESEND_FROM_EMAIL="FoodXchange <info@fdx.trading>"
RESEND_FROM="FoodXchange <info@fdx.trading>"
NOTIFY_EMAIL_TO="udi@fdx.trading"

# Scraper
FIRECRAWL_API_KEY="fc-..."

# Sentry
NEXT_PUBLIC_SENTRY_DSN="https://..."
SENTRY_AUTH_TOKEN="sntryu_..."
SENTRY_ORG="foodxchange"
SENTRY_PROJECT="foodxchange"
```

### 3. Installation & Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to view the application.

---

## 🧪 Scripts & Quality Assurance

```bash
npm run typecheck    # Validate TypeScript types across the entire project
npm run lint         # Run ESLint validation
npm run build        # Build production bundle
npm run predeploy    # Run typecheck followed by build check
```

---

## 🔒 Security & Admin Access

The platform operates on a single-administrator model:
- Access portal: `/admin/login`
- Login utilizes direct master password validation protected by client/server rate-limiting and lockout timers.
- Sessions are secured with an HTTP-only, SameSite=Lax HMAC-signed cookie (`admin_session`).
