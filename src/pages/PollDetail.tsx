import { useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useAdminCheck } from '@/hooks/useAdminCheck';
import { useIsMobile } from '@/hooks/use-mobile';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from '@/hooks/use-toast';
import { ArrowLeft, MessageSquare, Clock, TrendingUp, Share, TrendingUp as ArrowUp, TrendingDown as ArrowDown, Trash2, Check, X } from 'lucide-react';
import { AuthorCard } from '@/components/AuthorCard';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { PriceChart } from '@/components/PriceChart';
import { BettingCard } from '@/components/BettingCard';
import { MultiOptionChart } from '@/components/MultiOptionChart';
import { OptionSelector } from '@/components/OptionSelector';
import MyBetsCard from '@/components/MyBetsCard';

interface PollOption {
  id: string;
  label: string;
  image_url?: string;
}

const PollDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();
  const { isAdmin } = useAdminCheck();
  const isMobile = useIsMobile();
  const [comment, setComment] = useState('');
  const [selectedOption, setSelectedOption] = useState<string>('');
  const bettingCardRef = useRef<HTMLDivElement>(null);

  // Função para fazer scroll até o BettingCard
  const scrollToBettingCard = () => {
    bettingCardRef.current?.scrollIntoView({ 
      behavior: 'smooth', 
      block: 'start' 
    });
  };

  // Fetch poll details
  const { data: poll, isLoading: pollLoading, error: pollError } = useQuery({
    queryKey: ['poll', slug],
    queryFn: async () => {
      if (!slug) throw new Error('Poll slug is required');
      
      const { data, error } = await supabase
        .from('polls')
        .select('*')
        .eq('slug', slug)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!id,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: 1,
    retryDelay: 1000,
  });

  // Fetch market data
  const { data: marketData, isLoading: marketLoading } = useQuery({
    queryKey: ['marketData', id],
    queryFn: async () => {
      if (!id || !poll) throw new Error('Poll ID or poll data is required');
      
      try {
        // Use the new secure function to get poll volume data
        const { data: volumeData, error: volumeError } = await supabase
          .rpc('get_poll_volume_data', { poll_id_param: id });

        if (volumeError) {
          console.error('Error fetching volume data:', volumeError);
        }

        const activeBets = volumeData || [];
        const totalActiveVolume = activeBets.reduce((sum, bet) => sum + Number(bet.total_volume), 0);
        
        const volumeByOption = activeBets.reduce((acc, bet) => {
          acc[bet.option_chosen] = Number(bet.total_volume);
          return acc;
        }, {} as Record<string, number>);

        // Count unique bettors per option
        const bettorsByOption = activeBets.reduce((acc, bet) => {
          acc[bet.option_chosen] = Number(bet.unique_bettors);
          return acc;
        }, {} as Record<string, number>);

        // Get poll options with images
        let options: PollOption[] = [
          { id: 'A', label: poll.option_a },
          { id: 'B', label: poll.option_b }
        ];
        
        if (Array.isArray(poll.options)) {
          try {
            options = poll.options.map((opt: any) => ({
              id: opt?.id || 'A',
              label: opt?.label || 'Opção'
            }));
          } catch (e) {
            console.warn('Error parsing poll options:', e);
          }
        }

        // Add images to options
        if (poll.option_images && Array.isArray(poll.option_images)) {
          options = options.map(option => {
            const imageData = (poll.option_images as any[])?.find((img: any) => img.id === option.id);
            return {
              ...option,
              image_url: imageData?.image_url || undefined
            };
          });
        }

        const optionsData = options.map((option: PollOption, index: number) => {
          const volume = volumeByOption[option.id] || 0;
          const uniqueBettors = bettorsByOption[option.id] || 0;
          
          return {
            ...option,
            volume,
            rawPercentage: totalActiveVolume > 0 ? (volume / totalActiveVolume) * 100 : 100 / options.length,
            stats: {
              total_amount: volume,
              unique_bettors: uniqueBettors
            }
          };
        });

        // Normalize percentages to ensure they sum to exactly 100%
        const totalRawPercentage = optionsData.reduce((sum, opt) => sum + opt.rawPercentage, 0);
        
        const normalizedOptionsData = optionsData.map((option, index) => {
          let percentage;
          if (totalRawPercentage === 0) {
            percentage = 100 / options.length;
          } else if (index === optionsData.length - 1) {
            // Last option gets remaining percentage to ensure sum equals 100%
            const sumOfOthers = optionsData.slice(0, -1).reduce((sum, opt) => 
              sum + Math.round((opt.rawPercentage / totalRawPercentage) * 100 * 100) / 100, 0
            );
            percentage = Math.max(0, 100 - sumOfOthers);
          } else {
            percentage = Math.round((option.rawPercentage / totalRawPercentage) * 100 * 100) / 100;
          }
          
          return {
            ...option,
            percentage
          };
        });

        // Check if creator is admin using the new public RPC function
        let isAdminCreated = false;
        
        if (poll.created_by) {
          try {
            const { data: adminCheck, error: adminError } = await supabase
              .rpc('check_user_is_admin', { user_id_param: poll.created_by });
            
            if (adminError) {
              console.error('Error checking admin status:', adminError);
              isAdminCreated = false;
            } else {
              isAdminCreated = !!adminCheck;
            }
          } catch (error) {
            console.error('Error checking admin status:', error);
            isAdminCreated = false;
          }
        } else {
          // For legacy polls without created_by, treat as admin-created
          isAdminCreated = true;
        }

        return {
          totalVolume: totalActiveVolume,
          options: normalizedOptionsData,
          isAdminCreated
        };
      } catch (error) {
        console.error('Error fetching market data:', error);
        return {
          totalVolume: 0,
          options: [
            { id: 'A', label: poll.option_a, volume: 0, percentage: 50, stats: { total_amount: 0, unique_bettors: 0 } },
            { id: 'B', label: poll.option_b, volume: 0, percentage: 50, stats: { total_amount: 0, unique_bettors: 0 } }
          ],
          isAdminCreated: false
        };
      }
    },
    enabled: !!id && !!poll,
    staleTime: 10 * 1000, // Cache for 10 seconds
    gcTime: 30 * 1000, // Keep in cache for 30 seconds
    refetchInterval: 5000, // Refetch every 5 seconds for real-time updates
    refetchOnWindowFocus: false,
    retry: 1,
  });

  // Fetch comments
  const { data: comments = [], refetch: refetchComments, isLoading: commentsLoading } = useQuery({
    queryKey: ['pollComments', id],
    queryFn: async () => {
      if (!id) return [];

      const { data, error } = await supabase
        .from('poll_comments')
        .select(`
          id,
          content,
          created_at,
          profiles!inner(display_name, avatar_url)
        `)
        .eq('poll_id', id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error fetching comments:', error);
        return [];
      }
      return data || [];
    },
    enabled: !!id,
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: 1,
  });

  // Add comment mutation
  const addCommentMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!user?.id || !id) throw new Error('User not authenticated or poll not found');

      const { error } = await supabase
        .from('poll_comments')
        .insert({
          poll_id: id,
          user_id: user.id,
          content,
          status: isAdmin ? 'approved' : 'pending'
        });

      if (error) throw error;
    },
    onSuccess: () => {
      setComment('');
      refetchComments();
      if (isAdmin) {
        toast({
          title: "Comentário adicionado!",
          description: "Seu comentário foi adicionado com sucesso.",
        });
      } else {
        toast({
          title: "Comentário enviado para moderação!",
          description: "Seu comentário será analisado por um administrador antes de ser publicado.",
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete comment mutation (admin only)
  const deleteCommentMutation = useMutation({
    mutationFn: async (commentId: string) => {
      if (!isAdmin) throw new Error('Unauthorized');

      const { error } = await supabase
        .from('poll_comments')
        .delete()
        .eq('id', commentId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Sucesso",
        description: "Comentário excluído com sucesso!",
      });
      refetchComments();
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleDeleteComment = (commentId: string) => {
    if (window.confirm('Tem certeza que deseja excluir este comentário?')) {
      deleteCommentMutation.mutate(commentId);
    }
  };

  const handleAddComment = () => {
    if (!user) {
      toast({
        title: "Login necessário",
        description: "Você precisa estar logado para comentar",
        variant: "destructive",
      });
      return;
    }

    if (!comment.trim()) {
      toast({
        title: "Erro",
        description: "Digite um comentário",
        variant: "destructive",
      });
      return;
    }

    addCommentMutation.mutate(comment);
  };


  if (pollLoading) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="space-y-6">
          <div className="animate-pulse">
            <div className="h-10 bg-muted rounded-md w-32 mb-4"></div>
            <div className="h-64 bg-muted rounded-lg mb-6"></div>
            <div className="h-96 bg-muted rounded-lg"></div>
          </div>
        </div>
      </div>
    );
  }

  if (pollError || !poll) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold mb-4">
            {pollError ? 'Erro ao carregar enquete' : 'Enquete não encontrada'}
          </h1>
          <Link to="/">
            <Button>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar ao início
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const isExpired = new Date(poll.end_date) < new Date();
  const optionsCount = marketData?.options?.length || 2;
  const isTwoOption = optionsCount === 2;

  // Verifica se é uma enquete SIM/NÃO
  const isYesNoQuestion = isTwoOption && marketData?.options && 
    ((marketData.options[0]?.label?.toLowerCase() === 'sim' && marketData.options[1]?.label?.toLowerCase() === 'não') || 
     (marketData.options[0]?.label?.toLowerCase() === 'yes' && marketData.options[1]?.label?.toLowerCase() === 'no') ||
     (marketData.options[0]?.label?.toLowerCase() === 'não' && marketData.options[1]?.label?.toLowerCase() === 'sim') ||
     (marketData.options[0]?.label?.toLowerCase() === 'no' && marketData.options[1]?.label?.toLowerCase() === 'yes'));

  // Função para selecionar opção e fazer scroll
  const handleOptionSelect = (optionId: string) => {
    setSelectedOption(optionId);
    if (isMobile) {
      setTimeout(() => scrollToBettingCard(), 100);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
          <div className="flex items-center space-x-2 sm:space-x-4">
            <Link to="/">
              <Button variant="outline" size="sm" className="h-8 px-2 sm:h-9 sm:px-3">
                <ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Voltar</span>
              </Button>
            </Link>
            {poll.category && (
              <Badge variant="secondary" className="text-xs">
                {poll.category === 'politics' ? 'Política' :
                 poll.category === 'sports' ? 'Esportes' :
                 poll.category === 'economics' ? 'Economia' :
                 poll.category === 'entertainment' ? 'Entretenimento' :
                 poll.category === 'technology' ? 'Tecnologia' :
                 poll.category === 'science' ? 'Ciência' :
                 poll.category === 'crypto' ? 'Criptomoedas' : 'Outros'}
              </Badge>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" className="h-8 px-2 sm:h-9 sm:px-3">
              <Share className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Compartilhar</span>
            </Button>
          </div>
        </div>

        {isTwoOption ? (
          // Two-option layout - Mobile first, then desktop grid
          <div className="flex flex-col lg:grid lg:gap-6 lg:grid-cols-3 space-y-4 lg:space-y-0">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-4 sm:space-y-6">
              {/* Poll Header with Image */}
              <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-6">
                {poll.image_url && (
                  <img
                    src={poll.image_url}
                    alt={poll.title}
                    className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-lg flex-shrink-0 mx-auto sm:mx-0"
                  />
                )}
                <div className="flex-1 text-center sm:text-left">
                  <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-2">{poll.title}</h1>
                  {poll.question && (
                    <p className="text-sm sm:text-base lg:text-lg text-muted-foreground mb-3 sm:mb-4">{poll.question}</p>
                  )}
                   <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 sm:gap-4 text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4">
                     <span>R$ {(marketData?.totalVolume || 0).toFixed(0)} Vol.</span>
                     <span className="hidden sm:inline">•</span>
                     <span>Encerra {format(new Date(poll.end_date), "dd/MM", { locale: ptBR })}</span>
                   </div>
                  
                  {/* Market Probability Display - moved here */}
                  {!marketLoading && marketData?.options && (
                    <div className="mt-3 sm:mt-4">
                      <div className="flex items-center justify-center sm:justify-start gap-2">
                        <span className="text-lg sm:text-xl lg:text-2xl font-bold text-primary">
                          {marketData.options[0]?.percentage.toFixed(0)}% chance
                        </span>
                        {/* Mock price change - you'll need to implement actual price change logic */}
                        <div className="flex items-center gap-1">
                          <ArrowUp className="h-3 w-3 sm:h-4 sm:w-4 text-green-500" />
                          <span className="text-xs sm:text-sm text-green-500 font-medium">1%</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Price Chart */}
              {!marketLoading && marketData && (
                <div className="bg-card rounded-lg p-6">
                  <PriceChart 
                    pollId={poll.id} 
                    optionA={poll.option_a} 
                    optionB={poll.option_b}
                    pollCreatedAt={poll.created_at}
                  />
                </div>
              )}


              {/* Description */}
              {poll.description && (
                <Card>
                  <CardHeader>
                    <CardTitle>Contexto do Mercado</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">{poll.description}</p>
                  </CardContent>
                </Card>
              )}

              {/* Author Card */}
              {marketData && (
                <AuthorCard isAdminCreated={marketData.isAdminCreated} />
              )}

              {/* My Bets Card */}
              {id && poll && (
                <MyBetsCard pollId={id} poll={poll} />
              )}

              {/* Comments Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <MessageSquare className="h-5 w-5" />
                    <span>Comentários ({comments.length})</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {user ? (
                    <div className="space-y-3">
                      <Textarea
                        placeholder="Adicione um comentário..."
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        maxLength={500}
                      />
                      <Button 
                        onClick={handleAddComment}
                        disabled={addCommentMutation.isPending || !comment.trim()}
                        size="sm"
                      >
                        {addCommentMutation.isPending ? 'Enviando...' : 'Comentar'}
                      </Button>
                    </div>
                  ) : (
                    <div className="text-center py-4 border-2 border-dashed border-muted rounded-lg">
                      <p className="text-muted-foreground mb-2">Faça login para comentar</p>
                      <Link to="/auth">
                        <Button variant="outline" size="sm">Fazer Login</Button>
                      </Link>
                    </div>
                  )}

                  {commentsLoading ? (
                    <div className="space-y-4">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="animate-pulse flex space-x-3">
                          <div className="h-8 w-8 bg-muted rounded-full"></div>
                          <div className="flex-1 space-y-2">
                            <div className="h-4 bg-muted rounded w-1/3"></div>
                            <div className="h-3 bg-muted rounded w-full"></div>
                          </div>
                        </div>
                      ))}
                    </div>
                   ) : (
                     <div className="space-y-4">
                       {comments.map((comment) => (
                         <div key={comment.id} className="flex space-x-3">
                           <Avatar className="h-8 w-8">
                             <AvatarImage src={(comment.profiles as any)?.avatar_url} />
                             <AvatarFallback>
                               {(comment.profiles as any)?.display_name?.charAt(0) || 'U'}
                             </AvatarFallback>
                           </Avatar>
                           <div className="flex-1">
                             <div className="flex items-center justify-between">
                               <div className="flex items-center space-x-2">
                                 <span className="font-medium text-sm">
                                   {(comment.profiles as any)?.display_name || 'Usuário'}
                                 </span>
                                 <span className="text-xs text-muted-foreground">
                                   {format(new Date(comment.created_at), "PPP 'às' HH:mm", { locale: ptBR })}
                                 </span>
                               </div>
                               {isAdmin && (
                                 <Button
                                   variant="ghost"
                                   size="sm"
                                   onClick={() => handleDeleteComment(comment.id)}
                                   disabled={deleteCommentMutation.isPending}
                                   className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                                 >
                                   <Trash2 className="h-4 w-4" />
                                 </Button>
                               )}
                             </div>
                             <p className="text-sm mt-1">{comment.content}</p>
                           </div>
                         </div>
                       ))}
                       {comments.length === 0 && !commentsLoading && (
                         <div className="text-center py-6 text-muted-foreground">
                           Nenhum comentário ainda. Seja o primeiro a comentar!
                         </div>
                       )}
                     </div>
                   )}
                </CardContent>
              </Card>
            </div>

            {/* Betting Card - Right side */}
            <div className="lg:col-span-1" ref={bettingCardRef}>
              <BettingCard 
                poll={poll}
                options={marketData?.options || []}
                isExpired={isExpired}
                selectedOption={selectedOption}
                setSelectedOption={setSelectedOption}
              />
            </div>
          </div>
        ) : (
          // Multiple-option layout - Mobile first, then desktop grid
          <div className="flex flex-col lg:grid lg:gap-6 lg:grid-cols-3 space-y-4 lg:space-y-0">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-4 sm:space-y-6">
              {/* Poll Header with Image */}
              <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-6">
                {poll.image_url && (
                  <img
                    src={poll.image_url}
                    alt={poll.title}
                    className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-lg flex-shrink-0 mx-auto sm:mx-0"
                  />
                )}
                 <div className="flex-1 text-center sm:text-left">
                   <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-2">{poll.title}</h1>
                   {poll.question && (
                     <p className="text-sm sm:text-base lg:text-lg text-muted-foreground mb-3 sm:mb-4">{poll.question}</p>
                   )}
                   <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 sm:gap-4 text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4">
                     <span>R$ {(marketData?.totalVolume || 0).toFixed(0)} Vol.</span>
                     <span className="hidden sm:inline">•</span>
                     <span>Encerra {format(new Date(poll.end_date), "dd/MM", { locale: ptBR })}</span>
                   </div>
                  
                  {/* Market Probability Display for multi-option - moved here */}
                  {!marketLoading && marketData?.options && marketData.options.length > 2 && (
                    <div className="mt-3 sm:mt-4">
                      <div className="flex items-center justify-center sm:justify-start gap-2">
                        <span className="text-lg sm:text-xl lg:text-2xl font-bold text-primary">
                          {marketData.options[0]?.percentage.toFixed(0)}% chance
                        </span>
                        {/* Mock price change - you'll need to implement actual price change logic */}
                        <div className="flex items-center gap-1">
                          <ArrowUp className="h-3 w-3 sm:h-4 sm:w-4 text-green-500" />
                          <span className="text-xs sm:text-sm text-green-500 font-medium">1%</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Multi-Option Chart */}
              {!marketLoading && marketData?.options && (
                <MultiOptionChart options={marketData.options} />
              )}


              {/* Option Selector */}
              {!marketLoading && marketData?.options && (
                <OptionSelector 
                  options={marketData.options}
                  isExpired={isExpired}
                  onSelectOption={handleOptionSelect}
                  isMobile={isMobile}
                />
              )}

              {/* Description */}
              {poll.description && (
                <Card>
                  <CardHeader>
                    <CardTitle>Contexto do Mercado</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">{poll.description}</p>
                  </CardContent>
                </Card>
              )}

              {/* Author Card */}
              {marketData && (
                <AuthorCard isAdminCreated={marketData.isAdminCreated} />
              )}

              {/* My Bets Card */}
              {id && poll && (
                <MyBetsCard pollId={id} poll={poll} />
              )}

              {/* Comments Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <MessageSquare className="h-5 w-5" />
                    <span>Comentários ({comments.length})</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {user ? (
                    <div className="space-y-3">
                      <Textarea
                        placeholder="Adicione um comentário..."
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        maxLength={500}
                      />
                      <Button 
                        onClick={handleAddComment}
                        disabled={addCommentMutation.isPending || !comment.trim()}
                        size="sm"
                      >
                        {addCommentMutation.isPending ? 'Enviando...' : 'Comentar'}
                      </Button>
                    </div>
                  ) : (
                    <div className="text-center py-4 border-2 border-dashed border-muted rounded-lg">
                      <p className="text-muted-foreground mb-2">Faça login para comentar</p>
                      <Link to="/auth">
                        <Button variant="outline" size="sm">Fazer Login</Button>
                      </Link>
                    </div>
                  )}

                  {commentsLoading ? (
                    <div className="space-y-4">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="animate-pulse flex space-x-3">
                          <div className="h-8 w-8 bg-muted rounded-full"></div>
                          <div className="flex-1 space-y-2">
                            <div className="h-4 bg-muted rounded w-1/3"></div>
                            <div className="h-3 bg-muted rounded w-full"></div>
                          </div>
                        </div>
                      ))}
                    </div>
                   ) : (
                     <div className="space-y-4">
                       {comments.map((comment) => (
                         <div key={comment.id} className="flex space-x-3">
                           <Avatar className="h-8 w-8">
                             <AvatarImage src={(comment.profiles as any)?.avatar_url} />
                             <AvatarFallback>
                               {(comment.profiles as any)?.display_name?.charAt(0) || 'U'}
                             </AvatarFallback>
                           </Avatar>
                           <div className="flex-1">
                             <div className="flex items-center justify-between">
                               <div className="flex items-center space-x-2">
                                 <span className="font-medium text-sm">
                                   {(comment.profiles as any)?.display_name || 'Usuário'}
                                 </span>
                                 <span className="text-xs text-muted-foreground">
                                   {format(new Date(comment.created_at), "PPP 'às' HH:mm", { locale: ptBR })}
                                 </span>
                               </div>
                               {isAdmin && (
                                 <Button
                                   variant="ghost"
                                   size="sm"
                                   onClick={() => handleDeleteComment(comment.id)}
                                   disabled={deleteCommentMutation.isPending}
                                   className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                                 >
                                   <Trash2 className="h-4 w-4" />
                                 </Button>
                               )}
                             </div>
                             <p className="text-sm mt-1">{comment.content}</p>
                           </div>
                         </div>
                       ))}
                       {comments.length === 0 && !commentsLoading && (
                         <div className="text-center py-6 text-muted-foreground">
                           Nenhum comentário ainda. Seja o primeiro a comentar!
                         </div>
                       )}
                     </div>
                   )}
                </CardContent>
              </Card>
            </div>

            {/* Betting Card - Right side for multi-option */}
            <div className="lg:col-span-1" ref={!isTwoOption ? bettingCardRef : undefined}>
              <BettingCard 
                poll={poll}
                options={marketData?.options || []}
                isExpired={isExpired}
                selectedOption={selectedOption}
                setSelectedOption={setSelectedOption}
              />
            </div>
          </div>
        )}

        {/* Botões Sticky para enquetes SIM/NÃO em mobile */}
        {isMobile && isYesNoQuestion && !isExpired && marketData?.options && (
          <div className="fixed bottom-4 left-4 right-4 flex gap-3 z-50">
            {marketData.options.map((option) => {
              const isYes = option.label?.toLowerCase() === 'sim' || option.label?.toLowerCase() === 'yes';
              return (
                <Button
                  key={option.id}
                  onClick={() => handleOptionSelect(option.id)}
                  className={`flex-1 h-14 text-lg font-bold shadow-lg ${
                    isYes 
                      ? 'bg-green-600 hover:bg-green-700 text-white border-green-600' 
                      : 'bg-red-600 hover:bg-red-700 text-white border-red-600'
                  }`}
                  size="lg"
                >
                  {isYes ? (
                    <>
                      <Check className="h-5 w-5 mr-2" />
                      {option.label}
                    </>
                  ) : (
                    <>
                      <X className="h-5 w-5 mr-2" />
                      {option.label}
                    </>
                  )}
                </Button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default PollDetail;