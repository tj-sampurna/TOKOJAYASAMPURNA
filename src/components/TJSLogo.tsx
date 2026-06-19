import React from 'react';

interface TJSLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export default function TJSLogo({ className = '', size = 'md' }: TJSLogoProps) {
  // Dimensions based on size prop
  const dims = size === 'sm' ? 'h-9 w-9' : size === 'lg' ? 'h-16 w-16' : 'h-11 w-11';
  const logoUrl = 'https://kufswozbhliavxtxgvtv.supabase.co/storage/v1/object/public/Untility/Icon.png';

  return (
    <div 
      className={`${dims} ${className} rounded-xl overflow-hidden select-none hover:scale-105 transition-transform duration-200 shrink-0`}
      title="Toko Jaya Sampurna Logo"
    >
      <img 
        src={logoUrl} 
        alt="Toko Jaya Sampurna Logo" 
        className="w-full h-full object-cover"
        referrerPolicy="no-referrer"
      />
    </div>
  );
}
