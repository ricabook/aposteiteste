import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useWalletQueries } from '@/hooks/useWalletQueries';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Wallet, TrendingUp, TrendingDown, DollarSign, Activity } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  is_closed?: boolean;
  is_settled?: boolean;
  total_payout?: number;
}

export default function Portfolio() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const [positionToClose, setPositionToClose] = useState<Position | null>(null);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'active' | 'inactive'>('all');
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { invalidateWalletQueries, updateProfileBalance } = useWalletQueries();

  // Buscar todas as posições do usuário (incluindo ativas e inativas)
  const { data: allPositions, isLoading } = useQuery({
    queryKey: ['userPositions', user?.id],
    queryFn: async () => {
      if (!user) return [];

      // Buscar todas as bets do usuário (ativas e encerradas)
      const { data: bets, error } = await supabase
        .from('bets')
        .select(`
          poll_id,
          option_chosen,
          amount,
          odds,
          is_closed,
          is_settled,
          payout_amount,
          polls(title, option_a, option_b, end_date, is_resolved, winning_option, image_url, options)
        `)
        .eq('user_id', user.id);

      if (error) throw error;

      // Agrupar por poll e opção, incluindo odds médias e status
      const grouped = bets?.reduce((acc: any, bet) => {
        const key = `${bet.poll_id}_${bet.option_chosen}`;
        if (!acc[key]) {
          acc[key] = {
            poll_id: bet.poll_id,
            option_chosen: bet.option_chosen,
            total_amount: 0,
            total_weighted_odds: 0,
            poll: bet.polls,
            is_closed: false,
            is_settled: false,
            total_payout: 0,
          };
        }
        acc[key].total_amount += Number(bet.amount);
        acc[key].total_weighted_odds += Number(bet.amount) * Number(bet.odds);
        
        // Mark as closed if any bet in this position is closed
        if (bet.is_closed) acc[key].is_closed = true;
        if (bet.is_settled) acc[key].is_settled = true;
        if (bet.payout_amount) acc[key].total_payout += Number(bet.payout_amount);
        
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
    enabled: !!user,
    refetchInterval: 10000,
  });

  // Filtrar posições baseado no tipo selecionado
  const positions = allPositions?.filter(position => {
    if (filterType === 'all') return true;
    
    if (filterType === 'active') {
      // Ativas: não encerradas pelo usuário E não resolvidas
      return !position.is_closed && !position.poll.is_resolved;
    }
    
    if (filterType === 'inactive') {
      // Inativas: encerradas pelo usuário OU resolvidas
      return position.is_closed || position.poll.is_resolved;
    }
    
    return true;
  }) || [];


  // Calcular estatísticas do portfólio
  const portfolioStats = positions?.reduce(
    (acc, position) => {
      acc.totalCost += position.total_amount;
      acc.totalPnL += position.pnl;
      return acc;
    },
    { totalCost: 0, totalPnL: 0 }
  ) || { totalCost: 0, totalPnL: 0 };

  // Calcular variação média das odds
  const averageOddsVariation = positions?.length > 0 
    ? positions.reduce((acc, position) => acc + position.odds_variation, 0) / positions.length 
    : 0;

  const totalPnLPercentage = portfolioStats.totalCost > 0 
    ? (portfolioStats.totalPnL / portfolioStats.totalCost) * 100 
    : 0;

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
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Portfólio</h1>
          <p className="text-muted-foreground mb-6">Você precisa estar logado para ver seu portfólio</p>
          <Link to="/auth">
            <Button>Fazer Login</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">Meu Portfólio</h1>
      </div>

      {/* Estatísticas do portfólio */}
      <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2 p-3 sm:p-6">
            <CardTitle className="text-xs sm:text-sm font-medium">Saldo</CardTitle>
            <Wallet className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0">
            <div className="text-base sm:text-xl md:text-2xl font-bold">R$ {(profile?.wallet_balance || 0).toFixed(2)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2 p-3 sm:p-6">
            <CardTitle className="text-xs sm:text-sm font-medium">Retorno Potencial</CardTitle>
            <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-green-600" />
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0">
            <div className="text-base sm:text-xl md:text-2xl font-bold text-green-600">
              R$ {positions?.reduce((sum, p) => sum + p.potential_return, 0).toFixed(2) || '0.00'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Total em retornos potenciais
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2 p-3 sm:p-6">
            <CardTitle className="text-xs sm:text-sm font-medium">Apostas Abertas</CardTitle>
            <DollarSign className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0">
            <div className="text-base sm:text-xl md:text-2xl font-bold">
              R$ {portfolioStats.totalCost.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Valor total em apostas ativas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2 p-3 sm:p-6">
            <CardTitle className="text-xs sm:text-sm font-medium">Posições Ativas</CardTitle>
            <Activity className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0">
            <div className="text-base sm:text-xl md:text-2xl font-bold">{positions?.length || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros de apostas */}
      <Tabs value={filterType} onValueChange={(value) => setFilterType(value as 'all' | 'active' | 'inactive')}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="all">Todas</TabsTrigger>
          <TabsTrigger value="active">Ativas</TabsTrigger>
          <TabsTrigger value="inactive">Inativas</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Posições */}
      {isLoading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        </div>
      ) : positions && positions.length > 0 ? (
        <div className="space-y-4">
          {positions.map((position) => (
            <Card key={`${position.poll_id}_${position.option_chosen}`}>
              <CardContent className="p-3 sm:p-4">
                {/* Mobile Layout - Stack vertically */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                  <div className="flex items-start sm:items-center gap-3 sm:gap-4 flex-1">
                    {/* Imagem da enquete */}
                    <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                      {position.poll.image_url ? (
                        <img 
                          src={position.poll.image_url} 
                          alt={position.poll.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                          <Activity className="w-4 h-4 sm:w-6 sm:h-6 text-primary/60" />
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <Link 
                        to={`/poll/${position.poll_slug ?? position.slug ?? position.poll_id}`}
                        className="text-sm sm:text-base font-medium hover:underline line-clamp-2"
                      >
                        {position.poll.title}
                      </Link>
                       <div className="flex flex-wrap items-center gap-2 mt-1">
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
                          {position.poll.is_resolved && (
                            <Badge variant={position.poll.winning_option === position.option_chosen ? 'default' : 'destructive'}>
                              {position.poll.winning_option === position.option_chosen ? 'Ganhou' : 'Perdeu'}
                            </Badge>
                          )}
                        </div>
                    </div>
                  </div>
                  
                  {/* Informações da posição - Stack on mobile */}
                  <div className="space-y-2 sm:space-y-1 sm:text-right">
                    <div className="flex justify-between sm:block">
                      <span className="text-xs text-muted-foreground sm:hidden">Investido:</span>
                      <p className="text-sm font-medium">R$ {position.total_amount.toFixed(2)}</p>
                    </div>
                    
                    <div className="flex justify-between sm:block">
                      <span className="text-xs text-muted-foreground sm:hidden">Retorno Potencial:</span>
                      <p className="text-sm text-green-600">Retorno Potencial: R$ {position.potential_return.toFixed(2)}</p>
                    </div>
                    
                    {/* Botão de encerrar aposta - apenas para enquetes ativas e não encerradas */}
                    {!position.poll.is_resolved && !position.is_closed && (
                      <div className="mt-2">
                        <Button 
                          variant="destructive" 
                          size="sm"
                          onClick={() => handleClosePosition(position)}
                          className="w-full sm:w-auto text-xs"
                        >
                          Encerrar Aposta
                        </Button>
                      </div>
                    )}

                    {/* Status para apostas inativas */}
                    {(position.is_closed || position.poll.is_resolved) && (
                      <div className="mt-2">
                        <Badge variant="outline" className="text-xs">
                          {position.is_closed ? 'Encerrada pelo usuário' : 
                           position.poll.is_resolved ? 
                             (position.poll.winning_option === position.option_chosen ? 'Finalizada - Ganhou' : 'Finalizada - Perdeu') :
                             'Inativa'
                          }
                        </Badge>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-muted-foreground mb-4">Você ainda não tem posições</p>
            <Link to="/">
              <Button>Explorar Mercados</Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Diálogo de confirmação para encerrar aposta */}
{positionToClose && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" 
             style={{ display: isConfirmDialogOpen ? 'flex' : 'none' }}>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-lg w-full mx-4">
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
    </div>
  );
}