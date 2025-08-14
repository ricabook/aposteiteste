'use client';

import React from 'react';
import { useConnect, useDisconnect, useAccount, useBalance, useChainId, useSwitchChain } from 'wagmi';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Wallet, ExternalLink, Copy, LogOut, Loader2, AlertCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { formatEther } from 'viem';
import { mainnet, polygon, base } from 'wagmi/chains';

interface WagmiMetaMaskButtonProps {
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg';
  showFullAddress?: boolean;
  showBalance?: boolean;
  showNetwork?: boolean;
}

export function WagmiMetaMaskButton({ 
  variant = 'outline',
  size = 'default',
  showFullAddress = false,
  showBalance = true,
  showNetwork = true
}: WagmiMetaMaskButtonProps) {
  const { connectors, connect, status, error } = useConnect();
  const { disconnect } = useDisconnect();
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  
  // Obtém o saldo na rede atual
  const { data: balance } = useBalance({
    address: address,
  });

  // Conectores MetaMask disponíveis
  const metaMaskConnector = connectors.find(
    (connector) => connector.id === 'io.metamask' || connector.name.toLowerCase().includes('metamask')
  );
  const injectedConnector = connectors.find((connector) => connector.id === 'injected');
  const connector = metaMaskConnector || injectedConnector;

  // Informações das redes
  const networks = [
    { name: 'Ethereum', chain: mainnet, icon: '⬢' },
    { name: 'Polygon', chain: polygon, icon: '◊' },
    { name: 'Base', chain: base, icon: '🔵' },
  ];

  const currentNetwork = networks.find(n => n.chain.id === chainId);

  // Formata endereço para exibição
  const formatAddress = (addr: string) => {
    if (showFullAddress) return addr;
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  // Copia endereço para clipboard
  const copyAddress = async () => {
    if (!address) return;
    
    try {
      await navigator.clipboard.writeText(address);
      toast({
        title: "Endereço copiado!",
        description: "O endereço da carteira foi copiado para o clipboard.",
      });
    } catch (error) {
      toast({
        title: "Erro ao copiar",
        description: "Não foi possível copiar o endereço.",
        variant: "destructive",
      });
    }
  };

  // Abre explorador de blockchain
  const openInExplorer = () => {
    if (!address || !currentNetwork) return;
    
    const explorerUrl = `${currentNetwork.chain.blockExplorers?.default.url}/address/${address}`;
    window.open(explorerUrl, '_blank');
  };

  // Conecta carteira
  const handleConnect = () => {
    if (!connector) {
      toast({
        title: "MetaMask não encontrado",
        description: "Por favor, instale a extensão MetaMask para continuar.",
        variant: "destructive",
      });
      window.open('https://metamask.io/download/', '_blank');
      return;
    }

    connect({ connector });
  };

  // Troca de rede
  const handleSwitchChain = (targetChainId: number) => {
    switchChain({ chainId: targetChainId });
  };

  // Se não há conectores disponíveis
  if (!connector) {
    return (
      <Button
        variant={variant}
        size={size}
        onClick={() => window.open('https://metamask.io/download/', '_blank')}
        className="flex items-center gap-2"
      >
        <Wallet className="h-4 w-4" />
        Instalar MetaMask
      </Button>
    );
  }

  // Exibe erros de conexão
  if (error) {
    return (
      <Button
        variant="destructive"
        size={size}
        onClick={handleConnect}
        className="flex items-center gap-2"
      >
        <AlertCircle className="h-4 w-4" />
        Erro na conexão
      </Button>
    );
  }

  // Estado de carregamento
  if (status === 'pending') {
    return (
      <Button
        variant={variant}
        size={size}
        disabled
        className="flex items-center gap-2"
      >
        <Loader2 className="h-4 w-4 animate-spin" />
        Conectando...
      </Button>
    );
  }

  // Se não está conectado
  if (!isConnected) {
    return (
      <Button
        variant={variant}
        size={size}
        onClick={handleConnect}
        className="flex items-center gap-2"
      >
        <Wallet className="h-4 w-4" />
        Conectar MetaMask
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={variant}
          size={size}
          className="flex items-center gap-2 min-w-0"
        >
          <Wallet className="h-4 w-4 flex-shrink-0" />
          <div className="flex flex-col items-start min-w-0">
            <span className="text-sm font-medium truncate">
              {formatAddress(address!)}
            </span>
            {showNetwork && currentNetwork && (
              <span className="text-xs text-muted-foreground truncate">
                {currentNetwork.icon} {currentNetwork.name}
              </span>
            )}
          </div>
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent className="w-64" align="end">
        {/* Informações da carteira */}
        <div className="p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Endereço</span>
            <Badge variant="secondary" className="text-xs font-mono">
              {formatAddress(address!)}
            </Badge>
          </div>
          
          {showBalance && balance && (
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Saldo</span>
              <Badge variant="outline" className="text-xs">
                {parseFloat(formatEther(balance.value)).toFixed(4)} {balance.symbol}
              </Badge>
            </div>
          )}
          
          {showNetwork && currentNetwork && (
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Rede</span>
              <Badge variant="outline" className="text-xs">
                {currentNetwork.icon} {currentNetwork.name}
              </Badge>
            </div>
          )}
        </div>

        <DropdownMenuSeparator />

        {/* Ações */}
        <DropdownMenuItem onClick={copyAddress} className="flex items-center gap-2">
          <Copy className="h-4 w-4" />
          Copiar endereço
        </DropdownMenuItem>

        <DropdownMenuItem onClick={openInExplorer} className="flex items-center gap-2">
          <ExternalLink className="h-4 w-4" />
          Ver no explorador
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {/* Troca de rede */}
        <div className="p-2">
          <div className="text-xs font-medium text-muted-foreground mb-2 px-2">
            Trocar rede
          </div>
          {networks.map((network) => (
            <DropdownMenuItem
              key={network.chain.id}
              onClick={() => handleSwitchChain(network.chain.id)}
              className="text-xs"
              disabled={chainId === network.chain.id}
            >
              <span className="mr-2">{network.icon}</span>
              {network.name}
              {chainId === network.chain.id && (
                <Badge variant="secondary" className="ml-auto text-xs">
                  Atual
                </Badge>
              )}
            </DropdownMenuItem>
          ))}
        </div>

        <DropdownMenuSeparator />

        <DropdownMenuItem 
          onClick={() => disconnect()} 
          className="flex items-center gap-2 text-red-600"
        >
          <LogOut className="h-4 w-4" />
          Desconectar
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}