import React, { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

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
  const { t } = useTranslation();

  // Converter string de preview para array se necessário
  useEffect(() => {
    if (preview) {
      // Limpar previews antigos
      previewUrls.forEach(url => {
        if (url.startsWith('blob:')) {
          URL.revokeObjectURL(url);
        }
      });

      // Se o preview for uma string separada por vírgulas, dividi-la
      const urls = preview.includes(',') ? preview.split(',') : [preview];
      setPreviewUrls(urls);
    } else {
      setPreviewUrls([]);
    }
  }, [preview]);

  // Limpar URLs de pré-visualização quando o componente for desmontado
  useEffect(() => {
    return () => {
      previewUrls.forEach(url => {
        if (url.startsWith('blob:')) {
          URL.revokeObjectURL(url);
        }
      });
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
    try {
      // Validar os arquivos selecionados
      const validFiles: File[] = [];
      const invalidFiles: string[] = [];

      // Verificar se os arquivos são de tipos válidos (imagens)
      Array.from(files).forEach(file => {
        if (file.type.startsWith('image/')) {
          // Verificar tamanho (máximo 5MB)
          if (file.size <= 5 * 1024 * 1024) {
            validFiles.push(file);
          } else {
            invalidFiles.push(`${file.name} (tamanho excede 5MB)`);
          }
        } else {
          invalidFiles.push(`${file.name} (tipo inválido: ${file.type || 'desconhecido'})`);
        }
      });

      // Alertar sobre arquivos inválidos, se houver
      if (invalidFiles.length > 0) {
        toast({
          title: t("photos.errors.invalidFiles", "Alguns arquivos não foram aceitos"),
          description: `${t("photos.errors.invalidFilesList", "Arquivos inválidos")}: ${invalidFiles.join(', ')}. ${t("photos.errors.onlyImagesAllowed", "Apenas imagens até 5MB são permitidas")}.`,
          variant: "destructive",
        });

        // Se não tiver nenhum arquivo válido, saia da função
        if (validFiles.length === 0) return;
      }

      // Se o componente já tem arquivos selecionados, verificamos a soma total
      const existingCount = selectedFiles ? selectedFiles.length : 0;
      const newCount = validFiles.length;
      const totalCount = existingCount + newCount;

      // Verificar se o número total de arquivos excede o limite
      if (multiple && totalCount > maxFiles) {
        toast({
          title: t("photos.errors.fileLimit", "Limite de arquivos excedido"),
          description: t("photos.errors.fileLimitDescription", "Você pode selecionar no máximo {{maxFiles}} fotos no total. Você já selecionou {{existingCount}} foto(s).", {
            maxFiles,
            existingCount
          }),
          variant: "destructive",
        });
        return;
      }

      // Criar um novo DataTransfer para combinar os arquivos
      const dataTransfer = new DataTransfer();

      // Se estivermos combinando arquivos existentes com novos arquivos
      if (selectedFiles && existingCount > 0) {
        // Adicionar arquivos existentes
        Array.from(selectedFiles).forEach(file => {
          dataTransfer.items.add(file);
        });
      }

      // Adicionar novos arquivos válidos
      validFiles.forEach(file => {
        dataTransfer.items.add(file);
      });

      // Gerar o novo FileList combinado
      const combinedFiles = dataTransfer.files;
      setSelectedFiles(combinedFiles);
      onChange(combinedFiles);

      // Limpar previews antigos
      previewUrls.forEach(url => {
        if (url.startsWith('blob:')) {
          URL.revokeObjectURL(url);
        }
      });

      // Criar URLs de preview para cada arquivo
      const newPreviewUrls: string[] = [];

      if (multiple) {
        // Gerar previews para todos os arquivos no caso de múltiplos arquivos
        for (let i = 0; i < combinedFiles.length; i++) {
          newPreviewUrls.push(URL.createObjectURL(combinedFiles[i]));
        }
      } else if (combinedFiles[0]) {
        // Apenas um preview para um único arquivo
        newPreviewUrls.push(URL.createObjectURL(combinedFiles[0]));
      }

      setPreviewUrls(newPreviewUrls);

      console.log(`${validFiles.length} arquivos válidos processados`);
    } catch (error) {
      console.error("Erro ao processar arquivos:", error);
      toast({
        title: t("photos.errors.processingError", "Erro ao processar arquivos"),
        description: t("photos.errors.processingErrorDescription", "Ocorreu um erro ao processar os arquivos selecionados. Tente novamente."),
        variant: "destructive",
      });
    }
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
            <div className="mb-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
              {previewUrls.map((url, index) => (
                <div key={index} className="relative group aspect-w-4 aspect-h-3">
                  <img 
                    src={url} 
                    alt={`Foto ${index + 1}`} 
                    className="w-full h-24 object-cover rounded"
                  />
                  <span className="absolute bottom-0 right-0 bg-black/70 text-white text-xs px-1 rounded-bl rounded-tr">
                    {index + 1}/{previewUrls.length}
                  </span>
                  <button
                    type="button"
                    className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      const newUrls = [...previewUrls];
                      newUrls.splice(index, 1);
                      previewUrls.forEach(url => URL.revokeObjectURL(url));
                      setPreviewUrls(newUrls);
                      // Simular uma mudança nos arquivos selecionados
                      if (selectedFiles) {
                        const dataTransfer = new DataTransfer();
                        Array.from(selectedFiles).forEach((file, i) => {
                          if (i !== index) {
                            dataTransfer.items.add(file);
                          }
                        });
                        const newFileList = dataTransfer.files;
                        setSelectedFiles(newFileList);
                        onChange(newFileList);
                      }
                    }}
                    title={t("photos.remove", "Remover foto")}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              ))}
              {/* Mostrar slots vazios para completar até o maxFiles */}
              {[...Array(Math.max(0, maxFiles - previewUrls.length))].map((_, index) => (
                <div key={`empty-${index}`} className="h-24 border border-dashed border-gray-300 rounded flex items-center justify-center">
                  <span className="text-gray-400 text-xs">{t("photos.empty", "Vazio")}</span>
                </div>
              ))}
            </div>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          )}
          <div className="flex text-sm text-gray-600 justify-center">
            <label htmlFor={`file-upload-${label}`} className="relative cursor-pointer bg-white rounded-md font-medium text-primary hover:text-primary/80 focus-within:outline-none">
              <span className="px-2 py-1 border border-primary rounded">
                {t("photos.upload", "Carregar")} {multiple ? t("photos.plural", "fotos") : t("photos.singular", "foto")}
              </span>
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
            <p className="pl-1 self-center">{t("photos.dragAndDrop", "ou arraste e solte")}</p>
          </div>
          <p className="text-xs text-gray-500">
            {t("photos.fileTypes", "PNG, JPG, JPEG até 5MB")}
            {multiple ? ` (${t("photos.maxFiles", "máximo")} ${maxFiles} ${t("photos.filesCount", "arquivos")})` : ""}
          </p>
        </div>
      </div>
    </div>
  );
}