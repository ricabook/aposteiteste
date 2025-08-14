
import { Bell } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { useNotifications } from '@/hooks/useNotifications';
import { useNavigate } from 'react-router-dom';
import { useAdminCheck } from '@/hooks/useAdminCheck';
import { format } from 'date-fns';
import ptBR from 'date-fns/locale/pt-BR';

export default function NotificationsBell() {
  const { notifications, unreadCount, markAllAsRead, markOneAsRead } = useNotifications();
  const { isAdmin } = useAdminCheck();
  const navigate = useNavigate();

  const goTo = (n: any) => {
    const meta = n.metadata || {};
    // Suporte
    if (n.type === 'support_reply' && meta.ticket_id) {
      navigate(isAdmin ? '/admin/messages' : '/support');
      return;
    }
    // Dinheiro, apostas, saques
    if (meta.poll_id) navigate(`/poll/${meta.poll_id}`);
    else if (meta.withdrawal_id) navigate('/my-withdrawals');
    else if (meta.transaction_id) navigate('/my-money');
    else if (n.type === 'bet_closed' || n.type === 'bet_placed') navigate('/portfolio');
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-9 w-9 rounded-full" aria-label="Notificações">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              className="absolute -top-1 -right-1 h-5 min-w-5 px-1 rounded-full flex items-center justify-center text-[10px]"
              variant="destructive"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent className="w-80" align="end" forceMount>
        <div className="flex items-center justify-between px-2 py-1">
          <span className="text-sm font-semibold">Notificações</span>
          <Button
            variant="link"
            className="text-xs"
            onClick={() => markAllAsRead.mutate()}
          >
            Marcar todas como lidas
          </Button>
        </div>
        <DropdownMenuSeparator />

        {notifications.length === 0 && (
          <div className="px-3 py-6 text-sm text-muted-foreground">Nenhuma notificação por aqui.</div>
        )}

        {notifications.slice(0, 15).map((n) => (
          <DropdownMenuItem
            key={n.id}
            className="flex flex-col items-start gap-1 py-2 cursor-pointer"
            onClick={() => {
              markOneAsRead.mutate(n.id);
              goTo(n);
            }}
          >
            <div className="flex items-start gap-2 w-full">
              <div className={`mt-1 h-2 w-2 rounded-full ${n.is_read ? 'bg-muted' : 'bg-primary'}`} />
              <div className="flex-1">
                <div className="text-sm font-medium">{n.title}</div>
                {n.body && <div className="text-xs text-muted-foreground">{n.body}</div>}
                <div className="mt-1 text-[10px] text-muted-foreground">
                  {format(new Date(n.created_at), "dd 'de' MMM 'às' HH:mm", { locale: ptBR })}
                </div>
              </div>
            </div>
          </DropdownMenuItem>
        ))}

        {notifications.length > 15 && (
          <>
            <DropdownMenuSeparator />
            <div className="px-3 py-2 text-xs text-muted-foreground">
              Mostrando as 15 mais recentes.
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
