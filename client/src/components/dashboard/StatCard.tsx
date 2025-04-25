import React from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  colorClass: string;
}

export function StatCard({ title, value, icon, colorClass }: StatCardProps) {
  return (
    <Card className="bg-white p-5">
      <div className="flex items-center">
        <div className={cn("flex-shrink-0 rounded-lg p-3", colorClass)}>
          {icon}
        </div>
        <div className="ml-4">
          <h2 className="text-sm font-medium text-gray-500">{title}</h2>
          <p className="text-xl font-bold">{value}</p>
        </div>
      </div>
    </Card>
  );
}
