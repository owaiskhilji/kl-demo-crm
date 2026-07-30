"use client";

import { Bell, CheckCircle2 } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNotifications } from "@/lib/hooks/useNotifications";
import { formatDistanceToNow } from "date-fns";

export function NotificationBell({ userId }: { userId: string }) {
  const { notifications, dismiss } = useNotifications(userId);
  const unreadCount = notifications.length;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="relative inline-flex items-center justify-center rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
          <span className="sr-only">Notifications</span>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent className="w-[calc(100vw-1rem)] sm:w-80" align="end">
        <div className="flex justify-between items-center px-1.5 py-1 text-xs font-medium text-muted-foreground">
          <span>Notifications</span>
          {unreadCount > 0 && (
            <span className="text-xs font-normal text-zinc-500 dark:text-zinc-400">
              {unreadCount} unread
            </span>
          )}
        </div>
        <DropdownMenuSeparator />
        
        <div className="max-h-[300px] overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
              <CheckCircle2 className="mx-auto h-8 w-8 text-zinc-300 dark:text-zinc-700 mb-2" />
              You're all caught up!
            </div>
          ) : (
            notifications.map((notif) => (
              <DropdownMenuItem 
                key={notif.id} 
                className="flex flex-col items-start gap-1 p-3 cursor-pointer focus:bg-zinc-50 dark:focus:bg-zinc-800"
                onClick={(e) => {
                  e.preventDefault(); // Keep dropdown open optionally, or let it close. We'll dismiss it.
                  dismiss(notif.id);
                }}
              >
                <div className="flex justify-between w-full items-start gap-2">
                  <span className="font-medium text-sm leading-tight text-zinc-900 dark:text-zinc-100">
                    {notif.message}
                  </span>
                  <span className="text-[10px] text-zinc-500 shrink-0 whitespace-nowrap">
                    {notif.due_at ? formatDistanceToNow(new Date(notif.due_at), { addSuffix: true }) : ''}
                  </span>
                </div>
                <div className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                  Mark as read
                </div>
              </DropdownMenuItem>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
