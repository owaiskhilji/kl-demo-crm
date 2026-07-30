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

async function check() {
  // Query 1: pg_policies
  const res1 = await supabase.from('pg_policies').select('policyname, cmd').eq('tablename', 'leads');
  console.log("pg_policies (leads):", res1.data, res1.error);

  // Query 2: routine_privileges
  const res2 = await supabase.from('routine_privileges').select('grantee').eq('routine_name', 'get_least_loaded_agent');
  console.log("routine_privileges:", res2.data, res2.error);
  
  // Query 3: storage policies
  const res3 = await supabase.from('pg_policies').select('policyname').eq('tablename', 'objects').eq('schemaname', 'storage');
  console.log("pg_policies (storage.objects):", res3.data, res3.error);
}

check();
