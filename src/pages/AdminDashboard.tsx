import { Navigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useAdminCheck } from '@/hooks/useAdminCheck';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarChart3, Users, TrendingUp, DollarSign } from 'lucide-react';

const AdminDashboard = () => {
  const { user, loading } = useAuth();
  const { isAdmin, isLoading: adminLoading } = useAdminCheck();

  // Fetch dashboard stats
  const { data: stats } = useQuery({
    queryKey: ['adminStats'],
    queryFn: async () => {
      // Get polls count
      const { count: pollsCount } = await supabase
        .from('polls')
        .select('*', { count: 'exact', head: true });

      // Get users count
      const { count: usersCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      // Calculate fees received from early closures in current month
      const currentMonth = new Date();
      const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
      const lastDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);

      const { data: earlyClosures } = await supabase
        .from('wallet_transactions')
        .select('amount, description')
        .eq('transaction_type', 'admin_adjustment')
        .gte('created_at', firstDayOfMonth.toISOString())
        .lte('created_at', lastDayOfMonth.toISOString());

      // Calculate total fees from early closures
      let totalFeesReceived = 0;
      if (earlyClosures) {
        for (const transaction of earlyClosures) {
          // Extract P&L from description: "... (taxa 10%, P&L: -XX.XX)"
          const pnlMatch = transaction.description?.match(/P&L: (-?\d+\.?\d*)/);
          if (pnlMatch) {
            const pnl = parseFloat(pnlMatch[1]);
            const payout = transaction.amount;
            
            // Calculate original bet amount based on the payout logic
            // If P&L >= 0: base_payout = original_amount, payout = base_payout * 0.9
            // If P&L < 0: base_payout = original_amount + pnl, payout = base_payout * 0.9
            let originalAmount;
            if (pnl >= 0) {
              // payout = original_amount * 0.9
              originalAmount = payout / 0.9;
            } else {
              // payout = (original_amount + pnl) * 0.9
              const basePayout = payout / 0.9;
              originalAmount = basePayout - pnl;
            }
            
            // Total fee = original_amount - payout
            const totalFee = originalAmount - payout;
            totalFeesReceived += totalFee;
          }
        }
      }

      return {
        totalPolls: pollsCount || 0,
        totalUsers: usersCount || 0,
        feesReceived: totalFeesReceived,
      };
    },
    enabled: isAdmin,
  });

  if (loading || adminLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center space-x-2">
        <BarChart3 className="h-6 w-6 text-primary" />
        <h1 className="text-3xl font-bold">Painel de Administração</h1>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Enquetes</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalPolls || 0}</div>
            <p className="text-xs text-muted-foreground">
              Enquetes cadastradas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxas Recebidas</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R$ {(stats?.feesReceived || 0).toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              Descontos do mês atual
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Usuários</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalUsers || 0}</div>
            <p className="text-xs text-muted-foreground">
              Usuários registrados
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Ações Rápidas</CardTitle>
            <CardDescription>
              Acesse as funcionalidades principais do painel
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Badge variant="outline" className="w-full justify-start p-3">
              <Link to="/admin/polls" className="flex items-center space-x-2">
                <BarChart3 className="h-4 w-4" />
                <span>Gerenciar Enquetes</span>
              </Link>
            </Badge>
            <Badge variant="outline" className="w-full justify-start p-3">
              <Link to="/admin/users" className="flex items-center space-x-2">
                <Users className="h-4 w-4" />
                <span>Gerenciar Usuários</span>
              </Link>
            </Badge>
            <Badge variant="outline" className="w-full justify-start p-3">
              <Link to="/admin/wallet" className="flex items-center space-x-2">
                <DollarSign className="h-4 w-4" />
                <span>Gerenciar Carteiras</span>
              </Link>
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Status do Sistema</CardTitle>
            <CardDescription>
              Informações sobre o estado atual da plataforma
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Sistema</span>
              <Badge variant="default">Online</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Enquetes</span>
              <Badge variant="default">Funcionando</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Comentários</span>
              <Badge variant="default">Funcionando</Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboard;