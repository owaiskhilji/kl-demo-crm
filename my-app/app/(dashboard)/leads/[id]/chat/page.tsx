import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import ChatInterface from "./ChatInterface";

export const metadata = {
  title: "Lead Chat | KL Demo CRM",
};

export default async function LeadChatPage({ params }: { params: { id: string } }) {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getClaims();

  if (!authData?.claims) {
    redirect("/login");
  }

  // Verify lead access and fetch initial data
  const { data: lead, error: leadError } = await supabase
    .from("leads")
    .select("id, name, source")
    .eq("id", params.id)
    .single();

  if (leadError || !lead) {
    redirect("/dashboard/leads");
  }

  // Only allow chat for whatsapp/instagram/facebook sources
  if (!["whatsapp", "instagram", "facebook"].includes(lead.source || "")) {
    return (
      <div className="p-8">
        <h2 className="text-xl font-semibold mb-2">Messaging Not Available</h2>
        <p className="text-zinc-600 dark:text-zinc-400">
          Messaging is only available for leads from WhatsApp, Facebook, or Instagram. This lead came from {lead.source || "unknown source"}.
        </p>
      </div>
    );
  }

  // Fetch initial messages
  const { data: initialMessages, error: messagesError } = await supabase
    .from("message_log")
    .select("*")
    .eq("lead_id", params.id)
    .order("created_at", { ascending: true });

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] p-4 md:p-6 max-w-4xl mx-auto w-full">
      <div className="mb-4">
        <h1 className="text-2xl font-bold tracking-tight">Chat with {lead.name}</h1>
        <p className="text-sm text-zinc-500 capitalize">{lead.source} Integration</p>
      </div>
      <ChatInterface 
        leadId={params.id} 
        leadSource={lead.source}
        initialMessages={initialMessages || []} 
      />
    </div>
  );
}
