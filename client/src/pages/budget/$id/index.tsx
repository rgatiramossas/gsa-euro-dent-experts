import React, { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Loader2, ArrowLeft, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import NewBudgetForm from "@/components/NewBudgetForm";

interface ViewBudgetPageProps {
  id: string;
}

const ViewBudgetPage: React.FC<ViewBudgetPageProps> = ({ id }) => {
  const { toast } = useToast();
  const [_, navigate] = useLocation();

  // Fetch budget data
  const { data: budget, isLoading: isLoadingBudget, error: budgetError } = useQuery({
    queryKey: [`/api/budgets/${id}`],
    queryFn: async () => {
      const response = await fetch(`/api/budgets/${id}`);
      if (!response.ok) {
        throw new Error("Falha ao carregar orçamento");
      }
      return response.json();
    },
  });

  // Mostrar tela de carregamento
  if (isLoadingBudget) {
    return (
      <div className="container mx-auto p-4 sm:p-6 flex justify-center items-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Carregando orçamento...</span>
      </div>
    );
  }

  // Mostrar tela de erro
  if (budgetError) {
    return (
      <div className="container mx-auto p-4 sm:p-6">
        <Card className="border-red-200">
          <CardHeader>
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
              <CardTitle>Erro ao Carregar Orçamento</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p>Não foi possível carregar os dados do orçamento. Verifique se o ID está correto.</p>
            <Button 
              onClick={() => navigate("/budgets")} 
              className="mt-4"
            >
              Voltar para Orçamentos
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 sm:p-6">
      <Card>
        <CardHeader>
          <div className="flex items-center mb-2">
            <Button 
              variant="ghost" 
              className="mr-2 p-0 h-8 w-8" 
              onClick={() => navigate("/budgets")}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <CardTitle className="text-2xl">Visualizar Orçamento</CardTitle>
          </div>
          <CardDescription>
            Detalhes do orçamento
          </CardDescription>
        </CardHeader>
        <CardContent>
          {budget && (
            <NewBudgetForm 
              initialData={budget} 
              readOnly={true} 
              onSuccess={() => {}}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ViewBudgetPage;