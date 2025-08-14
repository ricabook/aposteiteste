'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from '@/hooks/use-toast';

// Tipos TypeScript para MetaMask
declare global {
  interface Window {
    ethereum?: any;
  }
}

export interface MetaMaskState {
  isConnected: boolean;
  address: string | null;
  balance: string | null;
  chainId: string | null;
  networkName: string;
  isLoading: boolean;
  isInstalled: boolean;
}

export interface SendTransactionParams {
  to: string;
  value: string; // Em wei (1 ETH = 10^18 wei)
  data?: string;
}

const CHAIN_NAMES: { [key: string]: string } = {
  '0x1': 'Ethereum Mainnet',
  '0x89': 'Polygon',
  '0x2105': 'Base',
  '0xaa36a7': 'Sepolia Testnet',
  '0x13881': 'Mumbai Testnet',
};

export function useMetaMask() {
  const [state, setState] = useState<MetaMaskState>({
    isConnected: false,
    address: null,
    balance: null,
    chainId: null,
    networkName: 'Desconhecida',
    isLoading: false,
    isInstalled: false,
  });

  // Verifica se MetaMask está instalado
  const checkMetaMaskInstalled = useCallback(() => {
    return typeof window !== 'undefined' && 
           typeof window.ethereum !== 'undefined' && 
           window.ethereum.isMetaMask === true;
  }, []);

  // Obtém o nome da rede baseado no chainId
  const getNetworkName = useCallback((chainId: string) => {
    return CHAIN_NAMES[chainId] || `Rede ${chainId}`;
  }, []);

  // Obtém o saldo da carteira
  const getBalance = useCallback(async (address: string) => {
    try {
      const balance = await window.ethereum?.request({
        method: 'eth_getBalance',
        params: [address, 'latest'],
      });
      
      // Converte de wei para ETH
      const ethBalance = parseInt(balance, 16) / Math.pow(10, 18);
      return ethBalance.toFixed(4);
    } catch (error) {
      console.error('Erro ao obter saldo:', error);
      return '0.0000';
    }
  }, []);

  // Atualiza informações da conta
  const updateAccountInfo = useCallback(async (accounts: string[], chainId?: string) => {
    if (accounts.length === 0) {
      setState(prev => ({
        ...prev,
        isConnected: false,
        address: null,
        balance: null,
        chainId: null,
        networkName: 'Desconhecida',
      }));
      return;
    }

    const address = accounts[0];
    const currentChainId = chainId || window.ethereum?.chainId || null;
    const balance = await getBalance(address);
    const networkName = currentChainId ? getNetworkName(currentChainId) : 'Desconhecida';

    setState(prev => ({
      ...prev,
      isConnected: true,
      address,
      balance,
      chainId: currentChainId,
      networkName,
    }));
  }, [getBalance, getNetworkName]);

  // Conecta à MetaMask
  const connect = useCallback(async () => {
    if (!checkMetaMaskInstalled()) {
      toast({
        title: "MetaMask não encontrado",
        description: "Por favor, instale a extensão MetaMask para continuar.",
        variant: "destructive",
      });
      window.open('https://metamask.io/download/', '_blank');
      return;
    }

    setState(prev => ({ ...prev, isLoading: true }));

    try {
      const accounts = await window.ethereum!.request({
        method: 'eth_requestAccounts',
      });

      const chainId = await window.ethereum!.request({
        method: 'eth_chainId',
      });

      await updateAccountInfo(accounts, chainId);

      toast({
        title: "Carteira conectada!",
        description: `Conectado ao endereço ${accounts[0].slice(0, 6)}...${accounts[0].slice(-4)}`,
      });
    } catch (error: any) {
      console.error('Erro ao conectar:', error);
      
      if (error.code === 4001) {
        toast({
          title: "Conexão cancelada",
          description: "Você cancelou a conexão com MetaMask.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Erro na conexão",
          description: "Não foi possível conectar à MetaMask. Tente novamente.",
          variant: "destructive",
        });
      }
    } finally {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, [checkMetaMaskInstalled, updateAccountInfo]);

  // Desconecta da MetaMask
  const disconnect = useCallback(() => {
    setState(prev => ({
      ...prev,
      isConnected: false,
      address: null,
      balance: null,
      chainId: null,
      networkName: 'Desconhecida',
    }));

    toast({
      title: "Carteira desconectada",
      description: "Sua carteira MetaMask foi desconectada.",
    });
  }, []);

  // Envia transação ETH
  const sendTransaction = useCallback(async (params: SendTransactionParams) => {
    if (!state.isConnected || !state.address) {
      toast({
        title: "Carteira não conectada",
        description: "Conecte sua carteira MetaMask primeiro.",
        variant: "destructive",
      });
      return null;
    }

    try {
      const transactionHash = await window.ethereum!.request({
        method: 'eth_sendTransaction',
        params: [{
          from: state.address,
          to: params.to,
          value: params.value,
          data: params.data || '0x',
        }],
      });

      toast({
        title: "Transação enviada!",
        description: `Hash: ${transactionHash.slice(0, 10)}...${transactionHash.slice(-8)}`,
      });

      // Atualiza o saldo após a transação
      setTimeout(async () => {
        if (state.address) {
          const newBalance = await getBalance(state.address);
          setState(prev => ({ ...prev, balance: newBalance }));
        }
      }, 2000);

      return transactionHash;
    } catch (error: any) {
      console.error('Erro ao enviar transação:', error);
      
      if (error.code === 4001) {
        toast({
          title: "Transação cancelada",
          description: "Você cancelou a transação.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Erro na transação",
          description: error.message || "Não foi possível enviar a transação.",
          variant: "destructive",
        });
      }
      return null;
    }
  }, [state.isConnected, state.address, getBalance]);

  // Troca de rede
  const switchNetwork = useCallback(async (chainId: string) => {
    if (!checkMetaMaskInstalled()) return;

    try {
      await window.ethereum!.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId }],
      });
    } catch (error: any) {
      console.error('Erro ao trocar rede:', error);
      toast({
        title: "Erro ao trocar rede",
        description: "Não foi possível trocar para a rede solicitada.",
        variant: "destructive",
      });
    }
  }, [checkMetaMaskInstalled]);

  // Event listeners para mudanças de conta e rede
  useEffect(() => {
    if (!checkMetaMaskInstalled()) {
      setState(prev => ({ ...prev, isInstalled: false }));
      return;
    }

    setState(prev => ({ ...prev, isInstalled: true }));

    const handleAccountsChanged = (accounts: string[]) => {
      updateAccountInfo(accounts);
    };

    const handleChainChanged = (chainId: string) => {
      setState(prev => ({
        ...prev,
        chainId,
        networkName: getNetworkName(chainId),
      }));
      
      // Atualiza o saldo para a nova rede
      setState(currentState => {
        if (currentState.address) {
          getBalance(currentState.address).then(balance => {
            setState(prev => ({ ...prev, balance }));
          });
        }
        return {
          ...currentState,
          chainId,
          networkName: getNetworkName(chainId),
        };
      });
    };

    // Adiciona listeners
    window.ethereum?.on('accountsChanged', handleAccountsChanged);
    window.ethereum?.on('chainChanged', handleChainChanged);

    // Verifica se já está conectado
    window.ethereum?.request({ method: 'eth_accounts' })
      .then(async (accounts: string[]) => {
        if (accounts.length > 0) {
          const chainId = await window.ethereum!.request({ method: 'eth_chainId' });
          updateAccountInfo(accounts, chainId);
        }
      })
      .catch(console.error);

    // Cleanup
    return () => {
      window.ethereum?.removeListener('accountsChanged', handleAccountsChanged);
      window.ethereum?.removeListener('chainChanged', handleChainChanged);
    };
  }, [checkMetaMaskInstalled, updateAccountInfo, getNetworkName, getBalance]);

  return {
    ...state,
    connect,
    disconnect,
    sendTransaction,
    switchNetwork,
  };
}