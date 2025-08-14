import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAdminCheck } from '@/hooks/useAdminCheck';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
    <div className="container mx-auto px-4 py-6 max-w-6xl">
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Tickets</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(tickets || []).map((t) => (
              <button
                key={t.id}
                onClick={() => setSelected(t)}
                className={`w-full text-left p-3 rounded-lg border hover:bg-muted/50 transition flex items-center justify-between ${selected?.id===t.id?'bg-muted/50':''}`}
              >
                <div>
                  <div className="font-medium">{t.titulo}</div>
                  <div className="text-xs text-muted-foreground">Criado em {formattedDate(t.created_at)}</div>
                </div>
                <Badge variant={t.status === 'Aberto' ? 'default' : 'secondary'}>{t.status}</Badge>
              </button>
            ))}
            {(tickets || []).length === 0 && (
              <div className="text-sm text-muted-foreground">Nenhum ticket encontrado.</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Detalhes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!selected ? (
              <div className="text-sm text-muted-foreground">Selecione um ticket para visualizar.</div>
            ) : (
              <>
                <div className="rounded-lg border p-4">
                  <div className="flex items-center justify-between mb-1">
                    <div className="font-medium">{selected.titulo}</div>
                    <Badge>{selected.status}</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground mb-2">Aberto em {formattedDate(selected.created_at)}</div>
                  <div className="whitespace-pre-wrap">{selected.assunto}</div>
                </div>

                <div className="space-y-3">
                  {(messages || []).map((m) => (
                    <div key={m.id} className="rounded-lg border p-3">
                      <div className="text-xs text-muted-foreground mb-1">
                        {m.sender_role === 'admin' ? 'Admin' : 'Usuário'} • {formattedDate(m.created_at)}
                      </div>
                      <div className="whitespace-pre-wrap">{m.message}</div>
                    </div>
                  ))}
                </div>

                {selected.status === 'Aberto' && (
                  <div className="space-y-2">
                    <Textarea placeholder="Escreva sua resposta ao usuário..." value={reply} onChange={(e)=>setReply(e.target.value)} className="min-h-[120px]" />
                    <div className="flex gap-2">
                      <Button onClick={()=>sendReply.mutate()} disabled={!reply.trim() || sendReply.isPending}>
                        <Send className="w-4 h-4 mr-2" /> Enviar resposta
                      </Button>
                      <Button variant="secondary" onClick={()=>resolveTicket.mutate(selected.id)}>
                        <CheckCircle2 className="w-4 h-4 mr-2" /> Resolver
                      </Button>
                      <Button variant="destructive" onClick={()=>deleteTicket.mutate(selected.id)}>
                        <Trash2 className="w-4 h-4 mr-2" /> Apagar
                      </Button>
                    </div>
                  </div>
                )}

                {selected.status === 'Resolvido' && (
                  <div className="text-sm text-muted-foreground">
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