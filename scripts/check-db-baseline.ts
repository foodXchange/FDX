import "dotenv/config";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

async function run() {
  const { count: pipCount } = await supabaseAdmin
    .from("pips").select("id", { count: "exact", head: true });
  const { count: gdCount } = await supabaseAdmin
    .from("pip_grouping_decisions").select("id", { count: "exact", head: true });
  console.log("pips count:", pipCount);
  console.log("pip_grouping_decisions count:", gdCount);
}
run().catch(console.error);
