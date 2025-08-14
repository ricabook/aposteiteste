import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X } from 'lucide-react';
import { CircularProgress } from './CircularProgress';
import { useAuth } from '@/hooks/useAuth';
import { useWalletQueries } from '@/hooks/useWalletQueries';
import { calculatePotentialReturn } from '@/lib/potentialReturnCalculator';
import { toast } from '@/hooks/use-toast';

interface PolymarketCardProps {
  poll: {
    id: string;
    title: string;
    question: string;
    option_a: string;
    option_b: string;
    end_date: string;
    is_active: boolean;
    category?: string;
    image_url?: string;
  };
}

type CardState = 'initial' | 'betting';

const PolymarketCard = ({ poll }: PolymarketCardProps) => {
  const [cardState, setCardState] = useState<CardState>('initial');
  const [selectedOption, setSelectedOption] = useState<any>(null);
  const [betAmount, setBetAmount] = useState('');
  const isExpired = new Date(poll.end_date) < new Date();
  
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { invalidateWalletQueries, updateProfileBalance } = useWalletQueries();

  // Fetch poll data
  const { data: pollData } = useQuery({
    queryKey: ['polymarketPollData', poll.id],
    queryFn: async () => {
      try {
        // Get poll details with options
        const { data: pollDetails } = await supabase
          .from('polls')
          .select('options, option_images')
          .eq('id', poll.id)
          .single();

        // Get betting data
        const { data: betsData } = await supabase
          .from('bets')
          .select('option_chosen, amount')
          .eq('poll_id', poll.id)
          .eq('is_closed', false);

        const totalVolume = (betsData || []).reduce((sum, bet) => sum + Number(bet.amount), 0);
        
        // Calculate volume by option
        const volumeByOption = (betsData || []).reduce((acc, bet) => {
          acc[bet.option_chosen] = (acc[bet.option_chosen] || 0) + Number(bet.amount);
          return acc;
        }, {} as Record<string, number>);

        // Determine if it's a multi-option poll
        const isMultiOption = Array.isArray(pollDetails?.options) && pollDetails.options.length > 2;
        
        let options: Array<{id: string, label: string, volume: number, percentage: number, image_url?: string}> = [];
        
        if (isMultiOption && pollDetails?.options && Array.isArray(pollDetails.options)) {
          // Multi-option poll: get all options with their data
          options = (pollDetails.options as any[]).map((opt: any) => {
            const volume = volumeByOption[opt.id] || 0;
            const percentage = totalVolume > 0 ? (volume / totalVolume) * 100 : 0;
            
            // Find image for this option
            const imageData = Array.isArray(pollDetails.option_images) 
              ? (pollDetails.option_images as any[]).find((img: any) => img.id === opt.id)
              : undefined;
            
            return {
              id: opt.id,
              label: opt.label,
              volume,
              percentage,
              image_url: imageData?.image_url
            };
          }).sort((a, b) => b.volume - a.volume); // Sort by volume descending
        } else {
          // Two-option poll: use option_a and option_b
          const volumeA = volumeByOption['A'] || 0;
          const volumeB = volumeByOption['B'] || 0;
          const percentageA = totalVolume > 0 ? (volumeA / totalVolume) * 100 : 50;
          
          options = [
            { id: 'A', label: poll.option_a, volume: volumeA, percentage: percentageA },
            { id: 'B', label: poll.option_b, volume: volumeB, percentage: 100 - percentageA }
          ];
        }
        
        // Get creator information - simplified query to avoid complex joins
        const { data: creatorInfo } = await supabase
          .from('polls')
          .select(`
            created_by,
            profiles!polls_created_by_fkey(display_name)
          `)
          .eq('id', poll.id)
          .single();

        // Check if creator is admin or if it's a legacy poll without created_by
        let isAdminCreated = false;
        
        if (creatorInfo?.created_by) {
          // For polls with created_by, check if user has admin role
          const { data: adminCheck } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', creatorInfo.created_by)
            .eq('role', 'admin')
            .single();
          
          isAdminCreated = !!adminCheck;
        } else {
          // For legacy polls without created_by, treat as admin-created
          isAdminCreated = true;
        }
        
        return { 
          totalVolume, 
          options,
          isMultiOption,
          isAdminCreated,
          creatorDisplayName: (creatorInfo?.profiles as any)?.display_name || 'Usuário'
        };
      } catch (error) {
        console.error('Error fetching poll data:', error);
        return { 
          totalVolume: 0, 
          options: [
            { id: 'A', label: poll.option_a, volume: 0, percentage: 50 },
            { id: 'B', label: poll.option_b, volume: 0, percentage: 50 }
          ],
          isMultiOption: false,
          isAdminCreated: false,
          creatorDisplayName: 'Usuário'
        };
      }
    },
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
    retryDelay: 1000,
  });

  // Bet mutation
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
      
      // Reset form and go back to initial state
      setBetAmount('');
      setSelectedOption(null);
      setCardState('initial');
      
      // Invalidate all wallet-related queries
      invalidateWalletQueries();
      
      // Refetch poll data
      queryClient.invalidateQueries({ queryKey: ['polymarketPollData', poll.id] });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const calculatePotentialReturnForOption = (amount: number, option: any) => {
    if (!pollData || amount <= 0) return 0;
    
    // Convert pollData to BetData format
    const allBets = pollData.options.flatMap(opt => 
      opt.volume > 0 ? [{ option_chosen: opt.id, amount: opt.volume }] : []
    );
    
    return calculatePotentialReturn({
      userBetAmount: amount,
      userSelectedOption: option.id,
      allBets
    });
  };

  const handleOptionSelect = (option: any) => {
    setSelectedOption(option);
    setCardState('betting');
    setBetAmount('');
  };

  const handleCancel = () => {
    setCardState('initial');
    setSelectedOption(null);
    setBetAmount('');
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
      optionId: selectedOption.id,
      amount: Number(betAmount)
    });
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      politics: 'Política',
      sports: 'Esportes', 
      economics: 'Economia',
      entertainment: 'Entretenimento',
      technology: 'Tecnologia',
      science: 'Ciência',
      crypto: 'Criptomoedas',
      other: 'Outros'
    };
    return labels[category] || category;
  };

  if (cardState === 'betting' && selectedOption) {
    // Betting state
    const potentialReturn = calculatePotentialReturnForOption(Number(betAmount) || 0, selectedOption);
    const isYesOption = selectedOption.id === 'A' || selectedOption.label.toLowerCase().includes('sim');
    const isNoOption = selectedOption.id === 'B' || selectedOption.label.toLowerCase().includes('não');
    
    let buttonColor = "bg-blue-600 hover:bg-blue-700";
    if (!pollData?.isMultiOption) {
      if (isYesOption) {
        buttonColor = "bg-green-600 hover:bg-green-700";
      } else if (isNoOption) {
        buttonColor = "bg-red-600 hover:bg-red-700";
      }
    }

    return (
      <Card className="h-[224px] transition-all duration-300 flex flex-col">
        <CardContent className="p-3 flex flex-col h-full">
          <div className="relative flex flex-col h-full">
            {/* Close button */}
            <button
              onClick={handleCancel}
              className="absolute top-0 right-0 p-1 hover:bg-muted rounded-full transition-colors z-10"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Header with reduced image and title */}
            <div className="flex items-start gap-2 mb-3 pr-8">
              {poll.image_url && (
                <img
                  src={poll.image_url}
                  alt={poll.title}
                  className="w-10 h-10 object-cover rounded-lg flex-shrink-0"
                />
              )}
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-medium line-clamp-2 leading-tight">
                  {poll.title}
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  {selectedOption.label}
                </p>
              </div>
            </div>

            {/* Content area with flex-grow */}
            <div className="flex-grow flex flex-col justify-center space-y-3">
              {/* Bet amount input */}
              <div>
                <Input
                  type="number"
                  placeholder="Digite o valor da aposta"
                  value={betAmount}
                  onChange={(e) => setBetAmount(e.target.value)}
                  className="w-full"
                  disabled={isExpired}
                />
              </div>

              {/* Action button */}
              <Button 
                onClick={handlePlaceBet}
                className={`w-full ${buttonColor} text-white`}
                disabled={isExpired || !betAmount || Number(betAmount) <= 0 || betMutation.isPending}
              >
                {betMutation.isPending ? 'Processando...' : (pollData?.isMultiOption ? 'Apostar' : selectedOption.label)}
              </Button>

              {/* Potential return */}
              {betAmount && Number(betAmount) > 0 && (
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">
                    Retorno potencial: <span className="font-semibold">R$ {potentialReturn.toFixed(2)}</span>
                  </p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Initial state
  return (
    <Card className="h-[224px] hover:shadow-lg transition-all duration-300 cursor-pointer group flex flex-col">
      <CardContent className="p-3 flex flex-col h-full">

        {/* Header with image and title */}
        <div className="flex items-start gap-2 mb-2">
          {poll.image_url && (
            <img
              src={poll.image_url}
              alt={poll.title}
              className="w-12 h-12 object-cover rounded-lg flex-shrink-0"
            />
          )}
          <div className="flex-1 min-w-0">
            <Link to={`/poll/${poll.slug}`}>
              <h3 className="text-base font-medium line-clamp-2 leading-tight group-hover:text-primary transition-colors">
                {poll.title}
              </h3>
            </Link>
          </div>
          
          {/* Percentage circle for 2-option polls - increased by 50% */}
          {pollData && !pollData.isMultiOption && (
            <div className="flex-shrink-0">
              <CircularProgress 
                percentage={pollData.options[0]?.percentage || 50}
                size={57}
                strokeWidth={4}
              />
              <div className="text-center mt-1">
                <span className="text-sm font-semibold">
                  {(pollData.options[0]?.percentage || 50).toFixed(0)}%
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Options/Actions - flex-grow to push to bottom */}
        <div className="space-y-2 flex-grow flex flex-col justify-end">
          {pollData?.isMultiOption ? (
            // Multi-option: show top 2 with smaller select buttons
            <div className="space-y-1.5">
              {pollData.options.slice(0, 2).map((option) => (
                <div key={option.id} className="flex items-center justify-between p-1.5 border rounded-lg">
                  <div className="flex items-center gap-1.5 flex-1 min-w-0">
                    {option.image_url && (
                      <img 
                        src={option.image_url} 
                        alt={option.label}
                        className="w-5 h-5 rounded object-cover flex-shrink-0"
                      />
                    )}
                    <span className="text-xs font-medium truncate">{option.label}</span>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleOptionSelect(option)}
                    disabled={isExpired}
                    className="bg-blue-600 hover:bg-blue-700 text-white ml-2 h-6 text-xs px-2 min-w-12"
                  >
                    {isExpired ? 'Encerrada' : `${option.percentage.toFixed(0)}%`}
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            // Two-option: Yes/No buttons with Polymarket style - increased height by 30%
            <div className="grid grid-cols-2 gap-1.5">
              <Button
                onClick={() => handleOptionSelect(pollData?.options[0])}
                disabled={isExpired}
                className="bg-yes-muted hover:bg-yes-vibrant text-success border border-success/20 hover:border-success/60 transition-all duration-200 h-10 text-xs font-medium"
                variant="outline"
                size="sm"
              >
                Sim
              </Button>
              <Button
                onClick={() => handleOptionSelect(pollData?.options[1])}
                disabled={isExpired}
                className="bg-no-muted hover:bg-no-vibrant text-destructive border border-destructive/20 hover:border-destructive/60 transition-all duration-200 h-10 text-xs font-medium"
                variant="outline"
                size="sm"
              >
                Não
              </Button>
            </div>
          )}

          {/* Stats footer */}
          <div className="pt-2 border-t text-xs text-muted-foreground">
            <div className="flex items-center justify-between">
              <span>Volume: R$ {(pollData?.totalVolume || 0).toFixed(0)}</span>
              <span className={isExpired ? "text-destructive" : ""}>
                {isExpired ? "Encerrada" : "Ativa"}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PolymarketCard;