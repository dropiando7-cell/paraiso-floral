'use client';

import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';

type SafeImageProps = React.ImgHTMLAttributes<HTMLImageElement> & {
  src: string;
};

export default function SafeImage({ src, alt, className, ...props }: SafeImageProps) {
  const [imgSrc, setImgSrc] = useState(src);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let active = true;
    let objectUrl: string | null = null;

    const convertHeic = async () => {
      const isHeic = src && (src.toLowerCase().endsWith('.heic') || src.toLowerCase().endsWith('.heif'));
      if (isHeic) {
        setIsLoading(true);
        try {
          const res = await fetch(src);
          const blob = await res.blob();
          
          if (!active) return;

          // Dynamically import heic2any
          const heic2any = (await import('heic2any')).default;
          const converted = await heic2any({
            blob,
            toType: 'image/jpeg',
            quality: 0.8
          });

          if (!active) return;

          const finalBlob = Array.isArray(converted) ? converted[0] : converted;
          objectUrl = URL.createObjectURL(finalBlob);
          setImgSrc(objectUrl);
        } catch (err) {
          console.error("Failed to load or convert HEIC image:", err);
          setImgSrc(src); // fallback
        } finally {
          if (active) setIsLoading(false);
        }
      } else {
        setImgSrc(src);
        setIsLoading(false);
      }
    };

    convertHeic();

    return () => {
      active = false;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [src]);

  if (isLoading) {
    return (
      <div 
        className={`flex items-center justify-center bg-slate-50 border border-slate-200 rounded-lg ${className || ''}`}
        style={{ width: props.width || 'inherit', height: props.height || 'inherit', ...props.style }}
      >
        <Loader2 className="w-5 h-5 animate-spin text-indigo-500" />
      </div>
    );
  }

  return <img src={imgSrc} alt={alt} className={className} {...props} />;
}
