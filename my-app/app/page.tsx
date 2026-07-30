import { redirect } from "next/navigation";

export default function Home() {
  // Directly redirect the root path (/) to /dashboard
  // The proxy.ts middleware will automatically handle routing unauthenticated users from /dashboard to /login
  redirect("/dashboard");
}
