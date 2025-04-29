import React, { useState, useEffect } from 'react';

interface ImageWithFallbackProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  fallbackSrc?: string;
  alt: string;
}

export function ImageWithFallback({ 
  src, 
  fallbackSrc = '/placeholder-image.svg', 
  alt, 
  className,
  ...rest 
}: ImageWithFallbackProps) {
  // Função para normalizar o caminho da imagem (adicionar /uploads se necessário)
  const normalizePath = (path: string): string => {
    if (!path) return fallbackSrc;
    
    // Se já começar com /uploads, não precisamos adicionar
    if (path.startsWith('/uploads')) return path;
    
    // Se começar apenas com /, precisamos adicionar uploads
    if (path.startsWith('/')) return `/uploads${path}`;
    
    // Se não começar com /, adicionamos /uploads/
    return `/uploads/${path}`;
  };

  const [imgSrc, setImgSrc] = useState(normalizePath(src));
  const [hasError, setHasError] = useState(false);

  // Atualizar o src quando ele mudar nas props
  useEffect(() => {
    if (!hasError) {
      setImgSrc(normalizePath(src));
    }
  }, [src, hasError]);

  const handleError = () => {
    if (!hasError) {
      console.error(`Erro ao carregar imagem: ${src} (caminho normalizado: ${imgSrc})`);
      setImgSrc(fallbackSrc);
      setHasError(true);
    }
  };

  return (
    <img
      src={imgSrc}
      alt={alt}
      className={className}
      onError={handleError}
      {...rest}
    />
  );
}