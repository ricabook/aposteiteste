import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

export default function OldPollRedirect() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;
    async function go() {
      if (!id) return;
      const { data, error } = await supabase
        .from('polls')
        .select('slug')
        .eq('id', id)
        .maybeSingle();
      if (!active) return;
      if (error || !data?.slug) {
        navigate('/404', { replace: true });
      } else {
        navigate(`/enquete/${data.slug}`, { replace: true });
      }
    }
    go();
    return () => { active = false; };
  }, [id, navigate]);

  return <div className="p-4">Redirecionando…</div>;
}
