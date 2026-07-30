require("dotenv").config({ path: "./.env.local" });
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
  console.log("\n=== LEADS ===");
  const { data: leads, error: e1 } = await supabase
    .from("leads")
    .select("id, name, assigned_to, assignment_type");
  if (e1) console.error(e1);
  else console.table(leads);

  console.log("\n=== LEAD ACTIVITIES (AGENT_REASSIGNED) ===");
  const { data: activities, error: e2 } = await supabase
    .from("lead_activities")
    .select("lead_id, action, new_value")
    .eq("action", "AGENT_REASSIGNED");
  if (e2) console.error(e2);
  else console.table(activities);

  console.log("\n=== AUDIT LOGS (BULK_REASSIGN) ===");
  const { data: auditLogs, error: e3 } = await supabase
    .from("audit_logs")
    .select("actor_id, action, target_id, details")
    .eq("action", "BULK_REASSIGN");
  if (e3) console.error(e3);
  else console.table(auditLogs);
}

run();
