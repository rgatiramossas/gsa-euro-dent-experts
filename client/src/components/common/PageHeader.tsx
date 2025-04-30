import React from "react";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
  translationPrefix?: string;
}

export function PageHeader({ 
  title, 
  description, 
  actions, 
  className,
  translationPrefix
}: PageHeaderProps) {
  const { t } = useTranslation();

  // Se houver um prefixo de tradução, usa o t() para traduzir
  const displayTitle = translationPrefix 
    ? t(`${translationPrefix}.title`) 
    : title;
    
  const displayDescription = description && translationPrefix
    ? t(`${translationPrefix}.description`, description)
    : description;

  return (
    <div className={cn("mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between", className)}>
      <div>
        <h1 className="text-2xl font-bold text-gray-800">{displayTitle}</h1>
        {displayDescription && <p className="text-gray-500">{displayDescription}</p>}
      </div>
      {actions && <div className="mt-4 sm:mt-0">{actions}</div>}
    </div>
  );
}
