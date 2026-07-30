import { SupabaseClient } from "@supabase/supabase-js";

/**
 * Finds the ID of the agent with the fewest currently open leads.
 * Uses the get_least_loaded_agent RPC to ensure thread-safe DB-level evaluation.
 * 
 * @param supabase The Supabase client (can be authenticated or service-role)
 * @returns The UUID of the least-loaded agent, or null if no agents exist.
 */
export async function getLeastLoadedAgent(supabase: SupabaseClient): Promise<string | null> {
  const { data, error } = await supabase.rpc("get_least_loaded_agent");

  if (error) {
    console.error("[getLeastLoadedAgent] RPC error:", error.message);
    return null;
  }

  return data || null;
}
