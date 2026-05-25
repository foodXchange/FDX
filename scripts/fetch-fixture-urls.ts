import "dotenv/config";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const ids = [
  "a162fd0f-d71c-48f8-b58d-870f9e24d5d2",
  "6127b218-4738-4465-b030-6994c3b9ea13",
];

async function run() {
  const { data, error } = await supabaseAdmin
    .from("request_images")
    .select("id, url")
    .in("id", ids);
  if (error) { console.error(error); process.exit(1); }
  console.log(JSON.stringify(data, null, 2));
}

run();
