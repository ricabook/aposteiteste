// src/hooks/useNotifications.ts
// Updated hook with 'support_reply' type and realtime handling
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

export type NotificationType =
  | 'balance_credit'
  | 'bet_placed'
  | 'bet_closed'
  | 'poll_resolved'
  | 'poll_cancelled'
  | 'poll_approved'
  | 'withdrawal_approved'
  | 'support_reply';

export function useNotifications(userId: string | undefined) {
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel('notifications_changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        (payload) => {
          setNotifications((prev) => [payload.new, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  return { notifications, setNotifications };
}
