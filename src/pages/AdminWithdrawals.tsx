import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAdminCheck } from '@/hooks/useAdminCheck';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Download, Filter } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Withdrawal {
  id: string;
  user_id: string;
  amount: number;
  pix_key: string;
  status: 'pending' | 'confirmed' | 'cancelled';
  created_at: string;
  processed_at?: string;
  processed_by?: string;
  notes?: string;
  profiles?: {
    display_name?: string;
  };
}

export default function AdminWithdrawals() {
  const { isAdmin, isLoading: adminLoading } = useAdminCheck();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<Withdrawal | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [notes, setNotes] = useState('');
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: withdrawals, isLoading, error, refetch } = useQuery({
    queryKey: ['adminWithdrawals', statusFilter],
    queryFn: async () => {
      try {
        // First, get withdrawals
        let withdrawalsQuery = supabase
          .from('withdrawals')
          .select('*')
          .order('created_at', { ascending: false });

        if (statusFilter !== 'all') {
          withdrawalsQuery = withdrawalsQuery.eq('status', statusFilter);
        }

        const { data: withdrawalsData, error: withdrawalsError } = await withdrawalsQuery;
        
        if (withdrawalsError) {
          console.error('Error fetching withdrawals:', withdrawalsError);
          throw withdrawalsError;
        }

        if (!withdrawalsData || withdrawalsData.length === 0) {
          return [];
        }

        // Get unique user IDs
        const userIds = [...new Set(withdrawalsData.map(w => w.user_id))];
        
        // Get profiles for these users
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('user_id, display_name')
          .in('user_id', userIds);

        if (profilesError) {
          console.error('Error fetching profiles:', profilesError);
          // Don't throw here, just continue without profile data
        }

        // Create profiles map
        const profilesMap = new Map(
          (profilesData || []).map(p => [p.user_id, p])
        );

        // Combine data
        const combinedData = withdrawalsData.map(withdrawal => ({
          ...withdrawal,
          profiles: profilesMap.get(withdrawal.user_id) || null
        }));

        return combinedData as Withdrawal[];
      } catch (err) {
        console.error('Query error:', err);
        throw err;
      }
    },
    enabled: isAdmin,
    staleTime: 10 * 1000, // 10 seconds - refresh more often for admin data
    gcTime: 2 * 60 * 1000, // 2 minutes
    retry: 3,
    refetchInterval: 30 * 1000, // Auto refresh every 30 seconds
  });

  // Listen for withdrawal updates
  useEffect(() => {
    const handleInvalidate = () => {
      refetch();
    };
    
    window.addEventListener('invalidateWithdrawals', handleInvalidate);
    return () => window.removeEventListener('invalidateWithdrawals', handleInvalidate);
  }, [refetch]);

  const updateWithdrawalStatus = async (id: string, newStatus: 'confirmed' | 'cancelled') => {
    setIsUpdating(true);
    try {
      // Find the withdrawal to get user_id and amount
      const withdrawal = withdrawals?.find(w => w.id === id);
      if (!withdrawal) {
        throw new Error('Saque não encontrado');
      }

      // Update withdrawal status
      const { error: withdrawalError } = await supabase
        .from('withdrawals')
        .update({
          status: newStatus,
          processed_at: new Date().toISOString(),
          notes: notes || null,
        })
        .eq('id', id);

      if (withdrawalError) {
        console.error('Error updating withdrawal:', withdrawalError);
        throw withdrawalError;
      }

      // If confirmed, deduct amount from user's wallet balance
      if (newStatus === 'confirmed') {
        const { error: walletError } = await supabase.rpc('execute_wallet_transaction', {
          _user_id: withdrawal.user_id,
          _amount: -withdrawal.amount, // Negative amount to deduct
          _transaction_type: 'withdrawal',
          _description: `Saque confirmado - PIX: ${withdrawal.pix_key}`
        });

        if (walletError) {
          console.error('Error updating wallet balance:', walletError);
          throw walletError;
        }
      }

      toast({
        title: "Status atualizado",
        description: `Saque ${newStatus === 'confirmed' ? 'confirmado' : 'cancelado'} com sucesso.`,
      });

      queryClient.invalidateQueries({ queryKey: ['adminWithdrawals'] });
      // Also invalidate profile queries to update balance
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      setSelectedWithdrawal(null);
      setNotes('');
    } catch (error) {
      console.error('Error updating withdrawal:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar status do saque.",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

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

  if (isLoading || adminLoading) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="text-center">
          <p className="text-muted-foreground">Carregando saques...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Erro ao carregar saques</h1>
          <p className="text-muted-foreground mb-4">
            Ocorreu um erro ao carregar os dados. Tente recarregar a página.
          </p>
          <Button onClick={() => window.location.reload()}>
            Recarregar Página
          </Button>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Acesso Negado</h1>
          <p className="text-muted-foreground">Você não tem permissão para acessar esta página.</p>
        </div>
      </div>
    );
  }

  const totalPending = withdrawals?.filter(w => w.status === 'pending').length || 0;
  const totalAmount = withdrawals?.reduce((sum, w) => sum + Number(w.amount), 0) || 0;

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link to="/admin">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
          </Link>
          <h1 className="text-3xl font-bold">Saques - Administração</h1>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={() => refetch()} disabled={isLoading}>
            {isLoading ? 'Carregando...' : 'Atualizar'}
          </Button>
        </div>
      </div>

      {/* Estatísticas */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saques Pendentes</CardTitle>
            <Download className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{totalPending}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Saques</CardTitle>
            <Download className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{withdrawals?.length || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
            <Download className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(totalAmount)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Filter className="h-5 w-5" />
            <span>Filtros</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex space-x-4">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filtrar por status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="pending">Pendente</SelectItem>
                <SelectItem value="confirmed">Confirmado</SelectItem>
                <SelectItem value="cancelled">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Saques */}
      {!withdrawals || withdrawals.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <Download className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Nenhum saque encontrado</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {withdrawals.map((withdrawal) => (
            <Card key={withdrawal.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">
                      Saque #{withdrawal.id.slice(0, 8)}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Usuário: {withdrawal.profiles?.display_name || 'N/A'}
                    </p>
                  </div>
                  {getStatusBadge(withdrawal.status)}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
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
                  <div>
                    <h4 className="font-semibold text-sm text-muted-foreground">Solicitado em</h4>
                    <p className="text-sm">{formatDate(withdrawal.created_at)}</p>
                  </div>
                </div>

                {withdrawal.processed_at && (
                  <div>
                    <h4 className="font-semibold text-sm text-muted-foreground">Processado em</h4>
                    <p className="text-sm">{formatDate(withdrawal.processed_at)}</p>
                  </div>
                )}

                {withdrawal.notes && (
                  <div>
                    <h4 className="font-semibold text-sm text-muted-foreground">Observações</h4>
                    <p className="text-sm bg-muted p-3 rounded">{withdrawal.notes}</p>
                  </div>
                )}

                {withdrawal.status === 'pending' && (
                  <div className="flex space-x-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button 
                          variant="default" 
                          size="sm"
                          onClick={() => setSelectedWithdrawal(withdrawal)}
                        >
                          Confirmar
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Confirmar Saque</DialogTitle>
                          <DialogDescription>
                            Você está prestes a confirmar o saque de {formatCurrency(withdrawal.amount)} 
                            para a chave PIX {withdrawal.pix_key}.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <label className="text-sm font-medium">Observações (opcional)</label>
                            <Textarea
                              value={notes}
                              onChange={(e) => setNotes(e.target.value)}
                              placeholder="Adicione observações sobre o processamento..."
                              className="mt-1"
                            />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button
                            variant="outline"
                            onClick={() => {
                              setSelectedWithdrawal(null);
                              setNotes('');
                            }}
                          >
                            Cancelar
                          </Button>
                          <Button
                            onClick={() => updateWithdrawalStatus(withdrawal.id, 'confirmed')}
                            disabled={isUpdating}
                          >
                            {isUpdating ? 'Processando...' : 'Confirmar Saque'}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>

                    <Dialog>
                      <DialogTrigger asChild>
                        <Button 
                          variant="destructive" 
                          size="sm"
                          onClick={() => setSelectedWithdrawal(withdrawal)}
                        >
                          Cancelar
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Cancelar Saque</DialogTitle>
                          <DialogDescription>
                            Você está prestes a cancelar o saque de {formatCurrency(withdrawal.amount)}.
                            Esta ação não pode ser desfeita.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <label className="text-sm font-medium">Motivo do cancelamento</label>
                            <Textarea
                              value={notes}
                              onChange={(e) => setNotes(e.target.value)}
                              placeholder="Explique o motivo do cancelamento..."
                              className="mt-1"
                              required
                            />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button
                            variant="outline"
                            onClick={() => {
                              setSelectedWithdrawal(null);
                              setNotes('');
                            }}
                          >
                            Voltar
                          </Button>
                          <Button
                            variant="destructive"
                            onClick={() => updateWithdrawalStatus(withdrawal.id, 'cancelled')}
                            disabled={isUpdating || !notes.trim()}
                          >
                            {isUpdating ? 'Processando...' : 'Cancelar Saque'}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
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