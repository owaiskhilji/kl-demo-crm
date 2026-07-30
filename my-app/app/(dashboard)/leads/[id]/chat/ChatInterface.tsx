"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { sendWhatsAppMessage } from "@/lib/meta/sendWhatsAppMessage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

type MessageLog = {
  id: string;
  lead_id: string;
  channel: string;
  direction: string;
  message_type: string;
  content: string;
  created_at: string;
};

interface ChatInterfaceProps {
  leadId: string;
  leadSource: string;
  initialMessages: MessageLog[];
}

export default function ChatInterface({ leadId, leadSource, initialMessages }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<MessageLog[]>(initialMessages);
  const [inputValue, setInputValue] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const supabase = createClient();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel(`chat_${leadId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "message_log",
          filter: `lead_id=eq.${leadId}`,
        },
        (payload) => {
          const newMessage = payload.new as MessageLog;
          setMessages((prev) => {
            // Because the client generates the exact UUID and passes it to the DB insert,
            // the Realtime broadcast will have the EXACT same ID as our optimistic temp message.
            // A simple ID check handles deduplication perfectly, with no risk of content collisions.
            if (prev.some(m => m.id === newMessage.id)) return prev;
            return [...prev, newMessage];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [leadId, supabase]);

  // Check 24-hour window
  const lastInboundMessage = [...messages].reverse().find(m => m.direction === "inbound");
  const isWithin24hWindow = lastInboundMessage 
    ? new Date(lastInboundMessage.created_at).getTime() > Date.now() - 24 * 60 * 60 * 1000
    : false;

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const contentToSend = inputValue.trim();
    if (!contentToSend || isSending) return;

    if (!isWithin24hWindow) {
      setError("Cannot send free-form text outside 24-hour window.");
      return;
    }

    setIsSending(true);
    setError(null);
    setInputValue(""); // Optimistically clear input

    // Generate a real UUID on the client to use as the database primary key
    const messageId = crypto.randomUUID();

    // Optimistically add to UI immediately using the exact UUID
    const optimisticMessage: MessageLog = {
      id: messageId,
      lead_id: leadId,
      channel: leadSource,
      direction: "outbound",
      message_type: "text",
      content: contentToSend,
      created_at: new Date().toISOString(),
    };
    
    setMessages((prev) => [...prev, optimisticMessage]);

    const result = await sendWhatsAppMessage({
      leadId,
      content: contentToSend,
      messageId, // Pass the ID so the server action uses it in the DB insert
    });

    if (!result.success) {
      // Revert optimistic updates on failure
      setMessages((prev) => prev.filter(m => m.id !== messageId));
      setInputValue(contentToSend);
      setError(result.error || "Failed to send message");
    }

    setIsSending(false);
  };



  return (
    <div className="flex flex-col flex-1 border rounded-xl overflow-hidden bg-white dark:bg-zinc-950 shadow-sm border-zinc-200 dark:border-zinc-800">
      
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-zinc-50 dark:bg-zinc-900/50">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-zinc-500">
            No messages yet.
          </div>
        ) : (
          messages.map((msg) => {
            const isInbound = msg.direction === "inbound";
            return (
              <div 
                key={msg.id} 
                className={cn(
                  "flex w-full",
                  isInbound ? "justify-start" : "justify-end"
                )}
              >
                <div 
                  className={cn(
                    "max-w-[75%] rounded-2xl px-4 py-2 text-sm",
                    isInbound 
                      ? "bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 rounded-bl-none" 
                      : "bg-blue-600 text-white rounded-br-none"
                  )}
                >
                  <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                  <div className={cn(
                    "text-[10px] mt-1 text-right",
                    isInbound ? "text-zinc-500" : "text-blue-100"
                  )}>
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white dark:bg-zinc-950 border-t border-zinc-200 dark:border-zinc-800">
        {error && (
          <Alert variant="destructive" className="mb-4 py-2 px-3">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-xs ml-2">{error}</AlertDescription>
          </Alert>
        )}

        {leadSource !== "whatsapp" ? (
          <Alert className="py-2">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-sm">Sending messages directly via {leadSource} is not fully implemented yet.</AlertDescription>
          </Alert>
        ) : !isWithin24hWindow ? (
          <div className="space-y-3">
            <Alert className="bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200 border-yellow-200 dark:border-yellow-900">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-sm font-medium">
                24-hour window expired — only pre-approved WhatsApp templates can be sent
              </AlertDescription>
            </Alert>
            <div className="rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700 p-4 text-center">
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Template messaging requires approved templates from Meta Business Manager.
              </p>
              <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">
                Submit templates via WhatsApp Business Manager → once approved, they will appear here.
              </p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Type a message..."
              disabled={isSending}
              className="flex-1"
            />
            <Button type="submit" disabled={isSending || !inputValue.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
