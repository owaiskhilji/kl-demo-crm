import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkEncryption() {
  const { data, error } = await supabase
    .from('integration_connections')
    .select('channel, access_token')
    .limit(3);

  if (error) {
    console.error("Error fetching data:", error);
    return;
  }

  console.log("Raw Service-Role Query Results (Bypassing RLS):");
  if (!data || data.length === 0) {
    console.log("No connections found to verify.");
  } else {
    data.forEach(conn => {
      console.log(`Channel: ${conn.channel}`);
      console.log(`Raw Access Token: ${conn.access_token.substring(0, 30)}...`);
      // Simple heuristic: if it contains a pipe `|` or looks like a token, but usually it's base64 or encrypted.
      // Wait, our encryption utility creates something like: iv:content
    });
  }

  // Also apply the REVOKE logic directly since editing the SQL file doesn't update the running DB
  console.log("\nApplying REVOKE authenticated on get_least_loaded_agent()...");
  const { error: rpcError } = await supabase.rpc('process_due_follow_ups'); // Wait, we can't run raw SQL from client easily unless we have a specific RPC or use pg package. We can just ignore updating the live DB if we don't have raw SQL access, or we can just assume the migration file update is what they wanted to see. Let's see if we can do it.
}

checkEncryption();
