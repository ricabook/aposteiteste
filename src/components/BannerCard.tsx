import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface Banner {
  id: string;
  title: string;
  button_text: string;
  button_url?: string;
  background_color: string;
  background_gradient?: string;
  image_url?: string;
  position: number;
  is_active: boolean;
}

interface BannerCardProps {
  banner: Banner;
}

const BannerCard = ({ banner }: BannerCardProps) => {
  const handleClick = () => {
    if (banner.button_url && banner.button_url !== '#') {
      window.open(banner.button_url, '_blank');
    }
  };

  const backgroundStyle = banner.background_gradient 
    ? { background: banner.background_gradient }
    : { backgroundColor: banner.background_color };

  return (
    <Card 
      className="relative overflow-hidden border-0 h-full min-h-[120px] cursor-pointer transition-transform hover:scale-105"
      style={backgroundStyle}
    >
      <div className="relative p-4 h-full flex items-center justify-between text-white">
        {/* Left content */}
        <div className="flex-1 space-y-3">
          <h3 className="text-lg font-bold text-white leading-tight">
            {banner.title}
          </h3>
          <Button 
            variant="secondary"
            size="sm"
            onClick={handleClick}
            className="bg-white/20 text-white border-white/30 hover:bg-white/30 transition-colors"
          >
            {banner.button_text}
          </Button>
        </div>

        {/* Right side - Image */}
        {banner.image_url && (
          <div className="flex-shrink-0 ml-4">
            <img 
              src={banner.image_url} 
              alt={banner.title}
              className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-lg"
            />
          </div>
        )}
      </div>
    </Card>
  );
};

export default BannerCard;