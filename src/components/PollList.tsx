import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { subDays } from 'date-fns';

import CategoryTabs from './CategoryTabs';
import PolymarketCard from './PolymarketCard';
import BannerList from './BannerList';

interface PollListProps {
  searchQuery?: string;
  onSearch?: (query: string) => void;
}

const PollList = ({ searchQuery = '', onSearch }: PollListProps) => {

  // Fetch polls with betting volume data
  const { data: polls = [], isLoading, refetch } = useQuery({
    queryKey: ['polls'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('polls')
        .select(`
          *,
          bets(amount)
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  // Fetch user roles for community filtering
  const { data: userRoles = [] } = useQuery({
    queryKey: ['user-roles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_roles')
        .select('user_id, role');
      
      if (error) throw error;
      return data;
    },
  });

  // Show loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-sm text-muted-foreground mt-2">Carregando enquetes...</p>
        </div>
      </div>
    );
  }

  // Filter polls based on search query
  const filteredPolls = polls.filter(poll =>
    poll.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    poll.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
    poll.option_a.toLowerCase().includes(searchQuery.toLowerCase()) ||
    poll.option_b.toLowerCase().includes(searchQuery.toLowerCase())
  );


  if (filteredPolls.length === 0 && searchQuery) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <p className="text-lg text-muted-foreground">
            Nenhuma enquete encontrada para "{searchQuery}".
          </p>
        </div>
      </div>
    );
  }

  if (polls.length === 0) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <p className="text-lg text-muted-foreground">Nenhuma enquete ativa no momento.</p>
        </div>
      </div>
    );
  }

  const filterPollsByCategory = (category: string) => {
    if (category === 'trending') {
      // Return 50 polls with highest volume (sum of all bets)
      return filteredPolls
        .map(poll => ({
          ...poll,
          totalVolume: poll.bets?.reduce((sum: number, bet: any) => sum + (bet.amount || 0), 0) || 0
        }))
        .sort((a, b) => b.totalVolume - a.totalVolume)
        .slice(0, 50);
    }
    
    if (category === 'new') {
      // Return 50 most recent polls
      return filteredPolls
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 50);
    }
    
    if (category === 'comunidade') {
      // Return polls created by users who have ONLY 'user' role (no additional roles)
      const userOnlyIds = new Set();
      const userIdRoleCounts = new Map();
      
      // Count roles for each user
      userRoles.forEach(ur => {
        const count = userIdRoleCounts.get(ur.user_id) || 0;
        userIdRoleCounts.set(ur.user_id, count + 1);
        
        if (ur.role === 'user') {
          userOnlyIds.add(ur.user_id);
        }
      });
      
      // Keep only users who have exactly 1 role (which must be 'user')
      const pureUserIds = Array.from(userOnlyIds).filter(userId => 
        userIdRoleCounts.get(userId) === 1
      );
      
      const communityPolls = filteredPolls.filter(poll => pureUserIds.includes(poll.created_by));
      
      // Debug logging
      console.log('Pure user IDs (only user role):', pureUserIds);
      console.log('Community polls found:', communityPolls.length);
      console.log('User role counts:', Object.fromEntries(userIdRoleCounts));
      
      return communityPolls;
    }
    
    // Filter by specific category
    return filteredPolls.filter(poll => {
      if (!poll.category) return false;
      return poll.category === category;
    });
  };

  return (
    <div className="space-y-6">
      {/* Mini Banners */}
      <BannerList />
      
      <CategoryTabs onSearch={onSearch}>
        {(category) => {
          const categoryPolls = filterPollsByCategory(category);
          
          if (categoryPolls.length === 0) {
            return (
              <div className="text-center py-12">
                <p className="text-lg text-muted-foreground">
                  Nenhuma enquete encontrada nesta categoria.
                </p>
              </div>
            );
          }
          
          return (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
              {categoryPolls.map((poll) => (
                <PolymarketCard 
                  key={poll.id} 
                  poll={poll}
                />
              ))}
            </div>
          );
        }}
      </CategoryTabs>
    </div>
  );
};

export default PollList;