import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { MetaConnectCard } from "@/components/integrations/MetaConnectCard";
import { WebhookStatus } from "@/components/integrations/WebhookStatus";

export default async function IntegrationsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // RLS-pattern authorization: Only owner/manager can view/manage integrations
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "owner" && profile?.role !== "manager") {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-center text-zinc-500">
        You do not have permission to manage integrations.
      </div>
    );
  }

  const adminSupabase = createAdminClient();
  const { data: connections } = await adminSupabase
    .from("integration_connections")
    .select("*")
    .order("created_at", { ascending: false });

  const fbConnection = connections?.find(c => c.channel === "facebook");
  const waConnection = connections?.find(c => c.channel === "whatsapp");
  const igConnection = connections?.find(c => c.channel === "instagram");

  // Feature flag to control visible channels in the UI. Defaults to all if not set.
  const enabledChannelsStr = process.env.ENABLED_CHANNELS || "facebook,instagram,whatsapp";
  const enabledChannels = enabledChannelsStr.split(",").map(c => c.trim().toLowerCase());

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Integrations</h1>
        <p className="mt-2 text-zinc-500 dark:text-zinc-400">
          Manage connections to external channels for automated lead ingestion.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {enabledChannels.includes("facebook") && (
          <MetaConnectCard 
            channel="facebook" 
            title="Facebook Lead Ads" 
            description="Connect your Page to automatically ingest leads from your ad campaigns."
            connection={fbConnection} 
          />
        )}
        {enabledChannels.includes("whatsapp") && (
          <MetaConnectCard 
            channel="whatsapp" 
            title="WhatsApp API" 
            description="Connect WhatsApp to receive inbound messages and create leads automatically."
            connection={waConnection} 
          />
        )}
        {enabledChannels.includes("instagram") && (
          <MetaConnectCard 
            channel="instagram" 
            title="Instagram DMs" 
            description="Connect Instagram to ingest leads directly from direct messages."
            connection={igConnection} 
          />
        )}
      </div>

      <div className="mt-12">
        <WebhookStatus />
      </div>
    </div>
  );
}
