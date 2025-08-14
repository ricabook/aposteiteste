import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { Card } from '@/components/ui/card';

interface MultiOptionChartProps {
  options: Array<{
    id: string;
    label: string;
    percentage: number;
    image_url?: string;
  }>;
}

const COLORS = [
  '#3B82F6', // blue
  '#EF4444', // red
  '#10B981', // green
  '#F59E0B', // yellow
  '#8B5CF6', // purple
  '#EC4899', // pink
  '#06B6D4', // cyan
  '#84CC16', // lime
];

export const MultiOptionChart = ({ options }: MultiOptionChartProps) => {
  // Generate historical data that progresses toward current real percentages
  const generateChartData = () => {
    const data = [];
    const now = new Date();
    
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      
      const dataPoint: any = {
        date: date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }),
      };
      
      // Create progression toward current real percentages
      const daysDiff = 29 - i; // How many days ago
      const progressFactor = daysDiff / 29; // 0 to 1
      
      let remainingPercent = 100;
      
      options.forEach((option, index) => {
        if (index === options.length - 1) {
          // Last option gets the remaining percentage to ensure sum equals 100%
          dataPoint[option.id] = Math.max(1, Math.round(remainingPercent * 10) / 10);
        } else {
          // Start with equal distribution, progress toward actual percentage
          const startValue = 100 / options.length;
          const targetValue = option.percentage;
          
          // Interpolate between start and target with some variation
          const interpolated = startValue + (targetValue - startValue) * progressFactor;
          const maxVariation = Math.min(interpolated * 0.1, 5); // Small variation
          const variation = (Math.random() - 0.5) * maxVariation;
          
          const percent = Math.max(1, Math.min(
            remainingPercent - (options.length - index - 1), 
            interpolated + variation
          ));
          
          dataPoint[option.id] = Math.round(percent * 10) / 10;
          remainingPercent -= percent;
        }
      });
      
      data.push(dataPoint);
    }
    
    return data;
  };

  const chartData = generateChartData();

  return (
    <Card className="p-6">
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis 
              dataKey="date" 
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
            />
            <YAxis 
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              domain={[0, 100]}
              tickFormatter={(value) => `${value}%`}
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: "hsl(var(--background))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "6px",
                boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)"
              }}
              formatter={(value: any, name: string) => [
                `${Number(value).toFixed(1)}%`,
                options.find(opt => opt.id === name)?.label || name
              ]}
            />
            <Legend />
            {options.map((option, index) => (
              <Line
                key={option.id}
                type="monotone"
                dataKey={option.id}
                stroke={COLORS[index % COLORS.length]}
                strokeWidth={2}
                dot={{ r: 3 }}
                name={option.label}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
};