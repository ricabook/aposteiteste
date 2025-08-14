import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface PriceChartProps {
  pollId: string;
  optionA: string;
  optionB: string;
  pollCreatedAt?: string;
}

export function PriceChart({ pollId, optionA, optionB, pollCreatedAt }: PriceChartProps) {
  const queryClient = useQueryClient();
  
  // Verifica se é uma enquete SIM/NÃO
  const isYesNoQuestion = (optionA.toLowerCase() === 'sim' && optionB.toLowerCase() === 'não') || 
                         (optionA.toLowerCase() === 'yes' && optionB.toLowerCase() === 'no');

  // Real-time updates para novas apostas
  useEffect(() => {
    if (!pollId) return;

    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bets',
          filter: `poll_id=eq.${pollId}`
        },
        (payload) => {
          console.log('Nova aposta detectada, atualizando gráfico:', payload);
          // Invalida a query para forçar uma nova busca de dados
          queryClient.invalidateQueries({ queryKey: ['priceHistory', pollId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [pollId, queryClient]);

  const { data: chartData, isLoading, error } = useQuery({
    queryKey: ['priceHistory', pollId],
    queryFn: async () => {
      // Get poll creation date if not provided
      let pollStartString = pollCreatedAt;
      if (!pollStartString) {
        const { data: pollData } = await supabase
          .from('polls')
          .select('created_at')
          .eq('id', pollId)
          .single();
        pollStartString = pollData?.created_at;
      }

      if (!pollStartString) {
        return generateSampleData();
      }

      const pollStartTime = new Date(pollStartString);

      // Get current market data with same logic as PollDetail
      const { data: betsData } = await supabase
        .from('bets')
        .select('option_chosen, amount, created_at')
        .eq('poll_id', pollId)
        .gt('amount', 0)
        .eq('is_closed', false)
        .order('created_at', { ascending: true });

      const activeBets = betsData || [];
      
      if (activeBets.length === 0) {
        return generateSampleData(pollStartTime);
      }

      // Create daily snapshots since poll creation
      const dailySnapshots = new Map();
      
      // Find the latest day with data
      const latestBetTime = activeBets.length > 0 
        ? new Date(Math.max(...activeBets.map(bet => new Date(bet.created_at).getTime())))
        : new Date();
      
      const pollStart = new Date(pollStartTime);
      pollStart.setHours(0, 0, 0, 0); // Start of poll creation day
      
      const latestDay = new Date(latestBetTime);
      latestDay.setHours(23, 59, 59, 999); // End of the latest day
      
      const totalDays = Math.max(1, Math.ceil((latestDay.getTime() - pollStart.getTime()) / (1000 * 60 * 60 * 24)));
      
      // Create snapshots for each day since poll creation
      for (let day = 0; day <= totalDays; day++) {
        const snapshotTime = new Date(pollStart);
        snapshotTime.setDate(snapshotTime.getDate() + day);
        snapshotTime.setHours(23, 59, 59, 999); // End of the day
        
        // Get all bets up to end of this day
        const betsUpToDay = activeBets.filter(bet => 
          new Date(bet.created_at) <= snapshotTime
        );
        
        // Calculate cumulative totals
        let totalA = 0;
        let totalB = 0;
        
        betsUpToDay.forEach(bet => {
          if (bet.option_chosen === 'A') {
            totalA += Number(bet.amount);
          } else {
            totalB += Number(bet.amount);
          }
        });
        
        const total = totalA + totalB;
        const percentageA = total > 0 ? (totalA / total) * 100 : 50;
        
        dailySnapshots.set(day, {
          day,
          totalA,
          totalB,
          percentageA: Math.round(percentageA * 10) / 10,
          timestamp: snapshotTime,
          hasData: betsUpToDay.length > 0
        });
      }
      
      // Convert to array for chart
      return Array.from(dailySnapshots.values()).map(snapshot => {
        const displayDate = new Date(snapshot.timestamp);
        displayDate.setHours(0, 0, 0, 0); // Use start of day for display
        
        return {
          timestamp: snapshot.timestamp,
          daysFromStart: snapshot.day,
          date: format(displayDate, 'dd/MM', { locale: ptBR }),
          optionA: snapshot.percentageA,
          hasData: snapshot.hasData
        };
      });
    },
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchInterval: 60000,
    refetchOnWindowFocus: false,
    retry: 1,
    enabled: !!pollId,
  });

  // Função para gerar dados de exemplo
  const generateSampleData = (pollStartTime?: Date) => {
    const data = [];
    const startTime = pollStartTime || new Date();
    
    for (let i = 0; i <= 7; i++) {
      const date = new Date(startTime);
      date.setDate(date.getDate() + i);
      
      // Simular variação de odds realística para SIM
      const baseA = 50 + Math.sin(i * 0.3) * 20 + (Math.random() - 0.5) * 10; // Oscila entre ~20-80%
      
      data.push({
        timestamp: date.toISOString(),
        daysFromStart: i,
        date: format(date, 'dd/MM', { locale: ptBR }),
        optionA: Math.max(10, Math.min(90, baseA)),
      });
    }
    
    return data;
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border rounded-lg p-3 shadow-lg">
          <p className="text-sm font-medium mb-2">Tempo: {label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {optionA}: {entry.value.toFixed(1)}%
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{isYesNoQuestion ? `Evolução - ${optionA}` : 'Histórico de Preços'}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 animate-pulse">
            <div className="h-full bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    console.error('Chart error:', error);
    // Em caso de erro, ainda mostra o gráfico com dados de exemplo
    const fallbackData = generateSampleData();
    
    return (
      <Card>
        <CardHeader>
          <CardTitle>{isYesNoQuestion ? `Evolução - ${optionA}` : 'Histórico de Preços'}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={fallbackData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="date" 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                   label={{ value: 'Dias desde criação', position: 'insideBottom', offset: -5 }}
                />
                <YAxis 
                  domain={[0, 100]}
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickFormatter={(value) => `${value}%`}
                  label={{ value: '% SIM', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip content={<CustomTooltip />} />
                {isYesNoQuestion ? (
                  <Line
                    type="monotone"
                    dataKey="optionA"
                    stroke="hsl(var(--primary))"
                    strokeWidth={3}
                    dot={false}
                    name={optionA}
                  />
                ) : (
                  <>
                    <Line
                      type="monotone"
                      dataKey="optionA"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      dot={false}
                      name={optionA}
                    />
                    <Line
                      type="monotone"
                      dataKey="optionB"
                      stroke="hsl(var(--destructive))"
                      strokeWidth={2}
                      dot={false}
                      name={optionB}
                    />
                  </>
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
          {isYesNoQuestion ? (
            <div className="flex items-center justify-center mt-4">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-primary rounded-full"></div>
                <span className="text-sm text-muted-foreground">{optionA}</span>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center space-x-6 mt-4">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-primary rounded-full"></div>
                <span className="text-sm text-muted-foreground">{optionA}</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-destructive rounded-full"></div>
                <span className="text-sm text-muted-foreground">{optionB}</span>
              </div>
            </div>
          )}
          <div className="text-center mt-2">
            <p className="text-xs text-muted-foreground">Dados demonstrativos</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Determina os dados a serem usados no gráfico
  const displayData = (!chartData || chartData.length === 0) ? generateSampleData() : chartData;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isYesNoQuestion ? `Evolução - ${optionA}` : 'Histórico de Preços'}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={displayData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="date" 
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                label={{ value: 'Dias desde criação', position: 'insideBottom', offset: -5 }}
              />
                <YAxis 
                  domain={[0, 100]}
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickFormatter={(value) => `${value}%`}
                  label={{ value: '% SIM', angle: -90, position: 'insideLeft' }}
                />
              <Tooltip content={<CustomTooltip />} />
              {isYesNoQuestion ? (
                <Line
                  type="monotone"
                  dataKey="optionA"
                  stroke="hsl(var(--primary))"
                  strokeWidth={3}
                  dot={false}
                  name={optionA}
                />
              ) : (
                <>
                  <Line
                    type="monotone"
                    dataKey="optionA"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={false}
                    name={optionA}
                  />
                  <Line
                    type="monotone"
                    dataKey="optionB"
                    stroke="hsl(var(--destructive))"
                    strokeWidth={2}
                    dot={false}
                    name={optionB}
                  />
                </>
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
        {isYesNoQuestion ? (
          <div className="flex items-center justify-center mt-4">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-primary rounded-full"></div>
              <span className="text-sm text-muted-foreground">{optionA}</span>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center space-x-6 mt-4">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-primary rounded-full"></div>
              <span className="text-sm text-muted-foreground">{optionA}</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-destructive rounded-full"></div>
              <span className="text-sm text-muted-foreground">{optionB}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}