
import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAdminCheck } from '@/hooks/useAdminCheck';

export interface TicketMessage {
  id: string;
  ticket_id: string;
  autor_role: 'user' | 'admin';
  mensagem: string;
  created_at: string;
}

export function useTicketMessages(ticketId?: string) {
  const queryClient = useQueryClient();
  const { isAdmin } = useAdminCheck();

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['ticket_messages', ticketId],
    enabled: !!ticketId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ticket_messages')
        .select('*')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data as TicketMessage[];
    },
  });

  useEffect(() => {
    if (!ticketId) return;
    const channel = supabase.channel(`ticket-messages-${ticketId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ticket_messages', filter: `ticket_id=eq.${ticketId}` }, () => {
        queryClient.invalidateQueries({ queryKey: ['ticket_messages', ticketId] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [ticketId, queryClient]);

  const sendMessage = useMutation({
    mutationFn: async (payload: { ticket_id: string; message: string }) => {
      const txt = payload.message?.trim();
      if (!txt) throw new Error('Mensagem vazia');
      const { error } = await supabase
        .from('ticket_messages')
        .insert({ ticket_id: payload.ticket_id, autor_role: isAdmin ? 'admin' : 'user', mensagem: txt });
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['ticket_messages', variables.ticket_id] });
    },
  });

  return { messages, isLoading, sendMessage };
}
