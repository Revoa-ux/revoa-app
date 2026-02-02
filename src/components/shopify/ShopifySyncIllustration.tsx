import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';

interface ShopifySyncIllustrationProps {
  maxWidth?: string;
  className?: string;
}

const ShopifySyncIllustration: React.FC<ShopifySyncIllustrationProps> = ({
  maxWidth = '500px',
  className = '',
}) => {
  const { effectiveTheme } = useTheme();

  const lightModeImage = 'https://iipaykvimkbbnoobtpzz.supabase.co/storage/v1/object/public/public-bucket/REVOA%20Sync%20to%20Shopify%20Image%20Light%20Mode.png';
  const darkModeImage = 'https://iipaykvimkbbnoobtpzz.supabase.co/storage/v1/object/public/public-bucket/REVOA%20Sync%20to%20Shopify%20Image%20Dark%20Mode.png';

  return (
    <div
      className={`relative w-full flex items-center justify-center ${className}`}
      style={{ maxWidth }}
    >
      <img
        src={effectiveTheme === 'dark' ? darkModeImage : lightModeImage}
        alt="Revoa syncs with your Shopify store"
        className="w-full h-auto transition-opacity duration-300"
        style={{ maxWidth: '100%' }}
      />
    </div>
  );
};

export default ShopifySyncIllustration;
