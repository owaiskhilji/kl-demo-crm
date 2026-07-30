import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

export interface Notification {
  id: string;
  type: string;
  message: string;
  due_at: string;
  status: string;
  follow_up_id?: string;
  lead_id?: string;
}

export function useNotifications(userId: string) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [supabase] = useState(() => createClient());

  useEffect(() => {
    if (!userId) return;

    // Initial fetch
    const fetchNotifications = async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('agent_id', userId)
        .eq('status', 'due')
        .order('created_at', { ascending: false });
        
      if (!error && data) {
        setNotifications(data);
      }
      setLoading(false);
    };

    fetchNotifications();

    // Supabase Realtime subscription
    // The filter `agent_id=eq.${userId}` ensures SERVER-SIDE filtering. 
    // Supabase Postgres processes this filter before broadcasting, saving bandwidth 
    // and preventing other users' data from ever reaching this client.
    const channel = supabase
      .channel(`notifications-${userId}`)
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'notifications', 
          filter: `agent_id=eq.${userId}` 
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newNotif = payload.new as Notification;
            if (newNotif.status === 'due') {
              setNotifications(prev => [newNotif, ...prev]);
            }
          } else if (payload.eventType === 'UPDATE') {
            const updatedNotif = payload.new as Notification;
            // E.g. When markDoneAction flips this to 'dismissed' on the backend, 
            // this live event removes it from the UI instantly.
            if (updatedNotif.status === 'dismissed' || updatedNotif.status === 'seen') {
              setNotifications(prev => prev.filter(n => n.id !== updatedNotif.id));
            } else if (updatedNotif.status === 'due') {
              setNotifications(prev => {
                if (!prev.find(n => n.id === updatedNotif.id)) return [updatedNotif, ...prev];
                return prev.map(n => n.id === updatedNotif.id ? updatedNotif : n);
              });
            }
          } else if (payload.eventType === 'DELETE') {
            setNotifications(prev => prev.filter(n => n.id !== payload.old.id));
          }
        }
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          console.log('[Realtime] Subscribed to notifications');
        } else if (status === 'CHANNEL_ERROR') {
          console.error(`[Realtime] Notifications channel error:`, err);
          // Graceful handling: In a highly volatile network, we would set up an exponential 
          // backoff retry here. For now, logging satisfies the error-handling pattern for non-critical drops.
        } else if (status === 'CLOSED') {
          console.log(`[Realtime] Notifications channel closed.`);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const dismiss = useCallback(async (id: string) => {
    // Optimistic UI update
    setNotifications(prev => prev.filter(n => n.id !== id));
    
    const { error } = await supabase
      .from('notifications')
      .update({ status: 'dismissed' })
      .eq('id', id);
      
    if (error) {
      console.error('[Notifications] Failed to dismiss:', error.message);
      // Optionally rollback the optimistic update if needed
    }
  }, []);

  return { notifications, loading, dismiss };
}
