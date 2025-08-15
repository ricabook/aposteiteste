import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAdminCheck } from '@/hooks/useAdminCheck';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Trash2, Send, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import ptBR from 'date-fns/locale/pt-BR';

type TicketStatus = 'Aberto' | 'Resolvido';

interface Ticket {
  id: string;
  user_id: string;
  titulo: string;
  assunto: string;
  status: TicketStatus;
  created_at: string;
  updated_at: string;
  nome?: string | null;
  email?: string | null;
}

interface Message {
  id: string;
  ticket_id: string;
  sender_role: 'admin' | 'user';
  message: string;
  created_at: string;
}

export default function AdminMensagens() {
  const { isAdmin, isLoading } = useAdminCheck();
  const qc = useQueryClient();
  const [selected, setSelected] = useState<Ticket | null>(null);
  const [reply, setReply] = useState('');

  const { data: tickets } = useQuery({
    queryKey: ['admin_support_tickets'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('support_tickets')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Ticket[];
    },
    enabled: isAdmin && !isLoading,
  });

  const { data: messages } = useQuery({
    queryKey: ['admin_support_messages', selected?.id],
    queryFn: async () => {
      if (!selected?.id) return [];
      const { data, error } = await supabase
        .from('support_messages')
        .select('*')
        .eq('ticket_id', selected.id)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data as Message[];
    },
    enabled: isAdmin && !isLoading && !!selected?.id,
  });

  const deleteTicket = useMutation({
    mutationFn: async (ticketId: string) => {
      const { error } = await supabase.from('support_tickets').delete().eq('id', ticketId);
      if (error) throw error;
    },
    onSuccess: () => {
      setSelected(null);
      qc.invalidateQueries({ queryKey: ['admin_support_tickets'] });
    }
  });

  const resolveTicket = useMutation({
    mutationFn: async (ticketId: string) => {
      const { error } = await supabase.from('support_tickets').update({ status: 'Resolvido' }).eq('id', ticketId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin_support_tickets'] });
      if (selected) setSelected({ ...selected, status: 'Resolvido' });
    }
  });

  const sendReply = useMutation({
    mutationFn: async () => {
      if (!selected?.id || !reply.trim()) return;
      const { error } = await supabase.from('support_messages').insert({
        ticket_id: selected.id,
        sender_role: 'admin',
        message: reply.trim(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setReply('');
      qc.invalidateQueries({ queryKey: ['admin_support_messages', selected?.id] });
    }
  });

  const formattedDate = (d?: string) => {
    if (!d) return '';
    return format(new Date(d), "dd 'de' MMM 'às' HH:mm", { locale: ptBR });
  };

  if (!isAdmin && !isLoading) {
    return <div className="container mx-auto px-4 py-6">Acesso restrito.</div>;
  }

  return (
    <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-6 max-w-7xl">
      <div className="flex flex-col lg:grid lg:grid-cols-2 gap-4 sm:gap-6">
        <Card className="order-2 lg:order-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg sm:text-xl">Tickets</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-[60vh] lg:max-h-[70vh] overflow-y-auto">
            {(tickets || []).map((t) => (
              <button
                key={t.id}
                onClick={() => setSelected(t)}
                className={`w-full text-left p-3 rounded-lg border hover:bg-muted/50 transition flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 ${selected?.id===t.id?'bg-muted/50 ring-2 ring-primary/20':''}`}
              >
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{t.titulo}</div>
                  <div className="text-xs text-muted-foreground">Criado em {formattedDate(t.created_at)}</div>
                </div>
                <div className="text-left sm:text-right text-xs text-muted-foreground shrink-0">
                  <div className="truncate">{t.nome || '—'}</div>
                  <div className="truncate">{t.email || '—'}</div>
                </div>
              </button>
            ))}
            {(tickets || []).length === 0 && (
              <div className="text-sm text-muted-foreground text-center py-8">Nenhum ticket encontrado.</div>
            )}
          </CardContent>
        </Card>

        <Card className="order-1 lg:order-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg sm:text-xl">Detalhes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!selected ? (
              <div className="text-sm text-muted-foreground text-center py-8">Selecione um ticket para visualizar.</div>
            ) : (
              <>
                <div className="rounded-lg border p-3 sm:p-4">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-2">
                    <div className="font-medium break-words pr-2">{selected.titulo}</div>
                    <Badge className="self-start">{selected.status}</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground mb-3 space-y-1">
                    <div>Aberto em {formattedDate(selected.created_at)}</div>
                    <div>Autor: {selected.nome || '—'} ({selected.email || '—'})</div>
                  </div>
                  <div className="whitespace-pre-wrap text-sm break-words">{selected.assunto}</div>
                </div>

                <div className="space-y-3 max-h-[40vh] lg:max-h-[50vh] overflow-y-auto">
                  {(messages || []).map((m) => (
                    <div key={m.id} className={`rounded-lg border p-3 ${m.sender_role === 'admin' ? 'bg-primary/5' : 'bg-muted/30'}`}>
                      <div className="text-xs text-muted-foreground mb-2">
                        {m.sender_role === 'admin' ? 'Admin' : 'Usuário'} • {formattedDate(m.created_at)}
                      </div>
                      <div className="whitespace-pre-wrap text-sm break-words">{m.message}</div>
                    </div>
                  ))}
                </div>

                {selected.status === 'Aberto' && (
                  <div className="space-y-3 pt-2 border-t">
                    <Textarea 
                      placeholder="Escreva sua resposta ao usuário..." 
                      value={reply} 
                      onChange={(e)=>setReply(e.target.value)} 
                      className="min-h-[100px] resize-none" 
                    />
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Button 
                        onClick={()=>sendReply.mutate()} 
                        disabled={!reply.trim() || sendReply.isPending}
                        className="flex-1 sm:flex-none"
                      >
                        <Send className="w-4 h-4 mr-2" /> 
                        <span className="hidden sm:inline">Enviar resposta</span>
                        <span className="sm:hidden">Enviar</span>
                      </Button>
                      <Button 
                        variant="secondary" 
                        onClick={()=>resolveTicket.mutate(selected.id)}
                        className="flex-1 sm:flex-none"
                      >
                        <CheckCircle2 className="w-4 h-4 mr-2" /> 
                        <span className="hidden sm:inline">Resolver</span>
                        <span className="sm:hidden">Resolver</span>
                      </Button>
                      <Button 
                        variant="destructive" 
                        onClick={()=>deleteTicket.mutate(selected.id)}
                        className="flex-1 sm:flex-none"
                      >
                        <Trash2 className="w-4 h-4 mr-2" /> 
                        <span className="hidden sm:inline">Apagar</span>
                        <span className="sm:hidden">Apagar</span>
                      </Button>
                    </div>
                  </div>
                )}

                {selected.status === 'Resolvido' && (
                  <div className="text-sm text-muted-foreground text-center py-4 bg-muted/30 rounded-lg">
                    Ticket encerrado. Não é possível enviar novas respostas.
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}