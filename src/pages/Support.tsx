import { useState } from 'react';
import { useTickets } from '@/hooks/useTickets';
import { useTicketMessages } from '@/hooks/useTicketMessages';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { MessageSquare, Send } from 'lucide-react';

export default function Support() {
  const { user } = useAuth();
  const { tickets, createTicket } = useTickets(false);
  const { toast } = useToast();

  const [form, setForm] = useState({ titulo: '', assunto: '' });
  const [open, setOpen] = useState(false);
  const [activeTicketId, setActiveTicketId] = useState<string | null>(null);
  const { messages, sendMessage } = useTicketMessages(activeTicketId || undefined);
  const activeTicket = tickets.find(t => t.id === activeTicketId) || null;

  const onCreate = async () => {
    try {
      await createTicket.mutateAsync(form);
      setForm({ titulo: '', assunto: '' });
      toast({ title: 'Ticket criado', description: 'Seu ticket foi aberto com sucesso.' });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Erro ao criar ticket', description: e.message });
    }
  };

  const [reply, setReply] = useState('');

  const onReply = async () => {
    if (!activeTicketId) return;
    try {
      await sendMessage.mutateAsync({ ticket_id: activeTicketId, message: reply });
      setReply('');
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Erro ao enviar mensagem', description: e.message });
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-6">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Novo ticket</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <Input
            placeholder="Título do ticket"
            value={form.titulo}
            onChange={(e) => setForm(s => ({ ...s, titulo: e.target.value }))}
          />
          <Textarea
            placeholder="Descreva seu problema (Assunto)"
            value={form.assunto}
            onChange={(e) => setForm(s => ({ ...s, assunto: e.target.value }))}
          />
          <div className="flex justify-end">
            <Button
              onClick={onCreate}
              disabled={!form.titulo.trim() || !form.assunto.trim() || !user}
            >
              Abrir ticket
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Meus tickets</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {tickets.length === 0 && (
            <div className="text-sm text-muted-foreground">Você ainda não abriu nenhum ticket.</div>
          )}

          {tickets.map(t => (
            <div
              key={t.id}
              className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted cursor-pointer"
              onClick={() => { setActiveTicketId(t.id); setOpen(true); }}
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  <span className="font-medium truncate">{t.titulo}</span>
                </div>
                <div className="text-xs text-muted-foreground truncate">{t.assunto}</div>
              </div>
              <Badge variant={t.status === 'aberto' ? 'default' : 'secondary'} className="capitalize">
                {t.status}
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Ticket</DialogTitle>
            <DialogDescription className="sr-only">
              Histórico e mensagens do ticket selecionado.
            </DialogDescription>
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
                  <div key={m.id} className={`flex ${m.autor_role === 'admin' ? 'justify-start' : 'justify-end'}`}>
                    <div className={`max-w-[85%] rounded-lg p-2 text-sm ${m.autor_role === 'admin' ? 'bg-muted' : 'bg-primary text-primary-foreground'}`}>
                      <div className="text-[10px] opacity-60 mb-1">{m.autor_role === 'admin' ? 'Admin' : 'Você'}</div>
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
                    placeholder="Digite sua mensagem"
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                  />
                  <Button onClick={onReply} disabled={!reply.trim()}>
                    <Send className="h-4 w-4 mr-1" /> Enviar
                  </Button>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">Este ticket foi resolvido e não aceita novas mensagens.</div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
