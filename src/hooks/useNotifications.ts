
import { useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { RealtimePostgresInsertPayload } from '@supabase/supabase-js';

export type NotificationType =
  | 'balance_credit'
  | 'bet_placed'
  | 'bet_closed'
  | 'poll_resolved'
  | 'poll_cancelled'
  | 'poll_approved'
  | 'withdrawal_confirmed'
  | 'support_reply';

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body?: string | null;
  metadata: Record<string, any>;
  is_read: boolean;
  created_at: string;
}

export function useNotifications() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.id ?? null;

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications.list', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId as string)
        .order('created_at', { ascending: false })
        .limit(30);
      if (error) throw error;
      return (data ?? []) as Notification[];
    },
    staleTime: 10_000,
    refetchOnWindowFocus: 'always',
    refetchOnReconnect: true,
  });

  const unreadCount = useMemo(
    () => notifications.filter(n => !n.is_read).length,
    [notifications]
  );

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['notifications.list', userId] });

  const pushLocal = (n: Notification) => {
    queryClient.setQueryData<Notification[]>(
      ['notifications.list', userId],
      (prev) => {
        const list = prev ?? [];
        if (list.some((x) => x.id === n.id)) return list;
        return [n, ...list].slice(0, 30);
      }
    );
  };

  const markAllAsRead = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', userId as string)
        .eq('is_read', false);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const markOneAsRead = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', userId as string)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`notifications-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload: RealtimePostgresInsertPayload<Notification>) => {
          if (payload?.new) {
            pushLocal(payload.new as Notification);
            invalidate();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  return {
    notifications,
    unreadCount,
    markAllAsRead,
    markOneAsRead,
    pushLocal,
  };
}
