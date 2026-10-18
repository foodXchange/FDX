export type NotificationType =
  | "new_request"
  | "match_sent"
  | "response"
  | "lead"
  | "system"
  | "match_reply"
  | "match_message"
  | "supplier_signup"
  | "reminder"
  | "follow_up"
  | "qa_alert";

export type AdminNotification = {
  id: string;
  type: NotificationType;
  title: string;
  message: string | null;
  data: Record<string, unknown> | null;
  read: boolean;
  read_at: string | null;
  created_at: string;
  expires_at: string;
  is_operational?: boolean;
  action_url?: string;
  priority?: "normal" | "high" | "urgent";
};
