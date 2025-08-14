import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import BannerCard from './BannerCard';

const BannerList = () => {
  const { data: banners = [] } = useQuery({
    queryKey: ['banners'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('banners')
        .select('*')
        .eq('is_active', true)
        .order('position', { ascending: true });
      
      if (error) throw error;
      return data;
    },
  });

  if (banners.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
      {banners.map((banner) => (
        <BannerCard key={banner.id} banner={banner} />
      ))}
    </div>
  );
};

export default BannerList;