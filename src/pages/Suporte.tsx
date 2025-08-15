import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Send } from 'lucide-react';
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

export default function Suporte() {
  const { user } = useAuth();
  const qc = useQueryClient();

  // form state
  const [titulo, setTitulo] = useState('');
  const [assunto, setAssunto] = useState('');
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');

  // UI state
  const [activeTicket, setActiveTicket] = useState<Ticket | null>(null);
  const [reply, setReply] = useState('');

  const { data: tickets, isLoading: loadingTickets } = useQuery({
    queryKey: ['support_tickets', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('support_tickets')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Ticket[];
    },
    enabled: !!user?.id,
  });

  const { data: messages, isLoading: loadingMessages } = useQuery({
    queryKey: ['support_messages', activeTicket?.id],
    queryFn: async () => {
      if (!activeTicket?.id) return [];
      const { data, error } = await supabase
        .from('support_messages')
        .select('*')
        .eq('ticket_id', activeTicket.id)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data as Message[];
    },
    enabled: !!activeTicket?.id,
  });

  const createTicket = useMutation({
    mutationFn: async () => {
      const payload = {
        user_id: user!.id,
        nome: nome.trim() || null,
        email: email.trim() || null,
        titulo: titulo.trim(),
        assunto: assunto.trim(),
        status: 'Aberto' as TicketStatus,
      };
      const { data, error } = await supabase
        .from('support_tickets')
        .insert(payload)
        .select('*')
        .single();
      if (error) throw error;
      return data as Ticket;
    },
    onSuccess: (t) => {
      setTitulo('');
      setAssunto('');
      setNome('');
      setEmail('');
      qc.invalidateQueries({ queryKey: ['support_tickets', user?.id] });
      setActiveTicket(t);
    },
  });

  const sendUserReply = useMutation({
    mutationFn: async () => {
      if (!activeTicket?.id || !reply.trim()) return;
      const { error } = await supabase.from('support_messages').insert({
        ticket_id: activeTicket.id,
        sender_role: 'user',
        sender_user_id: user?.id ?? null,
        message: reply.trim(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setReply('');
      qc.invalidateQueries({ queryKey: ['support_messages', activeTicket?.id] });
    },
  });

  const formattedDate = (d?: string) =>
    d ? format(new Date(d), "dd 'de' MMM 'às' HH:mm", { locale: ptBR }) : '';

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!titulo.trim() || !assunto.trim() || !nome.trim() || !email.trim()) return;
    createTicket.mutate();
  };

  const formDisabled =
    !titulo.trim() || !assunto.trim() || !nome.trim() || !email.trim() || createTicket.isPending;

  return (
    <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-6 max-w-6xl">
      {/* Formulário para abrir ticket */}
      {!activeTicket && (
        <Card className="mb-4 sm:mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg sm:text-xl">Abrir ticket de suporte</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Nome</label>
                  <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Seu nome" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">E-mail</label>
                  <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seuemail@exemplo.com" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Título</label>
                <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ex.: Problema com depósito" />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Assunto</label>
                <Textarea 
                  value={assunto} 
                  onChange={(e) => setAssunto(e.target.value)} 
                  placeholder="Descreva o problema detalhadamente" 
                  className="min-h-[120px] resize-none" 
                />
              </div>

              <div className="flex justify-end pt-2">
                <Button type="submit" disabled={formDisabled} className="w-full sm:w-auto">
                  <Send className="w-4 h-4 mr-2" />
                  {createTicket.isPending ? 'Enviando...' : 'Enviar'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Detalhe do ticket selecionado */}
      {activeTicket && (
        <div className="mb-4 sm:mb-6">
          <Button variant="ghost" onClick={() => setActiveTicket(null)} className="mb-3 sm:mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
          </Button>

          <Card className="mb-4 sm:mb-6">
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-2">
                <CardTitle className="break-words pr-2 text-lg sm:text-xl">{activeTicket.titulo}</CardTitle>
                <Badge className="self-start">{activeTicket.status}</Badge>
              </div>
              <div className="text-sm text-muted-foreground space-y-1">
                <div>Aberto em {formattedDate(activeTicket.created_at)}</div>
                {(activeTicket.nome || activeTicket.email) && (
                  <div className="text-xs">
                    Autor: {activeTicket.nome || '—'} {activeTicket.email ? `(${activeTicket.email})` : ''}
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Mensagem inicial do usuário (assunto do ticket) */}
              <div className="rounded-lg border p-3 sm:p-4 bg-muted/30">
                <div className="text-xs text-muted-foreground mb-2">Seu assunto inicial</div>
                <div className="whitespace-pre-wrap text-sm break-words">{activeTicket.assunto}</div>
              </div>

              {/* Histórico completo */}
              <div className="max-h-[50vh] overflow-y-auto space-y-3">
                {loadingMessages ? (
                  <div className="text-sm text-muted-foreground text-center py-4">Carregando mensagens…</div>
                ) : (messages || []).length > 0 ? (
                  (messages || []).map((m) => (
                    <div key={m.id} className={`rounded-lg border p-3 sm:p-4 ${m.sender_role === 'admin' ? 'bg-primary/5' : 'bg-secondary/50'}`}>
                      <div className="text-xs text-muted-foreground mb-2">
                        {m.sender_role === 'admin' ? 'Admin' : 'Você'} • {formattedDate(m.created_at)}
                      </div>
                      <div className="whitespace-pre-wrap text-sm break-words">{m.message}</div>
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-muted-foreground text-center py-4">Ainda não há respostas.</div>
                )}
              </div>

              {/* Composer do usuário (somente se Aberto) */}
              {activeTicket.status === 'Aberto' ? (
                <div className="space-y-3 pt-3 border-t">
                  <Textarea
                    placeholder="Escreva sua mensagem para o suporte..."
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    className="min-h-[100px] resize-none"
                  />
                  <div className="flex justify-end">
                    <Button 
                      onClick={() => sendUserReply.mutate()} 
                      disabled={!reply.trim() || sendUserReply.isPending}
                      className="w-full sm:w-auto"
                    >
                      <Send className="w-4 h-4 mr-2" />
                      {sendUserReply.isPending ? 'Enviando...' : 'Enviar mensagem'}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground text-center py-4 bg-muted/30 rounded-lg">
                  Ticket encerrado. Novas mensagens não são permitidas.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Meus tickets (lista) */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg sm:text-xl">Meus tickets</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingTickets ? (
            <div className="text-center py-8">Carregando...</div>
          ) : (tickets && tickets.length > 0) ? (
            <div className="space-y-2 max-h-[60vh] overflow-y-auto">
              {tickets.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setActiveTicket(t)}
                  className="w-full text-left p-3 rounded-lg border hover:bg-muted/50 transition flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{t.titulo}</div>
                    <div className="text-xs text-muted-foreground">
                      Criado em {formattedDate(t.created_at)}
                    </div>
                  </div>
                  <Badge 
                    variant={t.status === 'Aberto' ? 'default' : 'secondary'}
                    className="self-start sm:self-center"
                  >
                    {t.status}
                  </Badge>
                </button>
              ))}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground text-center py-8">Você ainda não abriu tickets.</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
