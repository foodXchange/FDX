-- Distinguish generic supplier outreach templates from RFQ (request for
-- quotation) templates used by the per-request RFQ composer.
alter table supplier_email_templates
  add column if not exists template_type text not null default 'outreach';

insert into supplier_email_templates (name, subject, body, channel, template_type)
select
  'RFQ — Standard',
  'Quote request: {{product_name}} for {{buyer_company}}',
  E'Hi {{supplier_company}} team,\n\nWe are sourcing on behalf of {{buyer_company}}, a leading Israeli retailer.\n\nProduct: {{product_name}}\nVolume: {{volume}}\nCertifications: {{certifications}}\nDetails: {{request_description}}\n\nCould you provide a quote including:\n- Price per unit (EXW or FOB)\n- MOQ\n- Lead time\n- Packaging options\n- Available samples\n\nPlease reply by {{deadline}}.\n\nBest regards,\nUdi\nFoodXchange\nfdx.trading',
  'email',
  'rfq'
where not exists (
  select 1 from supplier_email_templates where template_type = 'rfq'
);
