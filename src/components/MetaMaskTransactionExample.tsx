'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useMetaMask } from '@/hooks/useMetaMask';
import { Send, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

export function MetaMaskTransactionExample() {
  const { isConnected, address, balance, networkName, sendTransaction } = useMetaMask();
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSendTransaction = async () => {
    if (!recipient || !amount) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha o endereço de destino e o valor.",
        variant: "destructive",
      });
      return;
    }

    // Validação básica do endereço Ethereum
    if (!recipient.match(/^0x[a-fA-F0-9]{40}$/)) {
      toast({
        title: "Endereço inválido",
        description: "Por favor, insira um endereço Ethereum válido.",
        variant: "destructive",
      });
      return;
    }

    // Converte ETH para wei (1 ETH = 10^18 wei)
    const weiValue = (parseFloat(amount) * Math.pow(10, 18)).toString(16);
    const valueInWei = `0x${weiValue}`;

    setIsLoading(true);

    try {
      const txHash = await sendTransaction({
        to: recipient,
        value: valueInWei,
      });

      if (txHash) {
        setRecipient('');
        setAmount('');
        toast({
          title: "Transação enviada com sucesso!",
          description: `Hash da transação: ${txHash}`,
        });
      }
    } catch (error) {
      console.error('Erro na transação:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isConnected) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Enviar Transação ETH
          </CardTitle>
          <CardDescription>
            Conecte sua carteira MetaMask para enviar transações
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Você precisa conectar sua carteira MetaMask para usar esta funcionalidade.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Send className="h-5 w-5" />
          Enviar Transação ETH
        </CardTitle>
        <CardDescription>
          Envie ETH para outro endereço usando MetaMask
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Informações da carteira conectada */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
          <div>
            <Label className="text-xs text-muted-foreground">Endereço</Label>
            <p className="text-sm font-mono">
              {address?.slice(0, 6)}...{address?.slice(-4)}
            </p>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Saldo</Label>
            <p className="text-sm font-semibold">{balance} ETH</p>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Rede</Label>
            <p className="text-sm">{networkName}</p>
          </div>
        </div>

        {/* Formulário de transação */}
        <div className="space-y-4">
          <div>
            <Label htmlFor="recipient">Endereço de destino</Label>
            <Input
              id="recipient"
              placeholder="0x..."
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              className="font-mono"
            />
          </div>

          <div>
            <Label htmlFor="amount">Valor (ETH)</Label>
            <Input
              id="amount"
              type="number"
              step="0.0001"
              placeholder="0.001"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>

          <Button
            onClick={handleSendTransaction}
            disabled={isLoading || !recipient || !amount}
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Enviar Transação
              </>
            )}
          </Button>
        </div>

        {/* Aviso de segurança */}
        <div className="text-xs text-muted-foreground border-l-2 border-amber-500 pl-3">
          <strong>⚠️ Aviso:</strong> Sempre verifique o endereço de destino antes de enviar. 
          Transações na blockchain são irreversíveis.
        </div>
      </CardContent>
    </Card>
  );
}