import { supabaseAdmin } from "@/lib/supabaseAdmin";
import type { EventType, EventUserType, EventEntityType } from "./eventTypes";

export async function logEvent(
  userId: string | null,
  userType: EventUserType,
  eventType: EventType,
  entityType?: EventEntityType,
  entityId?: string,
  eventData?: Record<string, unknown>
): Promise<void> {
  const { error } = await supabaseAdmin.from("platform_events").insert({
    user_id: userId,
    user_type: userType,
    event_type: eventType,
    entity_type: entityType ?? null,
    entity_id: entityId ?? null,
    metadata: eventData ?? null,
  });

  if (error) {
    console.error("logEvent failed:", error.message);
  }
}
