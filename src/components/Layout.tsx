import { ReactNode, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from '@/components/ui/sheet';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useAdminCheck } from '@/hooks/useAdminCheck';
import { useIsMobile } from '@/hooks/use-mobile';
import ThemeToggle from '@/components/ThemeToggle';
import Logo from '@/components/Logo';
import SearchBar from '@/components/SearchBar';
import Footer from '@/components/Footer';
import { User, Settings, LogOut, Wallet, BarChart3, Shield, Menu, X, Banknote, Users } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface LayoutProps {
  children: ReactNode;
  onSearch?: (query: string) => void;
}

const Layout = ({ children, onSearch }: LayoutProps) => {
  const { user, signOut } = useAuth();
  const { profile } = useProfile();
  const { isAdmin } = useAdminCheck();
  const location = useLocation();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleSignOut = async () => {
    const { error } = await signOut();
    // signOut já trata erros de sessão não encontrada internamente
    // Só consideramos erro real se não for relacionado a sessão
    if (error && !error.message?.includes('session_not_found') && 
        !error.message?.includes('Session not found')) {
      toast({
        title: "Erro",
        description: "Erro ao fazer logout",
        variant: "destructive",
      });
    } else {
      navigate('/');
      toast({
        title: "Logout realizado",
        description: "Você foi desconectado com sucesso",
      });
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(amount);
  };

  const getInitials = (email: string) => {
    return email.charAt(0).toUpperCase();
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen bg-background">
      <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center space-x-8">
            <Link 
              to="/" 
              className="flex items-center hover:opacity-80 transition-opacity"
            >
              <Logo />
            </Link>
            
            
            <div className="hidden md:flex items-center space-x-6">
              <Link 
                to="/" 
                className={`text-sm font-medium transition-colors hover:text-primary ${
                  isActive('/') ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                Mercados
              </Link>
              {user && (
                <>
                  <Link 
                    to="/portfolio" 
                    className={`text-sm font-medium transition-colors hover:text-primary ${
                      isActive('/portfolio') ? 'text-primary' : 'text-muted-foreground'
                    }`}
                  >
                    Minhas apostas
                  </Link>
                  <Link 
                    to="/my-money" 
                    className={`text-sm font-medium transition-colors hover:text-primary ${
                      isActive('/my-money') ? 'text-primary' : 'text-muted-foreground'
                    }`}
                  >
                    Meu dinheiro
                  </Link>
                   {!isAdmin && (
                     <Link 
                       to="/my-polls" 
                       className={`text-sm font-medium transition-colors hover:text-primary ${
                         isActive('/my-polls') ? 'text-primary' : 'text-muted-foreground'
                       }`}
                     >
                       Minhas Enquetes
                     </Link>
                   )}
                  {isAdmin && (
                    <>
                      <Link 
                        to="/admin" 
                        className={`text-sm font-medium transition-colors hover:text-primary ${
                          isActive('/admin') || location.pathname.startsWith('/admin') 
                            ? 'text-primary' 
                            : 'text-muted-foreground'
                        }`}
                      >
                        Admin
                      </Link>
                      <Link 
                        to="/admin/polls" 
                        className={`text-sm font-medium transition-colors hover:text-primary ${
                          isActive('/admin/polls') ? 'text-primary' : 'text-muted-foreground'
                        }`}
                      >
                        Enquetes
                      </Link>
                       <Link 
                         to="/admin/users" 
                         className={`text-sm font-medium transition-colors hover:text-primary ${
                           isActive('/admin/users') ? 'text-primary' : 'text-muted-foreground'
                         }`}
                       >
                         Usuários
                       </Link>
                       <Link 
                         to="/admin/wallet" 
                         className={`text-sm font-medium transition-colors hover:text-primary ${
                           isActive('/admin/wallet') ? 'text-primary' : 'text-muted-foreground'
                         }`}
                       >
                         Wallet
                       </Link>
                        <Link 
                          to="/admin/banners" 
                          className={`text-sm font-medium transition-colors hover:text-primary ${
                            isActive('/admin/banners') ? 'text-primary' : 'text-muted-foreground'
                          }`}
                        >
                          Banners
                        </Link>
                        <Link 
                          to="/admin/withdrawals" 
                          className={`text-sm font-medium transition-colors hover:text-primary ${
                            isActive('/admin/withdrawals') ? 'text-primary' : 'text-muted-foreground'
                          }`}
                        >
                          Saques
                        </Link>
                    </>
                  )}
                </>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            
            {/* Mobile Menu Button */}
            {isMobile && (
              <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-9 w-9 p-0">
                    <Menu className="h-5 w-5" />
                    <span className="sr-only">Abrir menu</span>
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-72 p-0">
                  <div className="flex flex-col h-full">
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b">
                      <Link to="/" onClick={() => setIsMobileMenuOpen(false)}>
                        <Logo />
                      </Link>
                    </div>
                    
                    {/* User Info */}
                    {user && profile && (
                      <div className="p-4 border-b bg-muted/50">
                        <div className="flex items-center space-x-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={profile?.avatar_url} alt="Avatar" />
                            <AvatarFallback>
                              {getInitials(user.email || '')}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {profile?.display_name || user.email}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {user.email}
                            </p>
                            <div className="flex items-center space-x-1 mt-1">
                              <Wallet className="h-3 w-3 text-green-600" />
                              <span className="text-sm font-semibold text-green-600">
                                {formatCurrency(profile.wallet_balance)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Navigation Links */}
                    <div className="flex-1 overflow-auto p-4">
                      <nav className="space-y-2">
                        <Link
                          to="/"
                          onClick={() => setIsMobileMenuOpen(false)}
                          className={`flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                            isActive('/') 
                              ? 'bg-primary text-primary-foreground' 
                              : 'text-foreground hover:bg-muted'
                          }`}
                        >
                          <BarChart3 className="h-5 w-5" />
                          <span>Mercados</span>
                        </Link>
                        
                        {user && (
                          <>
                            <Link
                              to="/portfolio"
                              onClick={() => setIsMobileMenuOpen(false)}
                              className={`flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                                isActive('/portfolio') 
                                  ? 'bg-primary text-primary-foreground' 
                                  : 'text-foreground hover:bg-muted'
                              }`}
                            >
                              <BarChart3 className="h-5 w-5" />
                              <span>Minhas apostas</span>
                            </Link>
                            
                            <Link
                              to="/my-money"
                              onClick={() => setIsMobileMenuOpen(false)}
                              className={`flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                                isActive('/my-money') 
                                  ? 'bg-primary text-primary-foreground' 
                                  : 'text-foreground hover:bg-muted'
                              }`}
                            >
                              <Wallet className="h-5 w-5" />
                              <span>Meu dinheiro</span>
                            </Link>
                            
                             {!isAdmin && (
                               <Link
                                 to="/my-polls"
                                 onClick={() => setIsMobileMenuOpen(false)}
                                 className={`flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                                   isActive('/my-polls') 
                                     ? 'bg-primary text-primary-foreground' 
                                     : 'text-foreground hover:bg-muted'
                                 }`}
                               >
                                 <BarChart3 className="h-5 w-5" />
                                 <span>Minhas Enquetes</span>
                               </Link>
                             )}
                            
                            <Link
                              to="/settings"
                              onClick={() => setIsMobileMenuOpen(false)}
                              className={`flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                                isActive('/settings') 
                                  ? 'bg-primary text-primary-foreground' 
                                  : 'text-foreground hover:bg-muted'
                              }`}
                            >
                              <Settings className="h-5 w-5" />
                              <span>Configurações</span>
                            </Link>
                            
                            {isAdmin && (
                              <>
                                <div className="border-t pt-2 mt-2">
                                  <p className="px-3 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                    Admin
                                  </p>
                                </div>
                                <Link
                                  to="/admin"
                                  onClick={() => setIsMobileMenuOpen(false)}
                                  className={`flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                                    isActive('/admin') || location.pathname.startsWith('/admin')
                                      ? 'bg-primary text-primary-foreground' 
                                      : 'text-foreground hover:bg-muted'
                                  }`}
                                >
                                  <Shield className="h-5 w-5" />
                                  <span>Painel Admin</span>
                                </Link>
                                
                                <Link
                                  to="/admin/polls"
                                  onClick={() => setIsMobileMenuOpen(false)}
                                  className={`flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                                    isActive('/admin/polls') 
                                      ? 'bg-primary text-primary-foreground' 
                                      : 'text-foreground hover:bg-muted'
                                  }`}
                                >
                                  <BarChart3 className="h-5 w-5" />
                                  <span>Enquetes</span>
                                </Link>
                                
                                 <Link
                                   to="/admin/users"
                                   onClick={() => setIsMobileMenuOpen(false)}
                                   className={`flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                                     isActive('/admin/users') 
                                       ? 'bg-primary text-primary-foreground' 
                                       : 'text-foreground hover:bg-muted'
                                   }`}
                                 >
                                   <Users className="h-5 w-5" />
                                   <span>Usuários</span>
                                 </Link>
                                
                                 <Link
                                   to="/admin/wallet"
                                   onClick={() => setIsMobileMenuOpen(false)}
                                   className={`flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                                     isActive('/admin/wallet') 
                                       ? 'bg-primary text-primary-foreground' 
                                       : 'text-foreground hover:bg-muted'
                                   }`}
                                 >
                                   <Wallet className="h-5 w-5" />
                                   <span>Wallet</span>
                                 </Link>
                                 
                                  <Link
                                    to="/admin/banners"
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className={`flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                                      isActive('/admin/banners') 
                                        ? 'bg-primary text-primary-foreground' 
                                        : 'text-foreground hover:bg-muted'
                                    }`}
                                  >
                                    <BarChart3 className="h-5 w-5" />
                                    <span>Banners</span>
                                  </Link>
                                  
                                  <Link
                                    to="/admin/withdrawals"
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className={`flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                                      isActive('/admin/withdrawals') 
                                        ? 'bg-primary text-primary-foreground' 
                                        : 'text-foreground hover:bg-muted'
                                    }`}
                                  >
                                    <Banknote className="h-5 w-5" />
                                    <span>Saques</span>
                                  </Link>
                              </>
                            )}
                          </>
                        )}
                        
                      </nav>
                    </div>
                    
                    {/* Footer Actions */}
                    <div className="p-4 border-t space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Tema</span>
                        <ThemeToggle />
                      </div>
                      
                      {user ? (
                        <Button 
                          variant="outline" 
                          className="w-full"
                          onClick={() => {
                            handleSignOut();
                            setIsMobileMenuOpen(false);
                          }}
                        >
                          <LogOut className="mr-2 h-4 w-4" />
                          Sair
                        </Button>
                      ) : (
                        <Button asChild className="w-full">
                          <Link to="/auth" onClick={() => setIsMobileMenuOpen(false)}>
                            Entrar
                          </Link>
                        </Button>
                      )}
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            )}
            
            {/* Desktop Navigation */}
            {!isMobile && (
              <>
                <ThemeToggle />
                
                {user ? (
                  <div className="flex items-center space-x-4">
                    {profile && (
                      <Badge variant="secondary" className="hidden sm:flex items-center space-x-1">
                        <Wallet className="h-3 w-3" />
                        <span className="text-base font-semibold" style={{ color: '#43C769' }}>{formatCurrency(profile.wallet_balance)}</span>
                      </Badge>
                    )}
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                          <Avatar className="h-9 w-9">
                            <AvatarImage src={profile?.avatar_url} alt="Avatar" />
                            <AvatarFallback>
                              {getInitials(user.email || '')}
                            </AvatarFallback>
                          </Avatar>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="w-56" align="end" forceMount>
                        <div className="flex flex-col space-y-1 p-2">
                          <p className="text-sm font-medium leading-none">
                            {profile?.display_name || user.email}
                          </p>
                          <p className="text-xs leading-none text-muted-foreground">
                            {user.email}
                          </p>
                          {profile && (
                            <p className="text-sm leading-none font-semibold pt-1" style={{ color: '#43C769' }}>
                              Saldo: {formatCurrency(profile.wallet_balance)}
                            </p>
                          )}
                        </div>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                          <Link to="/portfolio" className="flex items-center">
                            <BarChart3 className="mr-2 h-4 w-4" />
                            <span>Minhas apostas</span>
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link to="/my-money" className="flex items-center">
                            <Wallet className="mr-2 h-4 w-4" />
                            <span>Meu dinheiro</span>
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link to="/settings" className="flex items-center">
                            <Settings className="mr-2 h-4 w-4" />
                            <span>Configurações</span>
                          </Link>
                        </DropdownMenuItem>
                         {isAdmin && (
                           <>
                             <DropdownMenuSeparator />
                             <DropdownMenuItem asChild>
                               <Link to="/admin" className="flex items-center">
                                 <Shield className="mr-2 h-4 w-4" />
                                 <span>Painel Admin</span>
                               </Link>
                             </DropdownMenuItem>
                             <DropdownMenuItem asChild>
                               <Link to="/admin/wallet" className="flex items-center">
                                 <Wallet className="mr-2 h-4 w-4" />
                                 <span>Wallet</span>
                               </Link>
                             </DropdownMenuItem>
                           </>
                         )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={handleSignOut}>
                          <LogOut className="mr-2 h-4 w-4" />
                          <span>Sair</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ) : (
                  <Button asChild>
                    <Link to="/auth">Entrar</Link>
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </nav>
      
      <main>{children}</main>
      <Footer />
    </div>
  );
};

export default Layout;