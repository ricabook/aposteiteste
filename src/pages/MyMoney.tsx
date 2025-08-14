import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Wallet, TrendingUp, TrendingDown, CreditCard, Banknote, Plus, Copy } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import WithdrawalForm from '@/components/WithdrawalForm';
import TransactionsList from '@/components/TransactionsList';

export default function MyMoney() {
  const { user } = useAuth();
  const { profile, refetch: refetchProfile } = useProfile();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [isProcessingDeposit, setIsProcessingDeposit] = useState(false);

  // Removed Stripe deposit status handling

  const handleDeposit = async (amount: number) => {
    if (!user) return;
    
    toast({
      title: "Funcionalidade temporariamente indisponível",
      description: "Estamos atualizando nosso sistema de pagamentos. Tente novamente em breve.",
      variant: "default",
    });
  };


  const depositOptions = [
    { 
      amount: 10, 
      text: "Para realizar o pagamento de R$ 10,00, escaneie o QR Code acima ou utilize o código Pix Copia e Cola abaixo:", 
      qrCode: "/lovable-uploads/f2849429-b986-429e-956e-7b4feb21ee5a.png",
      pixCode: "00020126410014BR.GOV.BCB.PIX0119contato@apostei.org520400005303986540510.005802BR5920Apostei.org Enquetes6006Amparo62110507APOSTEI6304186A"
    },
    { 
      amount: 20, 
      text: "Para realizar o pagamento de R$ 20,00, escaneie o QR Code acima ou utilize o código Pix Copia e Cola abaixo:", 
      qrCode: "/lovable-uploads/c557ec97-74cb-4be0-9c06-0a386bcad7cd.png",
      pixCode: "00020126410014BR.GOV.BCB.PIX0119contato@apostei.org520400005303986540520.005802BR5920Apostei.org Enquetes6006Amparo62110507APOSTEI63046ABD"
    },
    { 
      amount: 50, 
      text: "Para realizar o pagamento de R$ 50,00, escaneie o QR Code acima ou utilize o código Pix Copia e Cola abaixo:", 
      qrCode: "/lovable-uploads/6a6bdf20-b0eb-4636-9413-b1625253dc1a.png",
      pixCode: "00020126410014BR.GOV.BCB.PIX0119contato@apostei.org520400005303986540550.005802BR5920Apostei.org Enquetes6006Amparo62110507APOSTEI63045141"
    },
    { 
      amount: 100, 
      text: "Para realizar o pagamento de R$ 100,00, escaneie o QR Code acima ou utilize o código Pix Copia e Cola abaixo:", 
      qrCode: "/lovable-uploads/72f5cc6f-4986-4968-9e9b-146027ec913f.png",
      pixCode: "00020126410014BR.GOV.BCB.PIX0119contato@apostei.org5204000053039865406100.005802BR5920Apostei.org Enquetes6006Amparo62110507APOSTEI6304EEAF"
    },
    { 
      amount: "outros", 
      text: "Para depositar outros valores, escaneie o QR Code acima ou utilize o código Pix Copia e Cola abaixo:", 
      qrCode: "/lovable-uploads/be5d08d9-9c43-4cc7-9aaa-c2d888b88b34.png",
      pixCode: "00020126410014BR.GOV.BCB.PIX0119contato@apostei.org5204000053039865802BR5920Apostei.org Enquetes6006Amparo62110507APOSTEI6304F2C2"
    }
  ];

  // Buscar saldo total investido em apostas ativas
  const { data: activeBetsData } = useQuery({
    queryKey: ['activeBets', user?.id],
    queryFn: async () => {
      if (!user) return { totalInvested: 0 };

      const { data: bets, error } = await supabase
        .from('bets')
        .select('amount')
        .eq('user_id', user.id)
        .eq('is_closed', false)
        .gt('amount', 0);

      if (error) throw error;

      const totalInvested = bets?.reduce((sum, bet) => sum + Number(bet.amount), 0) || 0;

      return { totalInvested };
    },
    enabled: !!user,
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(amount);
  };

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Meu dinheiro</h1>
          <p className="text-muted-foreground mb-6">Você precisa estar logado para ver suas informações financeiras</p>
          <Link to="/auth">
            <Button>Fazer Login</Button>
          </Link>
        </div>
      </div>
    );
  }

  const walletBalance = profile?.wallet_balance || 0;
  const totalInvested = activeBetsData?.totalInvested || 0;
  const totalBalance = walletBalance + totalInvested;

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Meu dinheiro</h1>
      </div>

      {/* Resumo financeiro */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saldo Disponível</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(walletBalance)}
            </div>
            <p className="text-xs text-muted-foreground">
              Valor livre para apostas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Em Apostas</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {formatCurrency(totalInvested)}
            </div>
            <p className="text-xs text-muted-foreground">
              Valor investido em apostas ativas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(totalBalance)}
            </div>
            <p className="text-xs text-muted-foreground">
              Saldo total na plataforma
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Seção de Depósito e Saque */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Coluna de Depósito */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <CreditCard className="h-5 w-5 text-green-600" />
              <span>Depósito</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary mb-2">
                {formatCurrency(walletBalance)}
              </div>
              <p className="text-sm text-muted-foreground">
                Saldo disponível para apostas
              </p>
            </div>

            {/* Opções de Depósito */}
            <div className="space-y-3">
              <h4 className="font-medium">Escolha o valor do depósito</h4>
              <div className="grid grid-cols-2 gap-3">
                {depositOptions.map((option) => (
                  <Dialog key={option.amount}>
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        className={`flex flex-col h-16 space-y-1 ${option.amount === "outros" ? "col-span-2" : ""}`}
                        disabled={isProcessingDeposit}
                      >
                        <Plus className="h-4 w-4" />
                        <span className="text-sm font-semibold">
                          {option.amount === "outros" ? "Outros Valores" : formatCurrency(option.amount as number)}
                        </span>
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle className="text-center">
                          {option.amount === "outros" ? "Outros Valores" : `Depositar ${formatCurrency(option.amount as number)}`}
                        </DialogTitle>
                      </DialogHeader>
                      <div className="flex flex-col items-center space-y-4 py-4">
                        <div className="bg-white p-4 rounded-lg border">
                          <img 
                            src={option.qrCode} 
                            alt={option.amount === "outros" ? "QR Code para outros valores" : `QR Code para depósito de ${formatCurrency(option.amount as number)}`}
                            className="w-48 h-48 object-contain"
                            loading="eager"
                            onLoad={(e) => {
                              // Preload the image to improve loading speed
                              e.currentTarget.style.opacity = '1';
                            }}
                            onError={(e) => {
                              console.error('Failed to load QR code image:', e);
                            }}
                            style={{ opacity: 0, transition: 'opacity 0.3s' }}
                          />
                        </div>
                        <p className="text-sm text-muted-foreground text-center">
                          {option.text}
                        </p>
                        <div className="w-full space-y-2">
                          <div className="flex items-center space-x-2">
                            <input 
                              type="text" 
                              value={option.pixCode}
                              readOnly
                              className="flex-1 p-2 text-xs border rounded bg-gray-50 dark:bg-gray-800 dark:text-white dark:border-gray-600 font-mono"
                              onFocus={(e) => e.target.blur()}
                              onMouseDown={(e) => e.preventDefault()}
                              style={{ userSelect: 'none' }}
                            />
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                navigator.clipboard.writeText(option.pixCode);
                                toast({
                                  title: "Código copiado!",
                                  description: "O código PIX foi copiado para a área de transferência.",
                                });
                              }}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                ))}
              </div>
            </div>
            
            <div className="text-center text-sm text-muted-foreground">
              Clique nas opções acima para realizar um depósito através de QR Code PIX. Certifique-se de depositar utilizando uma conta bancária com o mesmo nome de cadastro no site.
            </div>
            
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-700 text-center">
                Se seu depósito não for creditado automaticamente, entre em contato conosco através do e-mail: contato@apostei.org
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Coluna de Saque */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Banknote className="h-5 w-5 text-blue-600" />
              <span>Saque</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary mb-2">
                {formatCurrency(walletBalance)}
              </div>
              <p className="text-sm text-muted-foreground">
                Valor disponível para saque
              </p>
            </div>

            <WithdrawalForm 
              availableBalance={walletBalance}
              onSuccess={() => refetchProfile()}
            />

            <div className="text-center">
              <Link to="/my-withdrawals">
                <Button variant="outline" size="sm" className="w-full">
                  Ver Meus Saques
                </Button>
              </Link>
            </div>

            <div className="text-xs text-muted-foreground space-y-1 text-center">
              <p>🏦 Transferência via Pix</p>
              <p>⏱️ Processamento em até 24h</p>
              <p>💰 Valor mínimo: R$ 5,00</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Seção de Transações */}
      <TransactionsList />

      {/* Informações adicionais */}
      <Card>
        <CardHeader>
          <CardTitle>Como funciona?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <h4 className="font-semibold flex items-center space-x-2">
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  Saldo Disponível
                </Badge>
              </h4>
              <p className="text-sm text-muted-foreground">
                Este é o valor que você pode usar para fazer novas apostas. 
                Quando você realiza uma aposta, este valor diminui.
              </p>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-semibold flex items-center space-x-2">
                <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                  Em Apostas
                </Badge>
              </h4>
              <p className="text-sm text-muted-foreground">
                Este é o valor total que você tem investido em apostas ativas. 
                Este valor retorna ao seu saldo quando você encerra uma aposta ou ela é resolvida.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}