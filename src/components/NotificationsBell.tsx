
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
import { Link, useNavigate } from 'react-router-dom';
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
};

export default function NotificationsBell() {
  const { user } = useAuth();
  const { isAdmin } = useAdminCheck();
  const navigate = useNavigate();
  const [items, setItems] = useState<Notification[]>([]);

  const load = async () => {
    if (!user) return setItems([]);
    const base = supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(20);
    let query;
    if (isAdmin) {
      // Admin sees admin-targeted + own user-targeted
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
          // Filter in client to avoid flashing irrelevant rows
          if ((isAdmin && row.role_target === 'admin') || (row.user_id === user.id)) {
            setItems(prev => [row, ...prev].slice(0, 20));
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
      <DropdownMenuContent align="end" className="w-80 max-h-[70vh] overflow-auto">
        <div className="px-2 py-1.5 text-sm font-semibold">Notificações</div>
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
