import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from './useAuth';

export function useWalletQueries() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const invalidateWalletQueries = () => {
    // Invalidate all profile queries to update balance immediately
    queryClient.invalidateQueries({ queryKey: ['profile'] });
    
    // Invalidate specific user profile if logged in
    if (user) {
      queryClient.invalidateQueries({ queryKey: ['profile', user.id] });
    }
    
    // Invalidate wallet transactions
    queryClient.invalidateQueries({ queryKey: ['recentTransactions'] });
    queryClient.invalidateQueries({ queryKey: ['adminTransactions'] });
    
    // Invalidate user positions (portfolio)
    queryClient.invalidateQueries({ queryKey: ['userPositions'] });
  };

  const updateProfileBalance = (userId: string, newBalance: number) => {
    // Immediately update the cache with new balance
    queryClient.setQueryData(['profile', userId], (oldData: any) => {
      if (oldData) {
        return { ...oldData, wallet_balance: newBalance };
      }
      return oldData;
    });
  };

  return {
    invalidateWalletQueries,
    updateProfileBalance,
  };
}