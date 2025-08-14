'use client';

import React, { useState } from 'react';
import { useAccount, useBalance, useSendTransaction, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther, formatEther, isAddress } from 'viem';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Send, Loader2, CheckCircle, XCircle, ExternalLink } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

export function WagmiTransactionExample() {
  const { address, isConnected, chain } = useAccount();
  const { data: balance } = useBalance({ address });
  const { sendTransaction, data: hash, isPending, error } = useSendTransaction();
  
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');

  // Aguarda confirmação da transação
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  const handleSendTransaction = async () => {
    if (!recipient || !amount) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha o endereço de destino e o valor.",
        variant: "destructive",
      });
      return;
    }

    // Validação do endereço
    if (!isAddress(recipient)) {
      toast({
        title: "Endereço inválido",
        description: "Por favor, insira um endereço Ethereum válido.",
        variant: "destructive",
      });
      return;
    }

    // Validação do valor
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast({
        title: "Valor inválido",
        description: "Por favor, insira um valor válido maior que zero.",
        variant: "destructive",
      });
      return;
    }

    // Verifica se há saldo suficiente
    if (balance && amountNum > parseFloat(formatEther(balance.value))) {
      toast({
        title: "Saldo insuficiente",
        description: "Você não tem saldo suficiente para esta transação.",
        variant: "destructive",
      });
      return;
    }

    try {
      await sendTransaction({
        to: recipient as `0x${string}`,
        value: parseEther(amount),
      });
      
      setRecipient('');
      setAmount('');
    } catch (error) {
      console.error('Erro na transação:', error);
    }
  };

  // Link para o explorador de blockchain
  const getExplorerLink = (txHash: string) => {
    if (!chain?.blockExplorers?.default) return null;
    return `${chain.blockExplorers.default.url}/tx/${txHash}`;
  };

  if (!isConnected) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Enviar Transação ETH (Wagmi)
          </CardTitle>
          <CardDescription>
            Conecte sua carteira MetaMask para enviar transações usando Wagmi
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
          Enviar Transação ETH (Wagmi)
        </CardTitle>
        <CardDescription>
          Versão profissional usando Wagmi + viem com melhor suporte mobile
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
            <p className="text-sm font-semibold">
              {balance ? `${parseFloat(formatEther(balance.value)).toFixed(4)} ${balance.symbol}` : '0.0000 ETH'}
            </p>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Rede</Label>
            <p className="text-sm">{chain?.name || 'Desconhecida'}</p>
          </div>
        </div>

        {/* Status da transação */}
        {hash && (
          <Alert className="border-blue-200 bg-blue-50">
            <div className="flex items-center gap-2">
              {isConfirming ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : isConfirmed ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <XCircle className="h-4 w-4 text-red-600" />
              )}
              <AlertDescription className="flex-1">
                <div className="flex items-center justify-between">
                  <span>
                    {isConfirming && "Aguardando confirmação..."}
                    {isConfirmed && "Transação confirmada!"}
                    {!isConfirming && !isConfirmed && "Transação enviada"}
                  </span>
                  {getExplorerLink(hash) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => window.open(getExplorerLink(hash), '_blank')}
                    >
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground font-mono mt-1">
                  {hash.slice(0, 10)}...{hash.slice(-8)}
                </p>
              </AlertDescription>
            </div>
          </Alert>
        )}

        {/* Erro de transação */}
        {error && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>
              Erro na transação: {error.message}
            </AlertDescription>
          </Alert>
        )}

        {/* Formulário de transação */}
        <div className="space-y-4">
          <div>
            <Label htmlFor="wagmi-recipient">Endereço de destino</Label>
            <Input
              id="wagmi-recipient"
              placeholder="0x..."
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              className="font-mono"
            />
          </div>

          <div>
            <Label htmlFor="wagmi-amount">Valor ({balance?.symbol || 'ETH'})</Label>
            <Input
              id="wagmi-amount"
              type="number"
              step="0.0001"
              placeholder="0.001"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>

          <Button
            onClick={handleSendTransaction}
            disabled={isPending || isConfirming || !recipient || !amount}
            className="w-full"
          >
            {isPending || isConfirming ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {isPending ? 'Enviando...' : 'Confirmando...'}
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