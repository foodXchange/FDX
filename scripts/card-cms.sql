CREATE TABLE IF NOT EXISTS public.contact_cards (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  handle               text        NOT NULL UNIQUE,
  name                 text        NOT NULL,
  title                text,
  company              text,
  tagline              text,
  pitch                text,
  email                text,
  phone                text,
  whatsapp_buyer       text,
  whatsapp_manufacturer text,
  website              text,
  linkedin             text,
  photos               jsonb       DEFAULT '[]',
  active_sourcing      jsonb       DEFAULT '[]',
  published            boolean     DEFAULT true,
  updated_at           timestamp   DEFAULT now()
);

-- Seed Udi's card from current static data
INSERT INTO public.contact_cards (
  handle, name, title, company,
  tagline, pitch, email, phone,
  whatsapp_buyer, whatsapp_manufacturer,
  website, linkedin, photos, active_sourcing
) VALUES (
  'udi',
  'Udi Stryk',
  'Founder & Operator',
  'FoodXchange',
  'Connecting European manufacturers with the Israeli food market.',
  'I help Israeli food buyers find the right European manufacturer — pre-screened for specs, kosher path, and volume capacity. And I help European manufacturers enter Israel with a local partner who knows the market.',
  'info@foodz-x.com',
  '+972525222291',
  '+972525222291',
  '+972525222291',
  'https://fdx.trading',
  'https://www.linkedin.com/in/udi-stryk/',
  '[
    {"src":"/founder-udi.jpeg","alt":"Udi Stryk — FoodXchange","offsetY":0,"offsetX":0},
    {"src":"/udi-tradeshow.jpg","alt":"Meeting suppliers at international food trade show","caption":"International food trade show","offsetY":0,"offsetX":0},
    {"src":"/udi-factory.jpg","alt":"Visiting supplier logistics facility","caption":"Supplier facility visit","offsetY":0,"offsetX":0}
  ]',
  '[
    "Kosher EVOO 750ml — Chief Rabbinate",
    "Organic granola — Badatz",
    "Frozen potato wedges — kosher",
    "Canned tuna 185g — Chief Rabbinate",
    "Tomato paste retail cups — kosher"
  ]'
) ON CONFLICT (handle) DO NOTHING;
