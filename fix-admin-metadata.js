import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

const userId = "36956b21-2f23-4b8b-b891-6a2fa39aef2a";

(async () => {
  console.log(`Updating user ${userId} with role: admin...`);

  const { data, error } = await supabase.auth.admin.updateUserById(userId, {
    user_metadata: {
      role: "admin",
    },
  });

  if (error) {
    console.error("❌ Error updating user:", error.message);
    process.exit(1);
  }

  console.log("✅ User updated successfully");
  console.log("New metadata:", data.user?.user_metadata);
})();