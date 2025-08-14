'use client';

import { createConfig, http } from 'wagmi';
import { mainnet, polygon, base, sepolia } from 'wagmi/chains';
import { metaMask, walletConnect, injected } from 'wagmi/connectors';

// Configuração das chains
const chains = [mainnet, polygon, base, sepolia] as const;

// Configuração do WalletConnect (opcional - requer projectId)
const walletConnectProjectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID;

export const wagmiConfig = createConfig({
  chains,
  connectors: [
    metaMask({
      dappMetadata: {
        name: 'BetFlux Core',
        url: window.location.origin,
        iconUrl: `${window.location.origin}/favicon.ico`,
      },
    }),
    injected(),
    ...(walletConnectProjectId 
      ? [walletConnect({ projectId: walletConnectProjectId })]
      : []
    ),
  ],
  transports: {
    [mainnet.id]: http(),
    [polygon.id]: http(),
    [base.id]: http(),
    [sepolia.id]: http(),
  },
});

// Re-export das chains para uso nos componentes
export { mainnet, polygon, base, sepolia };