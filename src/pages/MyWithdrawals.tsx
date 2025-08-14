import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Download } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

interface Withdrawal {
  id: string;
  amount: number;
  pix_key: string;
  status: 'pending' | 'confirmed' | 'cancelled';
  created_at: string;
  processed_at?: string;
  notes?: string;
}

export default function MyWithdrawals() {
  const { user } = useAuth();

  const { data: withdrawals, isLoading } = useQuery({
    queryKey: ['userWithdrawals', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('withdrawals')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Withdrawal[];
    },
    enabled: !!user,
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR');
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive'> = {
      pending: 'default',
      confirmed: 'secondary',
      cancelled: 'destructive'
    };

    const labels: Record<string, string> = {
      pending: 'Pendente',
      confirmed: 'Confirmado',
      cancelled: 'Cancelado'
    };

    return (
      <Badge variant={variants[status] || 'default'}>
        {labels[status] || status}
      </Badge>
    );
  };

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Meus Saques</h1>
          <p className="text-muted-foreground mb-6">Você precisa estar logado para ver seus saques</p>
          <Link to="/auth">
            <Button>Fazer Login</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link to="/my-money">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
          </Link>
          <h1 className="text-3xl font-bold">Meus Saques</h1>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-8">
          <p className="text-muted-foreground">Carregando saques...</p>
        </div>
      ) : !withdrawals || withdrawals.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <Download className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Nenhum saque solicitado ainda</p>
            <Link to="/my-money" className="inline-block mt-4">
              <Button>Solicitar Primeiro Saque</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {withdrawals.map((withdrawal) => (
            <Card key={withdrawal.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg">
                    Saque #{withdrawal.id.slice(0, 8)}
                  </CardTitle>
                  {getStatusBadge(withdrawal.status)}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <h4 className="font-semibold text-sm text-muted-foreground">Valor</h4>
                    <p className="text-xl font-bold text-green-600">
                      {formatCurrency(withdrawal.amount)}
                    </p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm text-muted-foreground">Chave PIX</h4>
                    <p className="font-mono text-sm bg-muted px-2 py-1 rounded">
                      {withdrawal.pix_key}
                    </p>
                  </div>
                </div>
                
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <h4 className="font-semibold text-sm text-muted-foreground">Solicitado em</h4>
                    <p className="text-sm">{formatDate(withdrawal.created_at)}</p>
                  </div>
                  {withdrawal.processed_at && (
                    <div>
                      <h4 className="font-semibold text-sm text-muted-foreground">Processado em</h4>
                      <p className="text-sm">{formatDate(withdrawal.processed_at)}</p>
                    </div>
                  )}
                </div>

                {withdrawal.notes && (
                  <div>
                    <h4 className="font-semibold text-sm text-muted-foreground">Observações</h4>
                    <p className="text-sm bg-muted p-3 rounded">
                      {withdrawal.notes}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}