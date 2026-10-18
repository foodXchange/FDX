# FoodXchange — Product Story & Business Logic

## 1. What We Build

**FoodXchange (`FDX.TRADING`)** is an international food sourcing platform purpose-built for the Israeli market. It solves two critical challenges in modern food distribution:

1. **For Israeli Retailers, Wholesalers & HoReCa Importers**:
   - Finding reliable, certified European suppliers capable of meeting strict Israeli food standards, kosher certifications (Chief Rabbinate, Badatz, OU, OK), and Hebrew packaging/labeling laws.
   - Sourcing private label (own-brand) products with tailored recipe formulations, retail-ready multipacks, and consistent supply chains.
2. **For European Manufacturers & Exporters**:
   - Gaining compliant, direct access to the high-demand Israeli food market without getting lost in local regulatory, bureaucratic, or language hurdles.

---

## 2. Core Value Propositions

- **Curated European Database**: Over 600+ kosher-certified food products across 17 distinct categories (Olive oil, Italian tomato products, pulses & legumes, snacks, dairy, frozen foods, organic & natural goods).
- **Hybrid Semantic + Constraint Matching Engine**: Natural language sourcing request parsing powered by Claude and Voyage AI (`voyage-3` 1024-d dense vectors). Matches semantic product descriptions while strictly honoring hard trade gates (packaging formats, temperature regimes, and private label availability).
- **Automated Supplier Ingestion**: Automated web catalog scraping via **Firecrawl v2** that parses supplier website inventories directly into structured database rows.
- **Dedicated Founder Guidance**: Every match and sourcing inquiry is vetted and facilitated directly by Udi Stryk (`udi@fdx.trading`), ensuring high trust and smooth deal execution.

---

## 3. End-to-End User Journeys

### Complete Cross-Platform Deal Flow
```mermaid
sequenceDiagram
    autonumber
    box rgb(15, 23, 42) Israeli Buyer Side
    actor Buyer as Israeli Buyer / Retailer
    participant Portal as FDX Web & Match Widget
    end

    box rgb(30, 41, 59) FDX Core System
    participant AI as AI Engine (Claude + Voyage AI)
    participant DB as Supabase DB (pgvector)
    participant Admin as Udi Stryk (Admin)
    end

    box rgb(15, 23, 42) European Seller Side
    actor Seller as European Manufacturer
    end

    %% Step 1: Ingestion
    Note over Seller, Admin: Seller Onboarding & Catalog Discovery
    Seller->>Admin: Registers domain / product catalog
    Admin->>AI: Runs Firecrawl spider on supplier domain
    AI->>DB: Stores normalized products + Voyage document embeddings

    %% Step 2: Buyer Inquiry
    Note over Buyer, Portal: Buyer Inquiry & Matching
    Buyer->>Portal: Enters request on /en/contact or /en/sourcing
    Portal->>AI: Extracts Product Intent Profile (PIP)
    AI->>AI: Voyage AI creates 1024-d query embedding
    AI->>DB: Executes match_v3() hybrid ranking (0–110 pts)
    DB-->>Portal: Surfaces matching past scenarios & products
    Portal->>DB: Inserts new `sourcing_requests` record
    Portal->>Admin: Dispatches lead alert to udi@fdx.trading via Resend

    %% Step 3: Deal Facilitation
    Note over Admin, Seller: Trade Qualification & Execution
    Admin->>DB: Reviews top-ranked matches in /admin
    Admin->>Seller: Creates `supplier_actions` outreach inquiry
    Seller-->>Admin: Confirms batch lead times, pricing, and kosher docs
    Admin->>Buyer: Presents formal supplier match & proposal
    Buyer->>Seller: Contract signed & production commences
```

---

## 4. Key Target Personas

### A. The Israeli Food Buyer
- **Supermarket Chains & Category Managers**: Sourcing private label shelf staples (pasta, canned tomatoes, EVOO, bakery) with cost advantage and Israeli labelling compliance.
- **HoReCa & Foodservice Wholesalers**: Sourcing bulk formats (2.5kg / 5kg cans, 10L aseptic bags, IQF fruits and vegetables).
- **Specialty & Health Importers**: Sourcing organic, vegan, gluten-free, and high-protein snack lines.

### B. The European Manufacturer / Exporter
- Producers in Spain, Italy, France, Greece, Poland, Germany, and Belgium seeking stable, high-margin export markets in Israel without dealing directly with Israeli retail bureaucracy.

---

## 5. How Matching Drives Business Value

By combining **Voyage AI’s `voyage-3` embeddings** for semantic similarity with **deterministic SQL rules** (for packaging, channels, and certifications), FoodXchange avoids the false positives of keyword search and the hallucination risks of pure generative AI. A buyer looking for *"70g tomato cups 22 brix"* is matched directly with Mediterranean tomato processors equipped with cup packaging lines, cutting weeks of manual procurement research down to seconds.
