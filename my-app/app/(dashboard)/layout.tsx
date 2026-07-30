import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { Toaster } from "@/components/ui/sonner";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();

  if (!data?.claims) {
    redirect("/login");
  }

  // Fetch the user's profile to pass role down
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", data.claims.sub)
    .single();

  const userRole = profile?.role || "agent";
  const userAvatar = profile?.avatar_url || "";
  const userName = profile?.full_name || "User";

  return (
    <div className="flex min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <Sidebar role={userRole} />
      <div className="flex flex-1 flex-col sm:ml-64 min-w-0">
        <Topbar role={userRole} avatar={userAvatar} name={userName} userId={data.claims.sub} />
        <main className="flex-1 overflow-x-hidden p-4 sm:p-6 min-w-0">
          {children}
        </main>
      </div>
      <Toaster richColors position="bottom-right" />
    </div>
  );
}
