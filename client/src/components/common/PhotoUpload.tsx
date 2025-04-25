import React, { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

interface PhotoUploadProps {
  label: string;
  onChange: (files: FileList) => void;
  className?: string;
  accept?: string;
  multiple?: boolean;
  preview?: string;
  maxFiles?: number;
}

export function PhotoUpload({
  label,
  onChange,
  className,
  accept = "image/*",
  multiple = false,
  preview,
  maxFiles = 5
}: PhotoUploadProps) {
  const [dragActive, setDragActive] = useState(false);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  
  // Limpar URLs de pré-visualização quando o componente for desmontado
  useEffect(() => {
    return () => {
      previewUrls.forEach(url => URL.revokeObjectURL(url));
    };
  }, [previewUrls]);
  
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };
  
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
    }
  };
  
  const handleFiles = (files: FileList) => {
    // Verificar se o número de arquivos excede o limite
    if (multiple && files.length > maxFiles) {
      toast({
        title: "Limite de arquivos excedido",
        description: `Você pode selecionar no máximo ${maxFiles} fotos.`,
        variant: "destructive",
      });
      return;
    }
    
    setSelectedFiles(files);
    onChange(files);
    
    // Limpar previews antigos
    previewUrls.forEach(url => URL.revokeObjectURL(url));
    
    // Criar URLs de preview para cada arquivo
    const newPreviewUrls: string[] = [];
    
    if (multiple) {
      // Gerar previews para todos os arquivos no caso de múltiplos arquivos
      for (let i = 0; i < files.length; i++) {
        newPreviewUrls.push(URL.createObjectURL(files[i]));
      }
    } else if (files[0]) {
      // Apenas um preview para um único arquivo
      newPreviewUrls.push(URL.createObjectURL(files[0]));
    }
    
    setPreviewUrls(newPreviewUrls);
  };
  
  return (
    <div className={className}>
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={cn(
          "mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-lg",
          dragActive 
            ? "border-primary bg-primary/5" 
            : "border-gray-300 hover:border-primary/50",
          previewUrls.length > 0 ? "pb-0" : "pb-6"
        )}
      >
        <div className="space-y-1 text-center">
          {previewUrls.length > 0 ? (
            <div className="mb-4 grid grid-cols-3 gap-2">
              {previewUrls.map((url, index) => (
                <img 
                  key={index}
                  src={url} 
                  alt={`Foto ${index + 1}`} 
                  className="h-24 w-full object-cover rounded"
                />
              ))}
            </div>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          )}
          <div className="flex text-sm text-gray-600 justify-center">
            <label htmlFor={`file-upload-${label}`} className="relative cursor-pointer bg-white rounded-md font-medium text-primary hover:text-primary/80 focus-within:outline-none">
              <span className="px-2 py-1 border border-primary rounded">Carregar {multiple ? "fotos" : "foto"}</span>
              <input
                id={`file-upload-${label}`}
                name={`file-upload-${label}`}
                type="file"
                className="sr-only"
                accept={accept}
                multiple={multiple}
                onChange={handleChange}
              />
            </label>
            <p className="pl-1 self-center">ou arraste e solte</p>
          </div>
          <p className="text-xs text-gray-500">PNG, JPG, JPEG até 5MB{multiple ? ` (máximo ${maxFiles} arquivos)` : ""}</p>
        </div>
      </div>
    </div>
  );
}
