import React from "react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeader({ title, description, actions, className }: PageHeaderProps) {
  return (
    <div className={cn("mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between", className)}>
      <div>
        <h1 className="text-2xl font-bold text-gray-800">{title}</h1>
        {description && <p className="text-gray-500">{description}</p>}
      </div>
      {actions && <div className="mt-4 sm:mt-0">{actions}</div>}
    </div>
  );
}
