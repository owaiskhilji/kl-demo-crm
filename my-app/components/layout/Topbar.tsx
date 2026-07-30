"use client";

import { Bell } from "lucide-react";
import { useRouter } from "next/navigation";
import { MobileNav } from "./MobileNav";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { NotificationBell } from "./NotificationBell";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { logoutAction } from "@/app/(auth)/login/actions";

interface TopbarProps {
  role: string;
  avatar?: string;
  name?: string;
  userId: string;
}

export function Topbar({ role, avatar, name, userId }: TopbarProps) {
  const router = useRouter();
  
  const initials = name 
    ? name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
    : 'U';

  const handleLogout = async () => {
    await logoutAction();
    router.push("/login");
    router.refresh();
  };

  return (
    <header className="sticky top-0 z-40 flex h-14 sm:h-16 items-center border-b bg-white dark:bg-zinc-950 dark:border-zinc-800 px-3 sm:px-6 w-full">
      <div className="flex items-center shrink-0">
        <MobileNav role={role} />
      </div>

      <div className="ml-auto flex items-center gap-2 sm:gap-4">
        <NotificationBell userId={userId} />

        <DropdownMenu>
          <DropdownMenuTrigger className="relative h-8 w-8 rounded-full focus:outline-none shrink-0">
            <Avatar className="h-8 w-8 shrink-0">
              <AvatarImage src={avatar} alt={name} />
              <AvatarFallback className="bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50">{initials}</AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end">
            <div className="font-normal px-1.5 py-1 text-xs text-muted-foreground">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none text-foreground">{name}</p>
                <p className="text-xs leading-none text-zinc-500 dark:text-zinc-400">
                  {role.charAt(0).toUpperCase() + role.slice(1)}
                </p>
              </div>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950 cursor-pointer">
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
