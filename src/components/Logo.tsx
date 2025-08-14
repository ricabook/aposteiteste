import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

const Logo = () => {
  const { theme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="h-8 w-32 bg-muted animate-pulse rounded" />;
  }

  const isDark = resolvedTheme === 'dark';

  return (
    <img 
      src={isDark ? "/lovable-uploads/c96469dc-1298-4e77-a4a5-97f2c2129246.png" : "/lovable-uploads/83ec1a0b-a9e5-459e-8795-5346e263b8a6.png"}
      alt="Apostei"
      className="h-8 w-auto object-contain"
      loading="eager"
      decoding="async"
    />
  );
};

export default Logo;