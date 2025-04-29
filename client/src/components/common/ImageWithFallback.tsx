import React, { useState } from 'react';

// Imagem de placeholder em base64 para garantir que sempre estará disponível
const PLACEHOLDER_IMAGE = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2YwZjBmMCIvPjxnIHRyYW5zZm9ybT0idHJhbnNsYXRlKDEyNSwgNjUpIj48cmVjdCB4PSItMTUiIHk9Ii0xNSIgd2lkdGg9IjgwIiBoZWlnaHQ9IjgwIiByeD0iNSIgZmlsbD0iI2NjY2NjYyIvPjxwYXRoIGQ9Ik0wIDAgTDUwIDUwIE01MCAwIEwwIDUwIiBzdHJva2U9IiNmZmZmZmYiIHN0cm9rZS13aWR0aD0iOCIvPjwvZz48dGV4dCB4PSIxNTAiIHk9IjE0MCIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjE0IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjNzA3MDcwIj5JbWFnZW0gbsOjbyBkaXNwb27DrXZlbDwvdGV4dD48L3N2Zz4=';

interface ImageWithFallbackProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  fallbackSrc?: string;
}

const ImageWithFallback: React.FC<ImageWithFallbackProps> = ({
  src,
  alt,
  fallbackSrc = PLACEHOLDER_IMAGE,
  ...props
}) => {
  const [imgSrc, setImgSrc] = useState(src);
  
  const handleError = () => {
    console.error(`Erro ao carregar imagem: ${src}`);
    setImgSrc(fallbackSrc);
  };
  
  return (
    <img
      src={imgSrc}
      alt={alt}
      onError={handleError}
      {...props}
    />
  );
};

export default ImageWithFallback;