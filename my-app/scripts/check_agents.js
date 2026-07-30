require("dotenv").config({ path: "./.env.local" });
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
  // Get all agents with their lead counts
  const { data: agents } = await supabase
    .from("profiles")
    .select("id, full_name, role")
    .eq("role", "agent");

  console.log("\n=== AGENTS ===");
  console.table(agents);

  // Check which UUID is sameer
  const { data: sameer } = await supabase
    .from("profiles")
    .select("id, full_name")
    .ilike("full_name", "%sameer%");
  console.log("\n=== SAMEER PROFILE ===");
  console.table(sameer);

  const { data: ali } = await supabase
    .from("profiles")
    .select("id, full_name")
    .ilike("full_name", "%ali%");
  console.log("\n=== ALI PROFILE ===");
  console.table(ali);
}
run();
