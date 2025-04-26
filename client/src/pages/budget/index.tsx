import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { ServiceListItem, ServiceStatus } from "@/types";
import { apiRequest } from "@/lib/queryClient";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/common/PageHeader";
import { Badge } from "@/components/ui/badge";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  CheckIcon,
  ClockIcon,
  EuroIcon, 
  FileTextIcon,
  PlusIcon, 
  PrinterIcon, 
  SendIcon,
  TimerIcon 
} from "lucide-react";

// Tipos para orçamentos
interface Budget {
  id: number;
  service_id: number;
  client_name: string;
  vehicle_info: string;
  total_value: number;
  discount: number;
  final_value: number;
  status: 'draft' | 'sent' | 'approved' | 'rejected';
  validity_days: number;
  expiry_date: string;
  created_at: string;
  note?: string;
}

export default function Budget() {
  const [_, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [selectedService, setSelectedService] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const [validityDays, setValidityDays] = useState("30");
  const [discount, setDiscount] = useState("0");

  // Serviços disponíveis para criar orçamentos
  const { data: services, isLoading: servicesLoading } = useQuery<ServiceListItem[]>({
    queryKey: ['/api/services'],
    select: (data) => {
      return data.filter(service => 
        service.status === 'pending' || 
        service.status === 'aguardando_aprovacao'
      );
    }
  });

  // Simulação de dados de orçamentos (normalmente viriam de uma API)
  const { data: budgets, isLoading: budgetsLoading } = useQuery<Budget[]>({
    queryKey: ['/api/budgets'],
    queryFn: async () => {
      // Em uma implementação real, faríamos uma chamada à API
      // const response = await apiRequest('GET', '/api/budgets');
      // return response.json();
      
      // Simulando dados de orçamentos para demonstração
      return [
        {
          id: 1001,
          service_id: 2,
          client_name: "Alexsandro Figueiredo",
          vehicle_info: "BMW X5 2022 (ABC-1234)",
          total_value: 350.00,
          discount: 10,
          final_value: 315.00,
          status: 'sent',
          validity_days: 30,
          expiry_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          created_at: new Date().toISOString(),
          note: "Orçamento para reparo de amassado na porta dianteira"
        },
        {
          id: 1002,
          service_id: 3,
          client_name: "Maria Silva",
          vehicle_info: "Mercedes C180 2021 (XYZ-4567)",
          total_value: 420.00,
          discount: 0,
          final_value: 420.00,
          status: 'draft',
          validity_days: 15,
          expiry_date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
          created_at: new Date().toISOString()
        },
        {
          id: 1003,
          service_id: 4,
          client_name: "João Pereira",
          vehicle_info: "Audi A3 2020 (DEF-7890)",
          total_value: 280.00,
          discount: 5,
          final_value: 266.00,
          status: 'approved',
          validity_days: 30,
          expiry_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
        }
      ];
    },
  });

  const createBudgetMutation = useMutation({
    mutationFn: async (data: { 
      service_id: number; 
      note: string; 
      validity_days: number;
      discount: number;
    }) => {
      // Em uma implementação real, faríamos uma chamada à API
      // const response = await apiRequest('POST', '/api/budgets', data);
      // return response.json();
      
      // Simulando a criação de um orçamento
      const service = services?.find(s => s.id === data.service_id);
      
      return {
        id: Math.floor(Math.random() * 10000) + 1000,
        service_id: data.service_id,
        client_name: service?.client.name || "Cliente",
        vehicle_info: service ? `${service.vehicle.make} ${service.vehicle.model} ${service.vehicle.year}` : "Veículo",
        total_value: service?.total || service?.price || 0,
        discount: data.discount,
        final_value: (service?.total || service?.price || 0) * (1 - data.discount / 100),
        status: 'draft' as const,
        validity_days: data.validity_days,
        expiry_date: new Date(Date.now() + data.validity_days * 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date().toISOString(),
        note: data.note
      };
    },
    onSuccess: () => {
      // Invalidar cache para atualizar a lista
      queryClient.invalidateQueries({ queryKey: ['/api/budgets'] });
      
      toast({
        title: "Orçamento criado",
        description: "O orçamento foi criado com sucesso",
      });
      
      // Fechar o dialog e limpar o form
      setShowDialog(false);
      setSelectedService(null);
      setNote("");
      setValidityDays("30");
      setDiscount("0");
    },
    onError: (error) => {
      console.error('Erro ao criar orçamento:', error);
      toast({
        title: "Erro ao criar orçamento",
        description: "Ocorreu um erro ao criar o orçamento. Tente novamente.",
        variant: "destructive",
      });
    }
  });

  const handleCreateBudget = () => {
    if (!selectedService) {
      toast({
        title: "Erro ao criar orçamento",
        description: "Selecione um serviço para criar o orçamento.",
        variant: "destructive",
      });
      return;
    }

    createBudgetMutation.mutate({
      service_id: selectedService,
      note: note.trim(),
      validity_days: parseInt(validityDays),
      discount: parseFloat(discount),
    });
  };

  const handlePrintBudget = (budgetId: number) => {
    toast({
      title: "Função em desenvolvimento",
      description: "A impressão de orçamentos será implementada em breve.",
    });
  };

  const handleSendBudget = (budgetId: number) => {
    toast({
      title: "Função em desenvolvimento",
      description: "O envio de orçamentos por e-mail será implementado em breve.",
    });
  };
  
  const handleViewBudget = (budgetId: number) => {
    toast({
      title: "Visualizar orçamento",
      description: `Visualizando detalhes do orçamento #${budgetId}.`,
    });
  };

  // Status do orçamento com cores
  const getStatusBadge = (status: Budget['status']) => {
    switch (status) {
      case 'draft':
        return <Badge variant="outline" className="bg-gray-100">Rascunho</Badge>;
      case 'sent':
        return <Badge variant="outline" className="bg-blue-100 text-blue-800">Enviado</Badge>;
      case 'approved':
        return <Badge variant="outline" className="bg-green-100 text-green-800">Aprovado</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="bg-red-100 text-red-800">Rejeitado</Badge>;
      default:
        return <Badge variant="outline">Desconhecido</Badge>;
    }
  };

  if (budgetsLoading) {
    return (
      <div className="py-6 px-4 sm:px-6 lg:px-8 flex justify-center items-center min-h-[300px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="py-6 px-4 sm:px-6 lg:px-8">
      <PageHeader
        title="Orçamentos"
        description="Gerencie orçamentos para seus clientes"
        actions={
          <Dialog open={showDialog} onOpenChange={setShowDialog}>
            <DialogTrigger asChild>
              <Button>
                <PlusIcon className="h-4 w-4 mr-2" />
                Novo Orçamento
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Criar Novo Orçamento</DialogTitle>
                <DialogDescription>
                  Preencha os detalhes para criar um novo orçamento para o cliente.
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="service">Selecione o Serviço</Label>
                  <Select 
                    value={selectedService?.toString() || ""} 
                    onValueChange={(value) => setSelectedService(parseInt(value))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um serviço" />
                    </SelectTrigger>
                    <SelectContent>
                      {services?.map((service) => (
                        <SelectItem key={service.id} value={service.id.toString()}>
                          {service.client.name} - {service.vehicle.make} {service.vehicle.model} 
                          {service.vehicle.license_plate ? ` (${service.vehicle.license_plate})` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="validity">Validade (dias)</Label>
                    <Input
                      id="validity"
                      type="number"
                      value={validityDays}
                      onChange={(e) => setValidityDays(e.target.value)}
                      min="1"
                      max="90"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="discount">Desconto (%)</Label>
                    <Input
                      id="discount"
                      type="number"
                      value={discount}
                      onChange={(e) => setDiscount(e.target.value)}
                      min="0"
                      max="50"
                      step="0.5"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="note">Observações</Label>
                  <Textarea
                    id="note"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Observações adicionais para o orçamento..."
                    rows={3}
                  />
                </div>
              </div>
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowDialog(false)}>
                  Cancelar
                </Button>
                <Button 
                  onClick={handleCreateBudget} 
                  disabled={createBudgetMutation.isPending || !selectedService}
                >
                  {createBudgetMutation.isPending ? "Criando..." : "Criar Orçamento"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />
      
      <div className="grid gap-6 mt-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Orçamentos</CardTitle>
            <CardDescription>
              Todos os orçamentos criados para clientes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Veículo</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {budgets && budgets.length > 0 ? (
                  budgets.map((budget) => (
                    <TableRow key={budget.id}>
                      <TableCell className="font-medium">{budget.id}</TableCell>
                      <TableCell>{budget.client_name}</TableCell>
                      <TableCell>{budget.vehicle_info}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button 
                            variant="outline" 
                            size="icon"
                            onClick={() => handleViewBudget(budget.id)}
                            title="Ver detalhes"
                          >
                            <FileTextIcon className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="icon"
                            onClick={() => handlePrintBudget(budget.id)}
                            title="Imprimir orçamento"
                          >
                            <PrinterIcon className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="icon"
                            onClick={() => handleSendBudget(budget.id)}
                            title="Enviar por e-mail"
                          >
                            <SendIcon className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-6 text-gray-500 italic">
                      Nenhum orçamento encontrado. Crie um novo orçamento para começar.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Rascunhos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <span className="text-3xl font-bold">{budgets?.filter(b => b.status === 'draft').length || 0}</span>
                <div className="p-2 bg-gray-100 rounded-full">
                  <FileTextIcon className="h-6 w-6 text-gray-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Enviados</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <span className="text-3xl font-bold">{budgets?.filter(b => b.status === 'sent').length || 0}</span>
                <div className="p-2 bg-blue-100 rounded-full">
                  <SendIcon className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Aprovados</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <span className="text-3xl font-bold">{budgets?.filter(b => b.status === 'approved').length || 0}</span>
                <div className="p-2 bg-green-100 rounded-full">
                  <CheckIcon className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Valor Total</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <span className="text-3xl font-bold">
                  {formatCurrency(
                    budgets?.reduce((acc, budget) => acc + budget.final_value, 0) || 0
                  )}
                </span>
                <div className="p-2 bg-purple-100 rounded-full">
                  <EuroIcon className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}