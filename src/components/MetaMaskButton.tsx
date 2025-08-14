'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { useMetaMask } from '@/hooks/useMetaMask';
import { Wallet, ExternalLink, Copy, LogOut, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface MetaMaskButtonProps {
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg';
  showFullAddress?: boolean;
  showBalance?: boolean;
  showNetwork?: boolean;
}

export function MetaMaskButton({ 
  variant = 'outline',
  size = 'default',
  showFullAddress = false,
  showBalance = true,
  showNetwork = true
}: MetaMaskButtonProps) {
  const {
    isConnected,
    address,
    balance,
    networkName,
    chainId,
    isLoading,
    isInstalled,
    connect,
    disconnect,
    switchNetwork,
  } = useMetaMask();

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
    if (!address || !chainId) return;
    
    let explorerUrl = '';
    switch (chainId) {
      case '0x1':
        explorerUrl = `https://etherscan.io/address/${address}`;
        break;
      case '0x89':
        explorerUrl = `https://polygonscan.com/address/${address}`;
        break;
      case '0x2105':
        explorerUrl = `https://basescan.org/address/${address}`;
        break;
      default:
        explorerUrl = `https://etherscan.io/address/${address}`;
    }
    
    window.open(explorerUrl, '_blank');
  };

  // Redes populares para troca rápida
  const popularNetworks = [
    { name: 'Ethereum', chainId: '0x1' },
    { name: 'Polygon', chainId: '0x89' },
    { name: 'Base', chainId: '0x2105' },
  ];

  if (!isInstalled) {
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

  if (!isConnected) {
    return (
      <Button
        variant={variant}
        size={size}
        onClick={connect}
        disabled={isLoading}
        className="flex items-center gap-2"
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Wallet className="h-4 w-4" />
        )}
        {isLoading ? 'Conectando...' : 'Conectar Carteira'}
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
            {showNetwork && (
              <span className="text-xs text-muted-foreground truncate">
                {networkName}
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
                {balance} ETH
              </Badge>
            </div>
          )}
          
          {showNetwork && (
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Rede</span>
              <Badge variant="outline" className="text-xs">
                {networkName}
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
          {popularNetworks.map((network) => (
            <DropdownMenuItem
              key={network.chainId}
              onClick={() => switchNetwork(network.chainId)}
              className="text-xs"
              disabled={chainId === network.chainId}
            >
              {network.name}
              {chainId === network.chainId && (
                <Badge variant="secondary" className="ml-auto text-xs">
                  Atual
                </Badge>
              )}
            </DropdownMenuItem>
          ))}
        </div>

        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={disconnect} className="flex items-center gap-2 text-red-600">
          <LogOut className="h-4 w-4" />
          Desconectar
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}