import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { ServiceListItem, ServiceStatus } from "@/types";
import { apiRequest } from "@/lib/queryClient";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/common/PageHeader";
import { ServiceStatusBadge } from "@/components/common/ServiceStatusBadge";
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
  EuroIcon, 
  FileTextIcon,
  PlusIcon, 
  PrinterIcon, 
  SendIcon 
} from "lucide-react";

export default function Budget() {
  const [_, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [selectedService, setSelectedService] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const [validityDays, setValidityDays] = useState("30");
  const [discount, setDiscount] = useState("0");

  // Filtrar serviços apenas com status "pending" ou "aguardando_aprovacao"
  const { data: services, isLoading } = useQuery<ServiceListItem[]>({
    queryKey: ['/api/services'],
    select: (data) => {
      return data.filter(service => 
        service.status === 'pending' || 
        service.status === 'aguardando_aprovacao'
      );
    }
  });

  const createBudgetMutation = useMutation({
    mutationFn: async (data: { 
      service_id: number; 
      note: string; 
      validity_days: number;
      discount: number;
    }) => {
      // Simular criação de orçamento - na implementação real, isso chamaria a API
      // const response = await apiRequest('POST', '/api/budgets', data);
      // return response.json();
      
      // Por enquanto, apenas simulamos sucesso após um pequeno delay
      return new Promise(resolve => {
        setTimeout(() => {
          resolve({
            id: Math.floor(Math.random() * 10000),
            service_id: data.service_id,
            created_at: new Date().toISOString(),
            status: 'created'
          });
        }, 1000);
      });
    },
    onSuccess: () => {
      // Invalidar cache para atualizar a lista
      queryClient.invalidateQueries({ queryKey: ['/api/services'] });
      
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

  const handlePrintBudget = (serviceId: number) => {
    toast({
      title: "Função em desenvolvimento",
      description: "A impressão de orçamentos será implementada em breve.",
    });
  };

  const handleSendBudget = (serviceId: number) => {
    toast({
      title: "Função em desenvolvimento",
      description: "O envio de orçamentos por e-mail será implementado em breve.",
    });
  };

  if (isLoading) {
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
        description="Gerencie os orçamentos de serviços"
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
                  <Label htmlFor="service">Serviço</Label>
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
            <CardTitle>Orçamentos Recentes</CardTitle>
            <CardDescription>
              Serviços pendentes e aguardando aprovação
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Veículo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {services && services.length > 0 ? (
                  services.map((service) => (
                    <TableRow key={service.id}>
                      <TableCell className="font-medium">{service.id}</TableCell>
                      <TableCell>{service.client.name}</TableCell>
                      <TableCell>
                        {service.vehicle.make} {service.vehicle.model} {service.vehicle.license_plate ? `(${service.vehicle.license_plate})` : ""}
                      </TableCell>
                      <TableCell>
                        <ServiceStatusBadge status={service.status} />
                      </TableCell>
                      <TableCell>{formatCurrency(service.total || service.price || 0)}</TableCell>
                      <TableCell>{formatDate(service.created_at)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button 
                            variant="outline" 
                            size="icon"
                            onClick={() => setLocation(`/services/${service.id}`)}
                            title="Ver detalhes"
                          >
                            <FileTextIcon className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="icon"
                            onClick={() => handlePrintBudget(service.id)}
                            title="Imprimir orçamento"
                          >
                            <PrinterIcon className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="icon"
                            onClick={() => handleSendBudget(service.id)}
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
                    <TableCell colSpan={7} className="text-center py-6 text-gray-500 italic">
                      Nenhum serviço pendente ou aguardando aprovação foi encontrado.
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
              <CardTitle className="text-lg">Orçamentos Pendentes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <span className="text-3xl font-bold">{services?.filter(s => s.status === 'pending').length || 0}</span>
                <div className="p-2 bg-yellow-100 rounded-full">
                  <FileTextIcon className="h-6 w-6 text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Aguardando Aprovação</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <span className="text-3xl font-bold">{services?.filter(s => s.status === 'aguardando_aprovacao').length || 0}</span>
                <div className="p-2 bg-blue-100 rounded-full">
                  <FileTextIcon className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Valor Pendente</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <span className="text-3xl font-bold">
                  {formatCurrency(
                    services
                      ?.filter(s => s.status === 'pending')
                      .reduce((acc, service) => acc + (service.total || service.price || 0), 0) || 0
                  )}
                </span>
                <div className="p-2 bg-green-100 rounded-full">
                  <EuroIcon className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Valor em Aprovação</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <span className="text-3xl font-bold">
                  {formatCurrency(
                    services
                      ?.filter(s => s.status === 'aguardando_aprovacao')
                      .reduce((acc, service) => acc + (service.total || service.price || 0), 0) || 0
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