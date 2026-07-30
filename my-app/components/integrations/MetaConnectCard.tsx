"use client";

import { Button } from "@/components/ui/button";
import { Calendar, CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { getMetaOAuthUrl } from "@/app/(dashboard)/integrations/actions";
import { useState } from "react";

export function MetaConnectCard({ channel, title, description, connection }: any) {
  const [isConnecting, setIsConnecting] = useState(false);
  const isConnected = connection && connection.status === "active";
  const isExpired = connection && connection.status === "expired";

  const handleConnect = async () => {
    try {
      setIsConnecting(true);
      const url = await getMetaOAuthUrl(channel);
      window.location.href = url;
    } catch (error) {
      console.error(`Failed to start OAuth for ${channel}:`, error);
      setIsConnecting(false);
      alert("Failed to initiate connection. Check your permissions.");
    }
  };

  return (
    <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 bg-white dark:bg-black shadow-sm flex flex-col justify-between h-full relative overflow-hidden">
      {/* Top right status indicator */}
      <div className="absolute top-6 right-6">
        {isConnected && <CheckCircle2 className="w-5 h-5 text-green-500" />}
        {isExpired && <AlertCircle className="w-5 h-5 text-red-500" />}
      </div>

      <div>
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-2 pr-8">{title}</h3>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6 min-h-[40px]">{description}</p>
        
        {connection ? (
          <div className="space-y-3 mb-6 p-4 bg-zinc-50 dark:bg-zinc-900/50 rounded-lg border border-zinc-100 dark:border-zinc-800">
            {connection.page_id && (
              <div className="text-sm flex flex-col">
                <span className="text-xs font-medium text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1">Page ID</span>
                <span className="font-mono text-zinc-700 dark:text-zinc-300">{connection.page_id}</span>
              </div>
            )}
            {connection.phone_number_id && (
              <div className="text-sm flex flex-col mt-3">
                <span className="text-xs font-medium text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1">Phone Number ID</span>
                <span className="font-mono text-zinc-700 dark:text-zinc-300">{connection.phone_number_id}</span>
              </div>
            )}
            
            <div className="text-sm flex flex-col mt-3">
              <span className="text-xs font-medium text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1">Status</span>
              <span className={`font-medium ${isConnected ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {connection.status.toUpperCase()}
              </span>
            </div>
            
            {connection.token_expires_at && (
              <div className="text-sm flex items-center gap-2 text-zinc-500 dark:text-zinc-400 mt-3 pt-3 border-t border-zinc-200 dark:border-zinc-800">
                <Calendar className="w-3.5 h-3.5" />
                <span>Expires: {format(new Date(connection.token_expires_at), "MMM d, yyyy")}</span>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3 mb-6 p-4 bg-zinc-50/50 dark:bg-zinc-900/20 rounded-lg border border-dashed border-zinc-200 dark:border-zinc-800 flex items-center justify-center min-h-[120px]">
            <span className="text-sm text-zinc-400 dark:text-zinc-500">Not connected</span>
          </div>
        )}
      </div>

      <Button 
        onClick={handleConnect} 
        disabled={isConnecting}
        variant={isConnected ? "outline" : "default"}
        className="w-full mt-auto"
      >
        {isConnecting ? (
          <>
            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            Connecting...
          </>
        ) : isConnected ? (
          "Reconnect"
        ) : (
          "Connect"
        )}
      </Button>
    </div>
  );
}
