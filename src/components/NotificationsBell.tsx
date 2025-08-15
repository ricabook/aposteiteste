import { useEffect, useMemo, useState } from 'react';
import { Bell } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useAdminCheck } from '@/hooks/useAdminCheck';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuItem,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import ptBR from 'date-fns/locale/pt-BR';

type Notification = {
  id: string;
  user_id: string | null;
  role_target: 'admin' | 'user';
  title: string;
  body: string | null;
  link: string | null;
  read: boolean;
  created_at: string;
  // se sua coluna for ENUM:
  // type: 'support:new_ticket' | 'support:admin_reply' | 'generic';
};

export default function NotificationsBell() {
  const { user } = useAuth();
  const { isAdmin } = useAdminCheck();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [items, setItems] = useState<Notification[]>([]);
  const [loadingAll, setLoadingAll] = useState(false);

  const load = async () => {
    if (!user) return setItems([]);
    const base = supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(50);
    let query;
    if (isAdmin) {
      // Admin enxerga broadcast para admin + pessoais dele
      query = base.or(`role_target.eq.admin,user_id.eq.${user.id}`);
    } else {
      query = base.eq('user_id', user.id);
    }
    const { data, error } = await query;
    if (!error && data) setItems(data as Notification[]);
  };

  useEffect(() => {
    load();
    if (!user) return;
    const channel = supabase
      .channel('realtime-notifications')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        (payload: any) => {
          const row = payload.new as Notification;
          // filtra o que interessa para este cliente
          if ((isAdmin && row.role_target === 'admin') || (row.user_id === user.id)) {
            setItems(prev => [row, ...prev].slice(0, 50));
          }
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, isAdmin]);

  const unreadCount = useMemo(() => items.filter(n => !n.read).length, [items]);

  const markOneAsRead = async (id: string) => {
    const { error } = await supabase.from('notifications').update({ read: true }).eq('id', id);
    if (!error) setItems(prev => prev.map(n => (n.id === id ? { ...n, read: true } : n)));
  };

  const open = async (n: Notification) => {
    await markOneAsRead(n.id);
    if (n.link) navigate(n.link);
  };

  const markAllAsRead = async () => {
    if (!user) return;
    try {
      setLoadingAll(true);

      if (isAdmin) {
        // 1) broadcast para admins
        const { error: e1 } = await supabase
          .from('notifications')
          .update({ read: true })
          .eq('role_target', 'admin')
          .eq('read', false);
        if (e1) throw e1;

        // 2) pessoais do admin
        const { error: e2 } = await supabase
          .from('notifications')
          .update({ read: true })
          .eq('user_id', user.id)
          .eq('read', false);
        if (e2) throw e2;
      } else {
        // usuário comum: apenas as suas
        const { error } = await supabase
          .from('notifications')
          .update({ read: true })
          .eq('user_id', user.id)
          .eq('read', false);
        if (error) throw error;
      }

      // Atualiza estado local
      setItems(prev => prev.map(n => ({ ...n, read: true })));
      toast({ title: 'Pronto', description: 'Todas as notificações foram marcadas como lidas.' });
    } catch (err: any) {
      console.error('Erro ao marcar todas como lidas:', err);
      toast({
        title: 'Erro',
        description: err?.message ?? 'Não foi possível marcar todas como lidas.',
        variant: 'destructive',
      });
    } finally {
      setLoadingAll(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-600 px-1 text-[11px] font-bold text-white">
              {unreadCount}
            </span>
          )}
          <span className="sr-only">Notificações</span>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-80 max-h-[70vh] overflow-auto p-0">
        {/* Cabeçalho com "Marcar todas como lidas" */}
        <div className="flex items-center justify-between px-3 py-2">
          <div className="text-sm font-semibold">Notificações</div>
          <Button
            variant="link"
            className="h-auto px-0 text-xs"
            disabled={loadingAll || unreadCount === 0}
            onClick={markAllAsRead}
          >
            {loadingAll ? 'Marcando…' : 'Marcar todas como lidas'}
          </Button>
        </div>
        <DropdownMenuSeparator />

        {items.length === 0 ? (
          <div className="px-3 py-6 text-sm text-muted-foreground">Sem notificações</div>
        ) : (
          items.map((n) => (
            <div key={n.id} className={`px-3 py-2 ${!n.read ? 'bg-muted/50' : ''}`}>
              <div className="text-sm font-medium">{n.title}</div>
              {n.body && <div className="text-xs text-muted-foreground mt-0.5">{n.body}</div>}
              <div className="flex items-center justify-between mt-1">
                <div className="text-[11px] text-muted-foreground">
                  {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: ptBR })}
                </div>
                <div className="flex gap-2">
                  {n.link && (
                    <Button variant="link" className="px-0 h-auto text-xs" onClick={() => open(n)}>
                      Abrir
                    </Button>
                  )}
                  {!n.read && (
                    <Button variant="link" className="px-0 h-auto text-xs" onClick={() => markOneAsRead(n.id)}>
                      Marcar como lida
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
