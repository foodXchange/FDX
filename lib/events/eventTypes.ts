/**
 * Catalog of `platform_events.event_type` values, grouped by journey.
 *
 * Only the types referenced in lib/events/WIRED.md-style comments below are
 * currently logged anywhere (see logEvent call sites). The rest are defined
 * here for forward-compatibility with later phases (bulk outreach, document
 * sharing, self-signup) so the column's allowed values are documented in one
 * place ahead of time.
 */
export type EventType =
  // Buyer journey
  | "buyer_signup"
  | "request_submitted" // wired: app/api/sourcing/submit
  | "request_viewed" // wired: app/en/portal/requests/[id]
  | "matches_viewed" // wired: app/en/portal/requests/[id]
  | "match_interest" // wired: app/api/buyer/interested
  | "info_requested" // wired: app/api/buyer/request-info
  | "support_message_sent" // wired: app/api/buyer/support
  | "question_asked" // wired: app/api/buyer/ask-question
  | "supplier_profile_viewed"
  | "message_sent" // wired: app/api/matches/[id]/messages
  | "deal_accepted" // wired: app/en/supplier-portal/matches/actions.ts
  | "deal_closed" // wired: app/api/matching/[id]
  // Supplier journey
  | "supplier_signup"
  | "profile_completed"
  | "matches_inbox_viewed"
  | "match_details_viewed"
  | "supplier_replied" // wired: app/en/supplier-portal/matches/actions.ts
  | "document_uploaded" // wired: app/api/matches/[id]/documents
  // Admin journey
  | "match_sent"
  | "deal_marked_won"
  | "bulk_email_sent"
  | "bulk_whatsapp_sent"
  | "rfq_sent"
  // Cron reminders
  | "supplier_action_reminder_3d"
  | "supplier_action_reminder_7d";

export type EventUserType = "buyer" | "supplier" | "admin";

export type EventEntityType = "request" | "match" | "message" | "supplier" | "deal" | "document";
