import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkLeads() {
  const { data, error } = await supabase
    .from('leads')
    .select('name, phone, source, created_at')
    .eq('source', 'whatsapp')
    .order('created_at', { ascending: false })
    .limit(1);

  if (error) {
    console.error("Error fetching lead:", error);
  } else {
    console.log("Last WhatsApp Lead:");
    console.log(JSON.stringify(data, null, 2));
  }
}

checkLeads();
