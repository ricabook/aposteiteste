// src/hooks/useNotifications.ts
// Import corrected to match your project structure
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type NotificationType =
  | 'balance_credit'
  | 'bet_placed'
  | 'bet_closed'
  | 'poll_resolved'
  | 'poll_cancelled'
  | 'poll_approved'
  | 'withdrawal_approved'
  | 'support_reply';

export interface AppNotification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string | null;
  body: string | null;
  metadata: any | null;
  created_at: string;
  read_at: string | null;
}

export function useNotifications(userId?: string | null) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  useEffect(() => {
    let mounted = true;
    if (!userId) return;

    // Initial fetch
    supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50)
      .then(({ data, error }) => {
        if (error) return;
        if (!mounted) return;
        setNotifications((data ?? []) as AppNotification[]);
      });

    // Realtime: INSERT only for low-latency updates
    const channel = supabase
      .channel(`notifications-${userId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` }, (payload) => {
        setNotifications((prev) => [payload.new as AppNotification, ...prev]);
      })
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [userId]);

  return { notifications, setNotifications };
}
