import { useState } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useWalletQueries } from '@/hooks/useWalletQueries';
import { calculatePotentialReturn, calculateExistingPositionReturn } from '@/lib/potentialReturnCalculator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';

interface BettingCardProps {
  poll: any;
  options: Array<{
    id: string;
    label: string;
    percentage: number;
    image_url?: string;
  }>;
  isExpired: boolean;
  selectedOption: string;
  setSelectedOption: (option: string) => void;
}

export const BettingCard = ({ 
  poll,
  options, 
  isExpired, 
  selectedOption, 
  setSelectedOption 
}: BettingCardProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { invalidateWalletQueries, updateProfileBalance } = useWalletQueries();
  const [betAmount, setBetAmount] = useState('');

  // Fetch user balance
  const { data: userProfile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('wallet_balance')
        .eq('user_id', user.id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch all bets for potential returns calculation (same as Portfolio page)
  const { data: allBets } = useQuery({
    queryKey: ['allBets', poll?.id],
    queryFn: async () => {
      if (!poll?.id) return [];
      
      const { data, error } = await supabase
        .from('bets')
        .select('option_chosen, amount, user_id')
        .eq('poll_id', poll.id)
        .eq('is_closed', false);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!poll?.id,
  });

  // Legacy optionInvestments for backward compatibility
  const { data: optionInvestments } = useQuery({
    queryKey: ['optionBets', poll?.id],
    queryFn: async () => {
      if (!allBets) return {};
      
      // Calculate total bets per option
      const investments: Record<string, number> = {};
      allBets.forEach(bet => {
        investments[bet.option_chosen] = (investments[bet.option_chosen] || 0) + Number(bet.amount);
      });
      
      return investments;
    },
    enabled: !!allBets,
  });

  // Simple bet mutation
  const betMutation = useMutation({
    mutationFn: async ({ optionId, amount }: { optionId: string; amount: number }) => {
      if (!user?.id) throw new Error('Usuário não autenticado');
      if (!poll?.id) throw new Error('Enquete não encontrada');

      const { data: result, error } = await supabase
        .rpc('place_simple_bet', {
          _poll_id: poll.id,
          _user_id: user.id,
          _option: optionId,
          _amount: amount
        });

      if (error) {
        console.error('Error placing bet:', error);
        throw new Error(error.message || 'Erro ao processar aposta');
      }

      const resultData = result as any;
      if (!resultData.success) {
        throw new Error(resultData.error || 'Erro ao processar aposta');
      }

      return result;
    },
    onSuccess: (result) => {
      toast({
        title: "Sucesso",
        description: "Aposta realizada com sucesso!",
      });
      
      // Update profile balance immediately in cache
      const resultData = result as any;
      if (resultData?.new_balance && user?.id) {
        updateProfileBalance(user.id, resultData.new_balance);
      }
      
      // Reset form
      setBetAmount('');
      setSelectedOption('');
      
      // Invalidate all wallet-related queries
      invalidateWalletQueries();
      
      // Refetch market data and option bets
      queryClient.invalidateQueries({ queryKey: ['marketData', poll.id] });
      queryClient.invalidateQueries({ queryKey: ['optionBets', poll.id] });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleOptionSelect = (optionId: string) => {
    setSelectedOption(optionId);
  };

  const handlePlaceBet = () => {
    if (!user) {
      toast({
        title: "Login necessário",
        description: "Você precisa estar logado para apostar",
        variant: "destructive",
      });
      return;
    }

    if (!selectedOption || !betAmount || Number(betAmount) <= 0) {
      toast({
        title: "Erro",
        description: "Selecione uma opção e insira um valor válido",
        variant: "destructive",
      });
      return;
    }

    betMutation.mutate({
      optionId: selectedOption,
      amount: Number(betAmount)
    });
  };

  return (
    <Card className="w-full max-w-md mx-auto lg:sticky lg:top-6">
      <CardHeader className="pb-3 sm:pb-6">
        <CardTitle className="text-center text-lg sm:text-xl">Apostar</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 sm:space-y-4 p-3 sm:p-6">
        {/* Selected Option Display for Multi-option polls */}
        {selectedOption && options.length > 2 ? (
          <div className="space-y-2">
            {(() => {
              const option = options.find(opt => opt.id === selectedOption);
              if (!option) return null;
              
              return (
                <div className="w-full p-4 border-2 border-primary rounded-lg bg-primary/5">
                  <div className="flex items-center space-x-3">
                    {option.image_url && (
                      <img
                        src={option.image_url}
                        alt={option.label}
                        className="w-12 h-12 object-cover rounded-lg"
                      />
                    )}
                    <div className="flex-1">
                      <span className="font-semibold text-lg">{option.label}</span>
                      <div className="text-sm text-muted-foreground">
                        {option.percentage.toFixed(0)}% chance
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        ) : options.length === 2 ? (
          // Original option buttons for 2-option polls only
          <div className="space-y-2">
            {options.map((option, index) => (
              <Button
                key={option.id}
                variant="outline"
                className={`w-full h-12 sm:h-16 flex items-center justify-between p-2 sm:p-4 ${
                  selectedOption === option.id
                    ? index === 0
                      ? 'bg-green-500 text-white border-green-500 hover:bg-green-600'
                      : 'bg-red-500 text-white border-red-500 hover:bg-red-600'
                    : 'bg-background hover:bg-muted'
                }`}
                onClick={() => handleOptionSelect(option.id)}
                disabled={isExpired}
              >
                <div className="flex items-center space-x-2 sm:space-x-3">
                  {option.image_url && (
                    <img
                      src={option.image_url}
                      alt={option.label}
                      className="w-6 h-6 sm:w-8 sm:h-8 object-cover rounded"
                    />
                  )}
                  <span className="text-sm sm:text-base font-medium">{option.label}</span>
                </div>
                <span className="text-lg sm:text-xl font-bold text-primary">{option.percentage.toFixed(0)}%</span>
              </Button>
            ))}
          </div>
        ) : null}

        {/* Bet Amount Input */}
        <div className="space-y-2 sm:space-y-3">
          <div className="bg-card border rounded-lg p-3 sm:p-4">
            <div className="flex items-center justify-between mb-2">
              <Label htmlFor="bet-amount" className="text-xs sm:text-sm text-muted-foreground">Valor da Aposta</Label>
              <span className="text-xs sm:text-sm text-muted-foreground">Saldo R$ {userProfile?.wallet_balance?.toFixed(2) || '0,00'}</span>
            </div>
            <div className="text-right">
              <span className="text-xl sm:text-2xl lg:text-3xl font-bold">R$ {betAmount || '0'}</span>
            </div>
          </div>
          
          <Input
            id="bet-amount"
            type="number"
            placeholder="Digite o valor"
            value={betAmount}
            onChange={(e) => setBetAmount(e.target.value)}
            disabled={isExpired}
            min="0"
            step="0.01"
            className="text-center text-base sm:text-lg font-semibold h-10 sm:h-12"
          />
          
          {/* Suggested Values */}
          <div className="grid grid-cols-4 gap-1 sm:gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setBetAmount((prev) => (Number(prev || 0) + 1).toString())}
              disabled={isExpired}
              className="text-xs px-1 py-1 sm:px-3 sm:py-2 h-8 bg-muted hover:bg-muted/80"
            >
              +R$1
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setBetAmount((prev) => (Number(prev || 0) + 20).toString())}
              disabled={isExpired}
              className="text-xs px-1 py-1 sm:px-3 sm:py-2 h-8 bg-muted hover:bg-muted/80"
            >
              +R$20
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setBetAmount((prev) => (Number(prev || 0) + 100).toString())}
              disabled={isExpired}
              className="text-xs px-1 py-1 sm:px-3 sm:py-2 h-8 bg-muted hover:bg-muted/80"
            >
              +R$100
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setBetAmount(userProfile?.wallet_balance?.toString() || "0")}
              disabled={isExpired}
              className="text-xs px-1 py-1 sm:px-3 sm:py-2 h-8 bg-muted hover:bg-muted/80"
            >
              Max
            </Button>
          </div>
        </div>

        {/* Place Bet Button */}
        <Button
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground h-10 sm:h-12 text-sm sm:text-base font-semibold"
          onClick={handlePlaceBet}
          disabled={isExpired || !selectedOption || !betAmount || Number(betAmount) <= 0 || betMutation.isPending}
        >
          {isExpired ? 'Encerrada' : betMutation.isPending ? 'Apostando...' : 'Apostar'}
        </Button>

        {/* Potential Returns - Using same calculation as Portfolio page */}
        {selectedOption && betAmount && Number(betAmount) > 0 && allBets && (
          <div className="bg-card border rounded-lg p-3 sm:p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-1 sm:space-x-2">
                <span className="text-xs sm:text-sm text-muted-foreground">Retorno Potencial</span>
                <span className="text-green-500">📈</span>
              </div>
              <span className="text-xs sm:text-sm text-muted-foreground">
                Se esta opção vencer
              </span>
            </div>
            <div className="text-right">
              <span className="text-xl sm:text-2xl lg:text-3xl font-bold text-green-500">
                R$ {(() => {
                  // Filter out current user's existing bets from the same option to avoid double counting
                  const otherBets = allBets.filter(bet => 
                    bet.user_id !== user?.id || bet.option_chosen !== selectedOption
                  );
                  
                  const simulatedBets = [
                    ...otherBets.map(bet => ({
                      option_chosen: bet.option_chosen,
                      amount: Number(bet.amount)
                    })),
                    {
                      option_chosen: selectedOption,
                      amount: Number(betAmount)
                    }
                  ];
                  
                  const potentialReturn = calculateExistingPositionReturn(
                    Number(betAmount),
                    selectedOption,
                    simulatedBets
                  );
                  
                  return potentialReturn.toFixed(2);
                })()}
              </span>
            </div>
            <div className="text-xs text-muted-foreground mt-1 text-right">
              {(() => {
                // Filter out current user's existing bets from the same option to avoid double counting
                const otherBets = allBets.filter(bet => 
                  bet.user_id !== user?.id || bet.option_chosen !== selectedOption
                );
                
                const simulatedBets = [
                  ...otherBets.map(bet => ({
                    option_chosen: bet.option_chosen,
                    amount: Number(bet.amount)
                  })),
                  {
                    option_chosen: selectedOption,
                    amount: Number(betAmount)
                  }
                ];
                
                const potentialReturn = calculateExistingPositionReturn(
                  Number(betAmount),
                  selectedOption,
                  simulatedBets
                );
                
                const profit = potentialReturn - Number(betAmount);
                return profit > 0 ? `Lucro: R$ ${profit.toFixed(2)}` : 'Primeiro a apostar!';
              })()}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};