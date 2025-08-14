import { NavLink, Link } from 'react-router-dom';
import NotificationsBell from '@/components/NotificationsBell';
import { useAuth } from '@/hooks/useAuth';

export default function Layout({ children }) {
  const { user, isAdmin } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center gap-2 px-4 py-2">
          <NotificationsBell />
          <div className="flex items-center space-x-8">

            {/* Links comuns para todos */}
            <NavLink
              to="/"
              className={({ isActive }) =>
                `text-sm font-medium transition-colors hover:text-primary ${isActive ? 'text-primary' : 'text-muted-foreground'}`
              }
              end
            >
              Mercados
            </NavLink>

            <NavLink
              to="/portfolio"
              className={({ isActive }) =>
                `text-sm font-medium transition-colors hover:text-primary ${isActive ? 'text-primary' : 'text-muted-foreground'}`
              }
            >
              Minhas apostas
            </NavLink>

            <NavLink
              to="/my-money"
              className={({ isActive }) =>
                `text-sm font-medium transition-colors hover:text-primary ${isActive ? 'text-primary' : 'text-muted-foreground'}`
              }
            >
              Meu dinheiro
            </NavLink>

            {/* Links exclusivos para admin */}
            {isAdmin && (
              <>
                <NavLink to="/admin" className={({ isActive }) =>
                  `text-sm font-medium transition-colors hover:text-primary ${isActive ? 'text-primary' : 'text-muted-foreground'}`} end>
                  Admin
                </NavLink>
                <NavLink to="/admin/polls" className={({ isActive }) =>
                  `text-sm font-medium transition-colors hover:text-primary ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>
                  Enquetes
                </NavLink>
                <NavLink to="/admin/users" className={({ isActive }) =>
                  `text-sm font-medium transition-colors hover:text-primary ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>
                  Usuários
                </NavLink>
                <NavLink to="/admin/wallet" className={({ isActive }) =>
                  `text-sm font-medium transition-colors hover:text-primary ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>
                  Wallet
                </NavLink>
                <NavLink to="/admin/banners" className={({ isActive }) =>
                  `text-sm font-medium transition-colors hover:text-primary ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>
                  Banners
                </NavLink>
                <NavLink to="/admin/withdrawals" className={({ isActive }) =>
                  `text-sm font-medium transition-colors hover:text-primary ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>
                  Saques
                </NavLink>
              </>
            )}

            {/* Links exclusivos para usuário comum */}
            {!isAdmin && (
              <>
                <NavLink to="/my-polls" className={({ isActive }) =>
                  `text-sm font-medium transition-colors hover:text-primary ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>
                  Minhas Enquetes
                </NavLink>
                <NavLink to="/support" className={({ isActive }) =>
                  `text-sm font-medium transition-colors hover:text-primary ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>
                  Suporte
                </NavLink>
              </>
            )}

          </div>
        </div>
      </nav>
      <main>{children}</main>
    </div>
  );
}
