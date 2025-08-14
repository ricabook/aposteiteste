
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

/**
 * Tries to determine if current user is admin.
 * Prefers RPC 'has_role', falls back to false if unavailable.
 */
export function useAdminCheck() {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!user) { setIsAdmin(false); return; }
      try {
        // Attempt RPC if exists
        const { data, error } = await supabase.rpc('has_role', { user_id: user.id, role: 'admin' });
        if (!cancelled) {
          if (error) setIsAdmin(false);
          else setIsAdmin(!!data);
        }
      } catch {
        if (!cancelled) setIsAdmin(false);
      }
    }
    run();
    return () => { cancelled = true as unknown as boolean; };
  }, [user?.id]);

  return { isAdmin };
}
