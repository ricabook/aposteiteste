'use client';

import { MetaMaskTransactionExample } from '@/components/MetaMaskTransactionExample';
import { WagmiTransactionExample } from '@/components/WagmiTransactionExample';

const MetaMaskDemo = () => {
  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold">Demonstração MetaMask</h1>
        <p className="text-muted-foreground mt-2">
          Teste as duas implementações de integração com MetaMask
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <MetaMaskTransactionExample />
        <WagmiTransactionExample />
      </div>

      <div className="text-center text-sm text-muted-foreground">
        <p>
          Use a rede de teste (Sepolia) para testar sem custos reais.
          <br />
          Ambas as implementações suportam desktop e mobile.
        </p>
      </div>
    </div>
  );
};

export default MetaMaskDemo;