import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Banknote } from 'lucide-react';

interface WithdrawalFormProps {
  availableBalance: number;
  onSuccess: () => void;
}

export default function WithdrawalForm({ availableBalance, onSuccess }: WithdrawalFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [amount, setAmount] = useState('');
  const [pixKey, setPixKey] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast({
        title: "Erro",
        description: "Você precisa estar logado para solicitar um saque.",
        variant: "destructive",
      });
      return;
    }

    const withdrawalAmount = parseFloat(amount);
    
    // Validações
    if (!withdrawalAmount || withdrawalAmount < 5) {
      toast({
        title: "Valor inválido",
        description: "O valor mínimo para saque é R$ 5,00.",
        variant: "destructive",
      });
      return;
    }

    if (withdrawalAmount > availableBalance) {
      toast({
        title: "Saldo insuficiente",
        description: "Você não possui saldo suficiente para este saque.",
        variant: "destructive",
      });
      return;
    }

    if (!pixKey.trim()) {
      toast({
        title: "Chave PIX obrigatória",
        description: "Informe sua chave PIX para receber o saque.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      const { error } = await supabase
        .from('withdrawals')
        .insert({
          user_id: user.id,
          amount: withdrawalAmount,
          pix_key: pixKey.trim(),
        });

      if (error) throw error;

      toast({
        title: "Saque solicitado!",
        description: "Sua solicitação de saque foi enviada e será processada em até 24h.",
      });

      // Trigger cache invalidation for admin panel
      window.dispatchEvent(new CustomEvent('invalidateWithdrawals'));

      // Limpar formulário
      setAmount('');
      setPixKey('');
      onSuccess();
      
    } catch (error) {
      console.error('Error creating withdrawal:', error);
      toast({
        title: "Erro ao solicitar saque",
        description: "Tente novamente em alguns instantes.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="withdrawal-amount">Valor do saque</Label>
        <Input
          id="withdrawal-amount"
          type="number"
          placeholder="50.00"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          min="5"
          max={availableBalance}
          step="0.01"
          disabled={isSubmitting}
          required
        />
        <p className="text-xs text-muted-foreground">
          Disponível: {formatCurrency(availableBalance)}
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="pix-key">Chave PIX</Label>
        <Input
          id="pix-key"
          type="text"
          placeholder="CPF, telefone, email ou chave aleatória"
          value={pixKey}
          onChange={(e) => setPixKey(e.target.value)}
          disabled={isSubmitting}
          required
        />
        <p className="text-xs text-muted-foreground">
          Informe sua chave PIX para receber o pagamento
        </p>
      </div>

      <Button 
        type="submit"
        className="w-full"
        disabled={isSubmitting || !amount || !pixKey || parseFloat(amount) < 5 || parseFloat(amount) > availableBalance}
      >
        {isSubmitting ? (
          "Processando..."
        ) : (
          <>
            <Banknote className="h-4 w-4 mr-2" />
            Solicitar Saque
          </>
        )}
      </Button>
    </form>
  );
}