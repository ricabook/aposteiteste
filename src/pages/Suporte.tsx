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
    <div className="container mx-auto px-4 py-6 max-w-5xl">
      {/* Formulário para abrir ticket */}
      {!activeTicket && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Abrir ticket de suporte</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="grid md:grid-cols-2 gap-4">
              <div className="md:col-span-1">
                <label className="text-sm font-medium">Nome</label>
                <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Seu nome" />
              </div>
              <div className="md:col-span-1">
                <label className="text-sm font-medium">E-mail</label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seuemail@exemplo.com" />
              </div>

              <div className="md:col-span-1">
                <label className="text-sm font-medium">Título</label>
                <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ex.: Problema com depósito" />
              </div>
              <div className="md:col-span-1">
                <label className="text-sm font-medium">Assunto</label>
                <Textarea value={assunto} onChange={(e) => setAssunto(e.target.value)} placeholder="Descreva o problema brevemente" className="min-h-[120px]" />
              </div>

              <div className="md:col-span-2 flex justify-end">
                <Button type="submit" disabled={formDisabled}>
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
        <div className="mb-6">
          <Button variant="ghost" onClick={() => setActiveTicket(null)} className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
          </Button>

          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{activeTicket.titulo}</CardTitle>
                <Badge>{activeTicket.status}</Badge>
              </div>
              <div className="text-sm text-muted-foreground">
                Aberto em {formattedDate(activeTicket.created_at)}
              </div>
              {(activeTicket.nome || activeTicket.email) && (
                <div className="text-xs text-muted-foreground">
                  Autor: {activeTicket.nome || '—'} {activeTicket.email ? `(${activeTicket.email})` : ''}
                </div>
              )}
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Mensagem inicial do usuário (assunto do ticket) */}
              <div className="rounded-lg border p-4 bg-muted/30">
                <div className="text-xs text-muted-foreground mb-1">Seu assunto inicial</div>
                <div className="whitespace-pre-wrap">{activeTicket.assunto}</div>
              </div>

              {/* Histórico completo */}
              {loadingMessages ? (
                <div className="text-sm text-muted-foreground">Carregando mensagens…</div>
              ) : (messages || []).length > 0 ? (
                (messages || []).map((m) => (
                  <div key={m.id} className="rounded-lg border p-4">
                    <div className="text-xs text-muted-foreground mb-1">
                      {m.sender_role === 'admin' ? 'Admin' : 'Você'} • {formattedDate(m.created_at)}
                    </div>
                    <div className="whitespace-pre-wrap">{m.message}</div>
                  </div>
                ))
              ) : (
                <div className="text-sm text-muted-foreground">Ainda não há respostas.</div>
              )}

              {/* Composer do usuário (somente se Aberto) */}
              {activeTicket.status === 'Aberto' ? (
                <div className="space-y-2">
                  <Textarea
                    placeholder="Escreva sua mensagem para o suporte..."
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    className="min-h-[100px]"
                  />
                  <div className="flex justify-end">
                    <Button onClick={() => sendUserReply.mutate()} disabled={!reply.trim() || sendUserReply.isPending}>
                      <Send className="w-4 h-4 mr-2" />
                      {sendUserReply.isPending ? 'Enviando...' : 'Enviar mensagem'}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">
                  Ticket encerrado. Novas mensagens não são permitidas.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Meus tickets (lista) */}
      <Card>
        <CardHeader>
          <CardTitle>Meus tickets</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingTickets ? (
            <div>Carregando...</div>
          ) : (tickets && tickets.length > 0) ? (
            <div className="space-y-2">
              {tickets.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setActiveTicket(t)}
                  className="w-full text-left p-3 rounded-lg border hover:bg-muted/50 transition flex items-center justify-between"
                >
                  <div>
                    <div className="font-medium">{t.titulo}</div>
                    <div className="text-xs text-muted-foreground">
                      Criado em {formattedDate(t.created_at)}
                    </div>
                  </div>
                  <Badge variant={t.status === 'Aberto' ? 'default' : 'secondary'}>
                    {t.status}
                  </Badge>
                </button>
              ))}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">Você ainda não abriu tickets.</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
