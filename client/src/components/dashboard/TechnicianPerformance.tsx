import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { cn, getInitials } from "@/lib/utils";
import { Link } from "wouter";
import { TechnicianPerformance as TechnicianPerformanceType } from "@/types";

interface TechnicianPerformanceProps {
  technicians: TechnicianPerformanceType[];
  isLoading?: boolean;
}

export function TechnicianPerformance({ technicians, isLoading = false }: TechnicianPerformanceProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-medium">Desempenho da Equipe</CardTitle>
        </CardHeader>
        <CardContent>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="mb-4 animate-pulse">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center">
                  <div className="h-8 w-8 bg-gray-200 rounded-full mr-2"></div>
                  <div className="h-4 w-24 bg-gray-200 rounded"></div>
                </div>
                <div className="h-4 w-8 bg-gray-200 rounded"></div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5"></div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader className="pb-2 flex items-center justify-between">
        <CardTitle className="text-lg font-medium">Desempenho da Equipe</CardTitle>
        <Link href="/technicians">
          <a className="text-sm font-medium text-primary hover:text-primary/80">
            Ver detalhes
          </a>
        </Link>
      </CardHeader>
      <CardContent>
        {technicians.map((tech) => (
          <div key={tech.id} className="mb-4">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center">
                <Avatar className="h-8 w-8 mr-2 bg-primary text-white">
                  <AvatarFallback>{getInitials(tech.name)}</AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium">{tech.name}</span>
              </div>
              <span 
                className={cn(
                  "text-sm font-medium",
                  tech.completionRate >= 80 ? "text-success" :
                  tech.completionRate >= 60 ? "text-warning" :
                  "text-destructive"
                )}
              >
                {tech.completionRate}%
              </span>
            </div>
            <Progress 
              value={tech.completionRate} 
              className={cn(
                "h-2 w-full",
                tech.completionRate >= 80 ? "bg-gray-200" :
                tech.completionRate >= 60 ? "bg-gray-200" :
                "bg-gray-200"
              )}
              indicatorClassName={cn(
                tech.completionRate >= 80 ? "bg-success" :
                tech.completionRate >= 60 ? "bg-warning" :
                "bg-destructive"
              )}
            />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
