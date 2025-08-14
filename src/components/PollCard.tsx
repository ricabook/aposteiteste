import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, DollarSign } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CircularProgress } from './CircularProgress';

interface PollCardProps {
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

const PollCard = ({ poll }: PollCardProps) => {
  const isExpired = new Date(poll.end_date) < new Date();

  // Fetch total volume and betting data
  const { data: pollData, isLoading, error } = useQuery({
    queryKey: ['pollData', poll.id],
    queryFn: async () => {
      try {
        // Get poll details with options
        const { data: pollDetails } = await supabase
          .from('polls')
          .select('options, option_images')
          .eq('id', poll.id)
          .single();

        // Use the secure function to get poll volume data
        const { data: volumeData, error: volumeError } = await supabase
          .rpc('get_poll_volume_data', { poll_id_param: poll.id });

        if (volumeError) {
          console.error('Error fetching volume data for poll', poll.id, ':', volumeError);
          // Continue with empty data if there's an error
        }

        const betsData = volumeData || [];
        console.log('PollCard volume data for poll', poll.id, ':', betsData);
        const totalVolume = betsData.reduce((sum, bet) => sum + Number(bet.total_volume || 0), 0);
        console.log('PollCard total volume for poll', poll.id, ':', totalVolume);
        
        // Calculate volume by option
        const volumeByOption = betsData.reduce((acc, bet) => {
          acc[bet.option_chosen] = Number(bet.total_volume || 0);
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
        
        console.log('PollCard final result for poll', poll.id, ':', { totalVolume, options, isMultiOption });
        return { 
          totalVolume, 
          options,
          isMultiOption
        };
      } catch (error) {
        console.error('Error fetching poll data:', error);
        return { 
          totalVolume: 0, 
          options: [
            { id: 'A', label: poll.option_a, volume: 0, percentage: 50 },
            { id: 'B', label: poll.option_b, volume: 0, percentage: 50 }
          ],
          isMultiOption: false
        };
      }
    },
    enabled: !!poll?.id, // Only run when poll ID exists
    staleTime: 0, // Always consider data stale
    gcTime: 0, // Don't cache at all
    refetchOnWindowFocus: true, // Refetch when window gains focus
    refetchInterval: 15000, // Refetch every 15 seconds
    retry: 1,
    retryDelay: 1000,
  });

  // Add debug logging
  console.log('PollCard render for poll', poll.id, '- Data:', pollData, 'Loading:', isLoading, 'Error:', error);

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

  return (
    <Card className="h-full hover:shadow-lg transition-all duration-300 cursor-pointer group flex flex-col min-h-[260px] md:min-h-[280px]">
      <CardHeader className="pb-2 md:pb-3 flex-1 p-3 md:p-4">
        <div className="space-y-1.5 md:space-y-2">
          {/* Badges */}
          <div className="flex items-center space-x-1 md:space-x-2">
            {poll.category && (
              <Badge variant="secondary" className="text-xs px-2 py-0.5">
                {getCategoryLabel(poll.category)}
              </Badge>
            )}
            <Badge variant={isExpired ? "destructive" : "default"} className="text-xs px-2 py-0.5">
              {isExpired ? "Encerrada" : "Ativa"}
            </Badge>
          </div>
          
          {/* Title and Image Row */}
          <div className="flex items-start justify-between gap-2 md:gap-3">
            <div className="flex-1 min-w-0">
              <Link to={`/enquete/${(poll as any).slug ?? poll.id}`} className="block">
                <CardTitle className="text-sm md:text-base leading-tight group-hover:text-primary transition-colors hover:underline line-clamp-2">
                  {poll.title}
                </CardTitle>
              </Link>
            </div>
            {poll.image_url && (
              <img
                src={poll.image_url}
                alt={poll.title}
                className="w-12 h-12 md:w-14 md:h-14 object-cover rounded-lg flex-shrink-0"
              />
            )}
          </div>
          
          {/* Chart Section */}
          <div className="flex justify-center py-2 pb-3">
            {pollData?.isMultiOption ? (
              // Multi-option: show top 2 options
              <div className="flex items-center justify-center space-x-4">
                {pollData.options.slice(0, 2).map((option, index) => (
                  <div key={option.id} className="flex items-center space-x-1">
                    {option.image_url && (
                      <img 
                        src={option.image_url} 
                        alt={option.label}
                        className="w-5 h-5 rounded object-cover"
                      />
                    )}
                    <span className="text-sm font-medium">
                      {option.percentage.toFixed(0)}%
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              // Two-option: show semicircle progress for option A (SIM) - increased by 50%
              <div className="flex flex-col items-center">
                <CircularProgress 
                  percentage={pollData?.options[0]?.percentage || 50}
                  size={90}
                  strokeWidth={8}
                >
                  <div className="text-center">
                    <div className="text-xl font-bold text-white">
                      {(pollData?.options[0]?.percentage || 50).toFixed(0)}%
                    </div>
                    <div className="text-sm text-white/80">
                      chance
                    </div>
                  </div>
                </CircularProgress>
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0 mt-auto p-3 md:p-4">
        <div className="space-y-2 md:space-y-3">
          {/* Stats */}
          <div className="flex items-center justify-between text-xs md:text-sm text-muted-foreground border-t pt-2 md:pt-3">
            <div className="flex items-center">
              <DollarSign className="h-3 w-3 md:h-4 md:w-4 mr-1" />
              <span className="truncate">R$ {(pollData?.totalVolume || 0).toFixed(0)}</span>
            </div>
            <div className="flex items-center">
              <Clock className="h-3 w-3 md:h-4 md:w-4 mr-1" />
              <span>
                {isExpired 
                  ? 'Encerrada' 
                  : format(new Date(poll.end_date), "dd/MM", { locale: ptBR })
                }
              </span>
            </div>
          </div>

          {/* Action Button */}
          <Link to={`/enquete/${(poll as any).slug ?? poll.id}`} className="block">
            <Button 
              className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs md:text-sm"
              size="sm"
            >
              Ver Apostas
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
};

export default PollCard;