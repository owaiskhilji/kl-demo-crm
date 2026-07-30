require("dotenv").config({ path: "./.env.local" });
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
  // 1. Check for backlogged follow-ups that could flood notifications
  const { data: backlogged, error: err1 } = await supabase
    .from("follow_ups")
    .select("id, agent_id, scheduled_at, notified, is_done, leads(name)")
    .eq("notified", false)
    .eq("is_done", false)
    .lt("scheduled_at", new Date().toISOString().split("T")[0] + "T00:00:00.000Z");

  if (err1) {
    console.error("Backlog query error:", err1);
  } else {
    console.log(`\n=== BACKLOGGED FOLLOW-UPS (notified=false, date < today) ===`);
    console.log(`Count: ${backlogged.length}`);
    if (backlogged.length > 0) console.table(backlogged);
    else console.log("None found — safe to proceed.");
  }

  // 2. Check total follow-ups state
  const { data: allFollowUps, error: err2 } = await supabase
    .from("follow_ups")
    .select("id, scheduled_at, notified, is_done")
    .order("scheduled_at", { ascending: true });

  if (err2) {
    console.error("All follow-ups query error:", err2);
  } else {
    console.log(`\n=== ALL FOLLOW-UPS SUMMARY ===`);
    console.log(`Total: ${allFollowUps.length}`);
    console.table(allFollowUps);
  }
}
run();
