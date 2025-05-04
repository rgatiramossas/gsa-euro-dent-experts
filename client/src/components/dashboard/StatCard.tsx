import React from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Link } from "wouter";
import { useTranslation } from "react-i18next";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  colorClass: string;
  actionUrl?: string;
  actionLabel?: string;
}

export function StatCard({ title, value, icon, colorClass, actionUrl, actionLabel }: StatCardProps) {
  // Adicionar log para depuração
  React.useEffect(() => {
    console.log(`StatCard "${title}" recebeu valor:`, value);
    console.log(`Tipo do valor:`, typeof value);
  }, [title, value]);
  
  return (
    <Card className="bg-white p-5 relative">
      <div className="flex items-center">
        <div className={cn("flex-shrink-0 rounded-lg p-3", colorClass)}>
          {icon}
        </div>
        <div className="ml-4">
          <h2 className="text-sm font-medium text-gray-500">{title}</h2>
          <p className="text-xl font-bold">{value}</p>
        </div>
      </div>
      
      {actionUrl && actionLabel && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <Link 
            href={actionUrl} 
            className="text-xs font-medium text-primary hover:text-primary/80 flex items-center"
          >
            {actionLabel}
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      )}
    </Card>
  );
}
