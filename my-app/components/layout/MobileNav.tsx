"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  LayoutDashboard,
  Users,
  Kanban,
  CalendarClock,
  Building2,
  UserCog,
  Webhook,
  BarChart3,
} from "lucide-react";

interface MobileNavProps {
  role: string;
}

const routes = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["owner", "manager", "agent"] },
  { href: "/leads", label: "Leads", icon: Users, roles: ["owner", "manager", "agent"] },
  { href: "/pipeline", label: "Pipeline", icon: Kanban, roles: ["owner", "manager", "agent"] },
  { href: "/follow-ups", label: "Follow-Ups", icon: CalendarClock, roles: ["owner", "manager", "agent"] },
  { href: "/properties", label: "Properties", icon: Building2, roles: ["owner", "manager", "agent"] },
  { href: "/agents", label: "Agents", icon: UserCog, roles: ["owner", "manager"] },
  { href: "/integrations", label: "Integrations", icon: Webhook, roles: ["owner", "manager"] },
  { href: "/reports", label: "Reports", icon: BarChart3, roles: ["owner", "manager", "agent"] },
];

export function MobileNav({ role }: MobileNavProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const filteredRoutes = routes.filter((route) => route.roles.includes(role));

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger className="sm:hidden p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-colors focus:outline-none">
        <Menu className="h-5 w-5" />
        <span className="sr-only">Toggle navigation menu</span>
      </SheetTrigger>
      <SheetContent side="left" className="w-64 p-0">
        <SheetHeader className="h-16 flex items-start justify-center border-b px-6 border-zinc-200 dark:border-zinc-800">
          <SheetTitle className="text-left">
            <Link href="/dashboard" onClick={() => setOpen(false)} className="flex items-center gap-2.5 transition-opacity hover:opacity-90">
              <span className="font-bold tracking-tight text-lg text-zinc-900 dark:text-zinc-50">KL Demo CRM</span>
            </Link>
          </SheetTitle>
        </SheetHeader>
        <nav className="overflow-y-auto py-4">
          <ul className="grid gap-1 px-3">
            {filteredRoutes.map((route) => {
              const isActive = pathname.startsWith(route.href);
              const Icon = route.icon;
              
              return (
                <li key={route.href}>
                  <Link
                    href={route.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-primary/10 text-primary font-semibold dark:bg-primary/20 dark:text-primary-foreground"
                        : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800/50 dark:hover:text-zinc-50"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {route.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </SheetContent>
    </Sheet>
  );
}
