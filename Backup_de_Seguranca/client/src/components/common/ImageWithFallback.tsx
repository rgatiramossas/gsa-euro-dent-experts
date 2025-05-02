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
    if (path.startsWith('/')) {
      // Extrair o nome do arquivo e o diretório original
      const pathParts = path.split('/');
      const fileName = pathParts[pathParts.length - 1];
      const originalDir = pathParts[pathParts.length - 2];
      
      // Verificar se é uma imagem de orçamento que pode estar em diretório diferente
      if (fileName.includes('-') && path.includes('/service/') && path.endsWith('.png')) {
        // Tentar usar o path original primeiro e, se falhar, o componente tentará outras opções
        console.log(`Caminho de imagem normalizado: /uploads${path}`);
        return `/uploads${path}`;
      }
      
      return `/uploads${path}`;
    }
    
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
      
      // Verificar se é uma imagem de serviço que pode estar em outro diretório
      if (imgSrc.includes('/uploads/service/') && imgSrc.includes('-') && imgSrc.endsWith('.png')) {
        // Extrair o nome do arquivo
        const fileName = imgSrc.split('/').pop();
        
        // Tentar diretório "before"
        const beforePath = `/uploads/before/${fileName}`;
        console.log(`Tentando caminho alternativo: ${beforePath}`);
        setImgSrc(beforePath);
        
        // Não marcar como erro ainda, pois estamos tentando um caminho alternativo
        return;
      } else if (imgSrc.includes('/uploads/before/') && imgSrc.includes('-') && imgSrc.endsWith('.png')) {
        // Se já tentamos o diretório "before", tentar o diretório "after"
        const fileName = imgSrc.split('/').pop();
        const afterPath = `/uploads/after/${fileName}`;
        console.log(`Tentando caminho alternativo: ${afterPath}`);
        setImgSrc(afterPath);
        return;
      }
      
      // Se chegou aqui, nenhuma alternativa funcionou ou não é uma imagem de serviço
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