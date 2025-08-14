import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

export default function RedirectPollById() {
  const { id } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      if (!id) return;
      const { data, error } = await supabase
        .from('polls')
        .select('slug')
        .eq('id', id)
        .maybeSingle();
      if (data?.slug) {
        navigate(`/poll/${data.slug}`, { replace: true });
      } else {
        navigate('/not-found', { replace: true });
      }
    })();
  }, [id, navigate]);

  return null;
}
