
import { useEffect, useMemo, useState } from 'react';
import { useTickets } from '@/hooks/useTickets';
import { useTicketMessages } from '@/hooks/useTicketMessages';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useAdminCheck } from '@/hooks/useAdminCheck';
import { MessageSquare, CheckCircle, Trash2, Send } from 'lucide-react';

export default function AdminMessages() {
  const { isAdmin } = useAdminCheck();
  const { tickets, resolveTicket, deleteTicket } = useTickets(true);
  const { toast } = useToast();

  const [open, setOpen] = useState(false);
  const [activeTicketId, setActiveTicketId] = useState<string | null>(null);
  const { messages, sendMessage } = useTicketMessages(activeTicketId || undefined);
  const activeTicket = useMemo(() => tickets.find(t => t.id === activeTicketId) || null, [tickets, activeTicketId]);

  const [reply, setReply] = useState('');
  const [usersMap, setUsersMap] = useState<Record<string, string>>({});

  // Load display names for tickets' users
  useEffect(() => {
    const ids = Array.from(new Set(tickets.map(t => t.user_id)));
    if (ids.length === 0) return;
    supabase
      .from('profiles')
      .select('user_id, display_name')
      .in('user_id', ids)
      .then(({ data }) => {
        const map: Record<string,string> = {};
        (data ?? []).forEach((p: any) => { map[p.user_id] = p.display_name || ''; });
        setUsersMap(map);
      });
  }, [tickets]);

  const onReply = async () => {
    if (!activeTicketId) return;
    try {
      await sendMessage.mutateAsync({ ticket_id: activeTicketId, message: reply });
      setReply('');
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Erro ao enviar resposta', description: e.message });
    }
  };

  const onResolve = async (id: string) => {
    try {
      await resolveTicket.mutateAsync(id);
      toast({ title: 'Ticket resolvido' });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Erro ao resolver ticket', description: e.message });
    }
  };

  const onDelete = async (id: string) => {
    try {
      await deleteTicket.mutateAsync(id);
      toast({ title: 'Ticket apagado' });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Erro ao apagar ticket', description: e.message });
    }
  };

  if (!isAdmin) {
    return <div className="container mx-auto p-4">Acesso restrito.</div>;
  }

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Tickets</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {tickets.length === 0 && (
            <div className="text-sm text-muted-foreground">Nenhum ticket aberto.</div>
          )}

          {tickets.map(t => (
            <div key={t.id} className="flex items-center justify-between rounded-lg border p-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  <span className="font-medium truncate">{t.titulo}</span>
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  Usuário: {usersMap[t.user_id] ? usersMap[t.user_id] : t.user_id}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={t.status === 'aberto' ? 'default' : 'secondary'} className="capitalize">
                  {t.status}
                </Badge>
                <Button variant="secondary" size="sm" onClick={() => { setActiveTicketId(t.id); setOpen(true); }}>
                  Responder
                </Button>
                {t.status === 'aberto' && (
                  <Button variant="default" size="sm" onClick={() => onResolve(t.id)}>
                    <CheckCircle className="h-4 w-4 mr-1" /> Resolver
                  </Button>
                )}
                <Button variant="destructive" size="sm" onClick={() => onDelete(t.id)}>
                  <Trash2 className="h-4 w-4 mr-1" /> Apagar
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Mensagens do ticket</DialogTitle>
          </DialogHeader>

          {!activeTicket && <div className="text-sm text-muted-foreground">Carregando...</div>}

          {activeTicket && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold">{activeTicket.titulo}</div>
                  <div className="text-xs text-muted-foreground">{activeTicket.assunto}</div>
                </div>
                <Badge variant={activeTicket.status === 'aberto' ? 'default' : 'secondary'} className="capitalize">
                  {activeTicket.status}
                </Badge>
              </div>

              <div className="h-64 overflow-auto rounded-md border p-3 space-y-3 bg-muted/30">
                {messages.map((m) => (
                  <div key={m.id} className={`flex ${m.autor_role === 'admin' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] rounded-lg p-2 text-sm ${m.autor_role === 'admin' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                      <div className="text-[10px] opacity-60 mb-1">{m.autor_role === 'admin' ? 'Admin' : 'Usuário'}</div>
                      <div>{m.mensagem}</div>
                    </div>
                  </div>
                ))}
                {messages.length === 0 && (
                  <div className="text-xs text-muted-foreground">Sem mensagens ainda.</div>
                )}
              </div>

              {activeTicket.status === 'aberto' ? (
                <div className="flex items-center gap-2">
                  <Textarea
                    placeholder="Escreva uma resposta ao usuário"
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                  />
                  <Button onClick={onReply} disabled={!reply.trim()}>
                    <Send className="h-4 w-4 mr-1" /> Enviar
                  </Button>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">Ticket resolvido; novas mensagens bloqueadas.</div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
