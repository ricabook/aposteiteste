
import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export type TicketStatus = 'aberto' | 'resolvido';

export interface Ticket {
  id: string;
  titulo: string;
  assunto: string;
  status: TicketStatus;
  user_id: string;
  created_at: string;
}

export function useTickets(isAdmin = false) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ['tickets', isAdmin ? 'admin' : user?.id],
    enabled: isAdmin ? true : !!user?.id,
    queryFn: async () => {
      if (isAdmin) {
        const { data, error } = await supabase
          .from('tickets')
          .select('*')
          .order('created_at', { ascending: false });
        if (error) throw error;
        return data as Ticket[];
      } else {
        const { data, error } = await supabase
          .from('tickets')
          .select('*')
          .eq('user_id', user!.id)
          .order('created_at', { ascending: false });
        if (error) throw error;
        return data as Ticket[];
      }
    },
  });

  useEffect(() => {
    const channel = supabase.channel(`tickets-${isAdmin ? 'admin' : user?.id ?? 'anon'}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets' }, () => {
        queryClient.invalidateQueries({ queryKey: ['tickets', isAdmin ? 'admin' : user?.id] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [isAdmin, user?.id, queryClient]);

  const createTicket = useMutation({
    mutationFn: async (payload: { titulo: string; assunto: string }) => {
      if (!user) throw new Error('Not authenticated');
      if (!payload.titulo?.trim() || !payload.assunto?.trim()) {
        throw new Error('Título e assunto são obrigatórios');
      }
      const { data: created, error } = await supabase
        .from('tickets')
        .insert({ titulo: payload.titulo.trim(), assunto: payload.assunto.trim(), user_id: user.id })
        .select('id')
        .single();
      if (error) throw error;
      await supabase.from('ticket_messages').insert({
        ticket_id: created.id,
        autor_role: 'user',
        mensagem: payload.assunto.trim(),
      });
      return created.id as string;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets', isAdmin ? 'admin' : user?.id] });
    },
  });

  const resolveTicket = useMutation({
    mutationFn: async (ticketId: string) => {
      const { error } = await supabase
        .from('tickets')
        .update({ status: 'resolvido' })
        .eq('id', ticketId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets', isAdmin ? 'admin' : user?.id] });
    },
  });

  const deleteTicket = useMutation({
    mutationFn: async (ticketId: string) => {
      const { error } = await supabase
        .from('tickets')
        .delete()
        .eq('id', ticketId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets', isAdmin ? 'admin' : user?.id] });
    },
  });

  return {
    tickets,
    isLoading,
    createTicket,
    resolveTicket,
    deleteTicket,
  };
}
