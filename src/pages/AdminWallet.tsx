import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useAdminCheck } from '@/hooks/useAdminCheck';
import { Navigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Wallet, Plus, Minus, Search, User } from 'lucide-react';

const AdminWallet = () => {
  const { user } = useAuth();
  const { isAdmin, isLoading: adminLoading } = useAdminCheck();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedUserId, setSelectedUserId] = useState('');
  const [amount, setAmount] = useState('');
  const [operation, setOperation] = useState<'add' | 'remove'>('add');
  const [description, setDescription] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);

  // Fetch all users with profiles
  const { data: users = [], refetch: refetchUsers } = useQuery({
    queryKey: ['adminUsers', searchTerm],
    queryFn: async () => {
      let query = supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (searchTerm) {
        // Enhanced search across multiple fields
        const searchPattern = `%${searchTerm}%`;
        query = query.or(`display_name.ilike.${searchPattern},nome_completo.ilike.${searchPattern},cpf.ilike.${searchPattern}`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: isAdmin,
  });

  // Fetch recent wallet transactions
  const { data: transactions = [] } = useQuery({
    queryKey: ['adminTransactions'],
    queryFn: async () => {
      const { data: walletTransactions, error } = await supabase
        .from('wallet_transactions')
        .select('*')
        .eq('transaction_type', 'admin_adjustment')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      // Manually fetch user profiles for each transaction
      const transactionsWithProfiles = await Promise.all(
        (walletTransactions || []).map(async (transaction) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('display_name')
            .eq('user_id', transaction.user_id)
            .single();
          
          return {
            ...transaction,
            profiles: profile
          };
        })
      );

      return transactionsWithProfiles;
    },
    enabled: isAdmin,
  });

  if (adminLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  const handleWalletAdjustment = async () => {
    if (!selectedUserId || !amount || parseFloat(amount) <= 0) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos corretamente",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const adjustmentAmount = parseFloat(amount);
      const finalAmount = operation === 'add' ? adjustmentAmount : -adjustmentAmount;

      // Get current balance
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('wallet_balance')
        .eq('user_id', selectedUserId)
        .single();

      if (profileError) throw profileError;

      const newBalance = profile.wallet_balance + finalAmount;

      if (newBalance < 0) {
        toast({
          title: "Erro",
          description: "O saldo não pode ficar negativo",
          variant: "destructive",
        });
        return;
      }

      // Update wallet balance
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ wallet_balance: newBalance })
        .eq('user_id', selectedUserId);

      if (updateError) throw updateError;

      // Record transaction
      const { error: transactionError } = await supabase
        .from('wallet_transactions')
        .insert({
          user_id: selectedUserId,
          transaction_type: 'admin_adjustment',
          amount: finalAmount,
          description: description || `Ajuste ${operation === 'add' ? 'de crédito' : 'de débito'} pelo admin`,
          admin_user_id: user?.id,
        });

      if (transactionError) throw transactionError;

      toast({
        title: "Sucesso",
        description: `${operation === 'add' ? 'Crédito adicionado' : 'Débito realizado'} com sucesso`,
      });

      // Reset form
      setSelectedUserId('');
      setAmount('');
      setDescription('');
      
      // Refresh data and invalidate profile queries
      refetchUsers();
      
      // Invalidate all profile queries to update saldo in navbar immediately
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      queryClient.invalidateQueries({ queryKey: ['adminTransactions'] });

    } catch (error) {
      console.error('Error adjusting wallet:', error);
      toast({
        title: "Erro",
        description: "Não foi possível realizar o ajuste",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const selectedUser = users.find(u => u.user_id === selectedUserId);

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center space-x-2">
        <Wallet className="h-6 w-6 text-primary" />
        <h1 className="text-3xl font-bold">Gerenciamento de Carteira</h1>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Wallet Adjustment Form */}
        <Card>
          <CardHeader>
            <CardTitle>Ajustar Saldo do Usuário</CardTitle>
            <CardDescription>
              Adicione ou remova créditos da carteira de qualquer usuário
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* User Search */}
            <div className="space-y-2">
              <Label>Buscar Usuário</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Buscar por nome, e-mail ou CPF..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* User Selection */}
            <div className="space-y-2">
              <Label>Selecionar Usuário</Label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="Escolha um usuário" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.user_id} value={user.user_id}>
                      <div className="flex flex-col space-y-1 py-1">
                        <div className="flex items-center space-x-2">
                          <User className="h-4 w-4" />
                          <span className="font-medium">{user.display_name || user.nome_completo || 'Usuário sem nome'}</span>
                          <Badge variant="outline">
                            {user.wallet_balance.toFixed(2)} BRL
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground ml-6">
                          {user.cpf && <div>CPF: {user.cpf}</div>}
                          {user.nome_completo && user.nome_completo !== user.display_name && <div>Nome: {user.nome_completo}</div>}
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedUser && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm">
                  <strong>Saldo atual:</strong> {selectedUser.wallet_balance.toFixed(2)} BRL
                </p>
              </div>
            )}

            {/* Operation Type */}
            <div className="space-y-2">
              <Label>Operação</Label>
              <Select value={operation} onValueChange={(value) => setOperation(value as 'add' | 'remove')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="add">
                    <div className="flex items-center space-x-2">
                      <Plus className="h-4 w-4 text-green-600" />
                      <span>Adicionar Crédito</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="remove">
                    <div className="flex items-center space-x-2">
                      <Minus className="h-4 w-4 text-red-600" />
                      <span>Remover Crédito</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Amount */}
            <div className="space-y-2">
              <Label>Valor (BRL)</Label>
              <Input
                type="number"
                min="0.01"
                step="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label>Descrição (opcional)</Label>
              <Input
                placeholder="Motivo do ajuste..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <Button
              onClick={handleWalletAdjustment}
              disabled={!selectedUserId || !amount || parseFloat(amount) <= 0 || loading}
              className="w-full"
            >
              {loading ? 'Processando...' : `${operation === 'add' ? 'Adicionar' : 'Remover'} Crédito`}
            </Button>
          </CardContent>
        </Card>

        {/* Recent Transactions */}
        <Card>
          <CardHeader>
            <CardTitle>Transações Recentes</CardTitle>
            <CardDescription>
              Últimos ajustes realizados por administradores
            </CardDescription>
          </CardHeader>
          <CardContent>
            {transactions.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                Nenhuma transação encontrada
              </p>
            ) : (
              <div className="space-y-3">
                {transactions.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div>
                      <p className="font-medium">
                        {(transaction.profiles as any)?.display_name || 'Usuário'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {transaction.description}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(transaction.created_at).toLocaleString('pt-BR')}
                      </p>
                    </div>
                    <Badge
                      variant={transaction.amount > 0 ? "default" : "destructive"}
                    >
                      {transaction.amount > 0 ? '+' : ''}{transaction.amount.toFixed(2)} BRL
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminWallet;