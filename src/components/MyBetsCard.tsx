import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { useWalletQueries } from '@/hooks/useWalletQueries';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Activity } from 'lucide-react';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { calculateExistingPositionReturn } from '@/lib/potentialReturnCalculator';

interface Position {
  poll_id: string;
  option_chosen: string;
  total_amount: number;
  poll: {
    title: string;
    option_a: string;
    option_b: string;
    end_date: string;
    is_resolved: boolean;
    winning_option?: string;
    image_url?: string;
    options?: Array<{ id: string; label: string }>;
  };
  current_odds: number;
  original_odds: number;
  odds_variation: number;
  potential_return: number;
  pnl: number;
  pnl_percentage: number;
}

interface MyBetsCardProps {
  pollId: string;
  poll: any;
}

export default function MyBetsCard({ pollId, poll }: MyBetsCardProps) {
  const { user } = useAuth();
  const [positionToClose, setPositionToClose] = useState<Position | null>(null);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { invalidateWalletQueries, updateProfileBalance } = useWalletQueries();

  // Buscar posições do usuário para esta enquete específica
  const { data: positions, isLoading } = useQuery({
    queryKey: ['userPositions', user?.id, pollId],
    queryFn: async () => {
      if (!user || !pollId) return [];

      // Buscar bets agrupadas por poll e opção (apenas apostas ativas) com odds originais
      const { data: bets, error } = await supabase
        .from('bets')
        .select(`
          poll_id,
          option_chosen,
          amount,
          odds,
          polls(title, option_a, option_b, end_date, is_resolved, winning_option, image_url, options)
        `)
        .eq('user_id', user.id)
        .eq('poll_id', pollId)
        .eq('is_closed', false); // Apenas apostas não encerradas

      if (error) throw error;

      // Agrupar por poll e opção, incluindo odds médias
      const grouped = bets?.reduce((acc: any, bet) => {
        const key = `${bet.poll_id}_${bet.option_chosen}`;
        if (!acc[key]) {
          acc[key] = {
            poll_id: bet.poll_id,
            option_chosen: bet.option_chosen,
            total_amount: 0,
            total_weighted_odds: 0,
            poll: bet.polls,
          };
        }
        acc[key].total_amount += Number(bet.amount);
        acc[key].total_weighted_odds += Number(bet.amount) * Number(bet.odds);
        return acc;
      }, {});

      // Converter para array e calcular odds/retornos
      const positions: Position[] = await Promise.all(
        Object.values(grouped || {}).map(async (position: any) => {
          // Calcular odd média original ponderada pelo valor apostado
          const originalOdds = position.total_weighted_odds / position.total_amount;
          
          // Se a enquete foi resolvida, calcular P&L final
          if (position.poll.is_resolved) {
            const won = position.poll.winning_option === position.option_chosen;
            
            if (won) {
              // Buscar todas as apostas para calcular o prêmio
              const { data: allBets } = await supabase
                .from('bets')
                .select('option_chosen, amount')
                .eq('poll_id', position.poll_id);
              
              if (!allBets || allBets.length === 0) {
                return {
                  ...position,
                  current_odds: 1,
                  original_odds: originalOdds,
                  odds_variation: (1 - originalOdds) * 100,
                  potential_return: position.total_amount,
                  pnl: 0,
                  pnl_percentage: 0,
                };
              }
              
              const totalWinningBets = allBets
                .filter(b => b.option_chosen === position.option_chosen)
                .reduce((sum, b) => sum + Number(b.amount), 0);
                
              const totalLosingBets = allBets
                .filter(b => b.option_chosen !== position.option_chosen)
                .reduce((sum, b) => sum + Number(b.amount), 0);
              
              // Usuário ganha proporcionalmente da pool perdedora + sua aposta de volta
              const userProportion = position.total_amount / totalWinningBets;
              const winnings = totalLosingBets * userProportion;
              const totalReturn = position.total_amount + winnings;
              const pnl = winnings; // Lucro = apenas os ganhos da pool perdedora
              const currentOdds = totalWinningBets > 0 ? (totalWinningBets + totalLosingBets) / totalWinningBets : 1;
              
              return {
                ...position,
                current_odds: currentOdds,
                original_odds: originalOdds,
                odds_variation: (currentOdds - originalOdds) * 100,
                potential_return: totalReturn,
                pnl,
                pnl_percentage: position.total_amount > 0 ? (pnl / position.total_amount) * 100 : 0,
              };
            } else {
              // Perdeu - P&L é negativo do valor apostado
              return {
                ...position,
                current_odds: 0,
                original_odds: originalOdds,
                odds_variation: (0 - originalOdds) * 100,
                potential_return: 0,
                pnl: -position.total_amount,
                pnl_percentage: -100,
              };
            }
          }
          
          // Para enquetes ativas, usar odds simples
          const { data: currentOdds } = await supabase.rpc('get_simple_odds', {
            _poll_id: position.poll_id,
            _option: position.option_chosen
          });
          
          const odds = currentOdds || 2.0;
          
          // Verificar se o usuário é o único apostador
          const { data: allActiveBets } = await supabase
            .from('bets')
            .select('user_id, option_chosen, amount')
            .eq('poll_id', position.poll_id)
            .eq('is_closed', false)
            .gt('amount', 0);
          
          const hasOtherBettors = allActiveBets?.some(bet => bet.user_id !== user.id) || false;
          
          // Se o usuário é o único apostador, P&L deve ser 0
          if (!hasOtherBettors) {
            return {
              ...position,
              current_odds: 1.0, // Odds neutras
              original_odds: originalOdds,
              odds_variation: 0, // Sem variação
              potential_return: position.total_amount, // Só recupera o que apostou
              pnl: 0, // P&L é 0 quando não há competição
              pnl_percentage: 0,
            };
          }
          
          // Calcular retorno potencial usando a função correta
          const allBets = allActiveBets?.map(bet => ({
            option_chosen: bet.option_chosen,
            amount: Number(bet.amount)
          })) || [];
          
          const potentialReturn = calculateExistingPositionReturn(
            position.total_amount,
            position.option_chosen,
            allBets
          );
          
          // Calcular variação baseada na probabilidade (positivo se probabilidade aumentou)
          const originalProbability = 1 / originalOdds; // Probabilidade implícita original
          const currentProbability = 1 / odds; // Probabilidade implícita atual
          const oddsVariation = (currentProbability - originalProbability) * 100;
          
          // Novo cálculo do P&L: Variação da Odd × aposta inicial
          const pnl = (oddsVariation / 100) * position.total_amount;

          return {
            ...position,
            current_odds: odds,
            original_odds: originalOdds,
            odds_variation: oddsVariation,
            potential_return: potentialReturn,
            pnl,
            pnl_percentage: position.total_amount > 0 ? (pnl / position.total_amount) * 100 : 0,
          };
        })
      );

      return positions.filter(p => p.total_amount > 0); // Only show positions with positive amounts
    },
    enabled: !!user && !!pollId,
    refetchInterval: 10000,
  });

  // Mutation para encerrar aposta antecipadamente
  const closePositionMutation = useMutation({
    mutationFn: async ({ pollId, optionChosen, amount }: { pollId: string; optionChosen: string; amount: number }) => {
      const { data, error } = await supabase.rpc('close_simple_bet', {
        _poll_id: pollId,
        _user_id: user!.id,
        _option: optionChosen,
        _amount: amount
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (result) => {
      toast({
        title: "Aposta encerrada",
        description: "Sua posição foi encerrada com sucesso!"
      });
      
      // Update profile balance immediately in cache
      const resultData = result as any;
      if (resultData?.new_balance && user?.id) {
        updateProfileBalance(user.id, resultData.new_balance);
      }
      
      // Invalidate all wallet-related queries
      invalidateWalletQueries();
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao encerrar aposta",
        description: error.message || "Tente novamente mais tarde",
        variant: "destructive"
      });
    }
  });

  const handleClosePosition = (position: Position) => {
    setPositionToClose(position);
    setIsConfirmDialogOpen(true);
  };

  const handleConfirmClosePosition = () => {
    if (positionToClose) {
      closePositionMutation.mutate({
        pollId: positionToClose.poll_id,
        optionChosen: positionToClose.option_chosen,
        amount: positionToClose.total_amount
      });
      setIsConfirmDialogOpen(false);
      setPositionToClose(null);
    }
  };

  if (!user) {
    return null;
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Minhas Apostas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!positions || positions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Minhas Apostas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-4">
            Você ainda não fez apostas nesta enquete.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Minhas Apostas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {positions.map((position) => (
            <div key={`${position.poll_id}_${position.option_chosen}`} className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <Badge 
                  variant={position.option_chosen === 'A' ? 'default' : 'secondary'}
                  className={`text-xs ${(() => {
                    // Apply colors for binary YES/NO polls
                    const optionText = position.poll.options 
                      ? position.poll.options.find(opt => opt.id === position.option_chosen)?.label || position.option_chosen
                      : (position.option_chosen === 'A' ? position.poll.option_a : position.poll.option_b);
                    
                    if (optionText?.toLowerCase().includes('sim') || optionText?.toLowerCase().includes('yes')) {
                      return 'bg-green-100 text-green-800 hover:bg-green-200';
                    } else if (optionText?.toLowerCase().includes('não') || optionText?.toLowerCase().includes('no')) {
                      return 'bg-red-100 text-red-800 hover:bg-red-200';
                    }
                    return '';
                  })()}`}
                >
                  {position.poll.options 
                    ? position.poll.options.find(opt => opt.id === position.option_chosen)?.label || position.option_chosen
                    : (position.option_chosen === 'A' ? position.poll.option_a : position.poll.option_b)
                  }
                </Badge>
                
                <div className="flex items-center gap-2">
                  {position.pnl !== 0 && (
                    <div className={`flex items-center gap-1 ${position.pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {position.pnl >= 0 ? (
                        <TrendingUp className="h-3 w-3" />
                      ) : (
                        <TrendingDown className="h-3 w-3" />
                      )}
                      <span className="text-xs font-medium">
                        {position.pnl >= 0 ? '+' : ''}R$ {position.pnl.toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Valor Investido:</span>
                  <p className="font-medium">R$ {position.total_amount.toFixed(2)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Retorno Potencial:</span>
                  <p className="font-medium text-green-600">R$ {position.potential_return.toFixed(2)}</p>
                </div>
              </div>
              
              {!position.poll.is_resolved && !(new Date(position.poll.end_date) < new Date()) && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handleClosePosition(position)}
                  disabled={closePositionMutation.isPending}
                  className="w-full"
                >
                  {closePositionMutation.isPending ? 'Encerrando...' : 'Encerrar Aposta'}
                </Button>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      {isConfirmDialogOpen && positionToClose && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-card rounded-lg p-6 max-w-md w-full">
            <h2 className="text-lg font-semibold mb-4">Confirmar Encerramento</h2>
            
            {/* Nova mensagem única */}
            <div className="mb-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
              <p className="text-sm">
                Você tem certeza de que deseja encerrar sua aposta? Essa ação não pode ser desfeita. Ao encerrar uma aposta antes dela ser resolvida, cobramos uma taxa de 10% sobre o valor apostado. Esta taxa é utilizada para ajustar os percentuais da enquete que continua válida.
              </p>
            </div>
            
            <div className="space-y-2 mb-4">
               <p><strong>Enquete:</strong> {positionToClose.poll.title}</p>
               <p><strong>Opção:</strong> {(() => {
                 // Handle polls with multiple options using the options array
                 if (positionToClose.poll.options) {
                   const option = positionToClose.poll.options.find(opt => opt.id === positionToClose.option_chosen);
                   return option ? option.label : positionToClose.option_chosen;
                 }
                 // Fallback for legacy binary polls
                 return positionToClose.option_chosen === 'A' ? positionToClose.poll.option_a : positionToClose.poll.option_b;
               })()}</p>
               <p><strong>Valor apostado:</strong> R$ {positionToClose.total_amount.toFixed(2)}</p>
                <p><strong>Taxa de encerramento:</strong> R$ {(positionToClose.total_amount * 0.10).toFixed(2)}</p>
                <p><strong>Você receberá:</strong> R$ {
                  (positionToClose.total_amount - (positionToClose.total_amount * 0.10)).toFixed(2)
                }</p>
            </div>
            
            <div className="mb-4 text-center">
              <p className="text-sm text-muted-foreground">
                Para confirmar o encerramento da aposta, clique em confirmar. Caso queira manter a aposta aberta, clique em cancelar.
              </p>
            </div>
            
            <div className="flex space-x-2">
              <Button variant="outline" onClick={() => setIsConfirmDialogOpen(false)} className="flex-1">
                Cancelar
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleConfirmClosePosition} 
                disabled={closePositionMutation.isPending}
                className="flex-1"
              >
                {closePositionMutation.isPending ? 'Encerrando...' : 'Confirmar'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}