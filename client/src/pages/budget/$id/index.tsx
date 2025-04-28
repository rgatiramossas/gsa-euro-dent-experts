import React, { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Loader2, ArrowLeft, AlertCircle, Edit, FileText } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import DamageMap from "@/components/DamageMap";

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

  // Fetch client data
  const { data: clients } = useQuery({
    queryKey: ["/api/clients"],
    enabled: !!budget,
  });

  // Function to get client name from ID
  const getClientName = (clientId: number) => {
    if (!clients) return "Carregando...";
    const client = clients.find((c: any) => c.id === clientId);
    return client ? client.name : "Cliente não encontrado";
  };

  // Format date
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return format(date, "dd/MM/yyyy", { locale: ptBR });
    } catch (e) {
      return dateString;
    }
  };

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
            <CardTitle className="text-2xl">Visualizar Orçamento #{id}</CardTitle>
          </div>
          <CardDescription>
            Detalhes do orçamento
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {budget && (
            <>
              {/* Informações principais */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Cliente</Label>
                  <Input 
                    value={getClientName(budget.client_id)} 
                    readOnly 
                    className="bg-gray-50"
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium">Data</Label>
                  <Input 
                    value={formatDate(budget.date)} 
                    readOnly 
                    className="bg-gray-50"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label className="text-sm font-medium">Veículo</Label>
                  <Input 
                    value={budget.vehicle_info || "Não informado"} 
                    readOnly 
                    className="bg-gray-50"
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium">Placa</Label>
                  <Input 
                    value={budget.plate || "Não informada"} 
                    readOnly 
                    className="bg-gray-50"
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium">Chassi</Label>
                  <Input 
                    value={budget.chassis_number || "Não informado"} 
                    readOnly 
                    className="bg-gray-50"
                  />
                </div>
              </div>
              
              <Separator />
              
              {/* Mapa de danos */}
              <DamageMap 
                damagedParts={budget.damaged_parts} 
                readOnly={true} 
              />
              
              <Separator />
              
              {/* Valores e observações */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium">Observações</Label>
                    <Textarea 
                      value={budget.note || "Sem observações"} 
                      readOnly 
                      className="bg-gray-50 h-24"
                    />
                  </div>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-md">
                  <h3 className="font-medium text-lg mb-4">Resumo do Orçamento</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">Total AW:</span>
                      <span className="font-medium">{budget.total_aw?.toFixed(2) || '0.00'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Total (EUR):</span>
                      <span className="font-medium">{budget.total_value?.toFixed(2) || '0.00'} €</span>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </CardContent>
        
        <CardFooter className="flex justify-between">
          <Button 
            variant="outline" 
            onClick={() => navigate("/budgets")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <div className="space-x-2">
            <Button 
              variant="outline" 
              onClick={() => {
                // Duplicar um orçamento (opcional para implantação futura)
                toast({
                  title: "Função em desenvolvimento",
                  description: "A função de gerar PDF será implementada em breve.",
                });
              }}
            >
              <FileText className="h-4 w-4 mr-2" />
              PDF
            </Button>
            <Button 
              onClick={() => navigate(`/budgets/${id}/edit`)}
            >
              <Edit className="h-4 w-4 mr-2" />
              Editar
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
};

export default ViewBudgetPage;