
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
  | 'withdrawal_confirmed';

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

  // 1) Query com leve tuning de refetch (Realtime cobre updates)
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
    // evita solicitações redundantes; Realtime manterá fresco
    staleTime: 10_000,
    refetchOnWindowFocus: 'always',
    refetchOnReconnect: true,
  });

  const unreadCount = useMemo(
    () => notifications.filter(n => !n.is_read).length,
    [notifications]
  );

  // 2) Helpers de cache
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['notifications.list', userId] });

  const pushLocal = (n: Notification) => {
    queryClient.setQueryData<Notification[]>(
      ['notifications.list', userId],
      (prev) => {
        const list = prev ?? [];
        // evita duplicar caso o Realtime e o otimismo cheguem próximos
        if (list.some((x) => x.id === n.id)) return list;
        return [n, ...list].slice(0, 30);
      }
    );
  };

  // 3) Ações de leitura
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

  // 4) Realtime INSERT-only + push direto no cache (latência mínima)
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
            // push instantâneo
            pushLocal(payload.new as Notification);
            // validação em background (mantém consistência)
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
    pushLocal, // exposto para UI otimista (apostar/encerrar)
  };
}
