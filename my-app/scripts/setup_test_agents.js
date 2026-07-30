require("dotenv").config({ path: "./.env.local" });
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function setup() {
  console.log("Creating Test Agent A...");
  const { data: a, error: errA } = await supabase.auth.admin.createUser({
    email: "agent_a@test.com",
    password: "Password123!",
    email_confirm: true,
  });
  if (errA && errA.status !== 422) { // 422 means already exists
    console.error("Error Agent A:", errA);
    return;
  }

  console.log("Creating Test Agent B...");
  const { data: b, error: errB } = await supabase.auth.admin.createUser({
    email: "agent_b@test.com",
    password: "Password123!",
    email_confirm: true,
  });
  if (errB && errB.status !== 422) {
    console.error("Error Agent B:", errB);
    return;
  }

  const idA = a?.user?.id;
  const idB = b?.user?.id;

  if (idA && idB) {
    console.log("Setting profiles...");
    const { error: profErr } = await supabase.from("profiles").upsert([
      { id: idA, full_name: "Test Agent A", role: "agent" },
      { id: idB, full_name: "Test Agent B", role: "agent" }
    ]);
    if (profErr) console.log("Profiles warning (might exist):", profErr.message);

    console.log("Assigning 3 leads to Agent A...");
    await supabase.from("leads").insert([
      { name: "Dummy Lead 1", phone: "111", stage: "new_lead", assigned_to: idA, assignment_type: "manual" },
      { name: "Dummy Lead 2", phone: "222", stage: "new_lead", assigned_to: idA, assignment_type: "manual" },
      { name: "Dummy Lead 3", phone: "333", stage: "new_lead", assigned_to: idA, assignment_type: "manual" }
    ]);

    console.log("\n=========================");
    console.log("SETUP COMPLETE!");
    console.log("Agent A (Heavily Loaded): agent_a@test.com / Password123!");
    console.log("Agent B (Least Loaded): agent_b@test.com / Password123!");
    console.log(`UUID A: ${idA}`);
    console.log(`UUID B: ${idB}`);
    console.log("=========================\n");
  }
}

setup();
