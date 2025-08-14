import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useEffect, useState } from 'react';

export function useAdminCheck() {
  const { user, loading: authLoading } = useAuth();

  const { data: userRoles, isLoading: rolesLoading } = useQuery({
    queryKey: ['userRoles', user?.id],
    queryFn: async () => {
      if (!user?.id) {
        return [];
      }
      
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);
      
      if (error) {
        console.error('Error fetching user roles:', error);
        return [];
      }
      
      return data || [];
    },
    enabled: !!user?.id && !authLoading,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  // Determine admin status based on database roles only
  const hasAdminRole = Array.isArray(userRoles) && userRoles.some(role => role.role === 'admin');
  
  // Only use database roles for admin access
  const isAdmin = hasAdminRole;

  return {
    isAdmin,
    isLoading: rolesLoading || authLoading,
    userRoles
  };
}