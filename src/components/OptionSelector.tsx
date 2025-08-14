import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface Option {
  id: string;
  label: string;
  percentage: number;
  image_url?: string;
  volume?: number;
  stats?: any;
}

interface OptionSelectorProps {
  options: Option[];
  isExpired: boolean;
  onSelectOption: (optionId: string) => void;
  isMobile?: boolean;
}

export const OptionSelector = ({ options, isExpired, onSelectOption, isMobile }: OptionSelectorProps) => {
  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold mb-4">Opções Disponíveis</h3>
      {options.map((option) => (
        <Card key={option.id} className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4 flex-1">
                {option.image_url && (
                  <img
                    src={option.image_url}
                    alt={option.label}
                    className="w-16 h-16 object-cover rounded-lg"
                  />
                )}
                <div className="flex-1">
                  <h4 
                    className="font-semibold text-lg cursor-pointer hover:text-primary transition-colors" 
                    onClick={() => onSelectOption(option.id)}
                  >
                    {option.label}
                  </h4>
                  <div className="text-sm text-muted-foreground">
                    R$ {Number(option.stats?.total_amount || 0).toFixed(0)} vol. • {option.stats?.unique_bettors || 0} apostadores
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                <Button
                  onClick={() => onSelectOption(option.id)}
                  disabled={isExpired}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground min-w-16 px-3"
                >
                  {isExpired ? 'Encerrada' : `${option.percentage.toFixed(0)}%`}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};