import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Client, Vehicle, User, ServiceType } from "@/types";
import { apiRequest } from "@/lib/queryClient";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/common/PageHeader";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import {
  Table,
  TableBody,
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
  FileTextIcon,
  PlusIcon, 
  PrinterIcon, 
  SendIcon,
  CameraIcon,
  UploadIcon
} from "lucide-react";

// Tipos para orçamento
interface CarPart {
  id: string;
  name: string;
}

interface Budget {
  id: number;
  client_name: string;
  vehicle_info: string;
  date: string;
  damaged_parts?: string[];
  photo_url?: string;
  total_aw?: number;
  total_value?: number;
  created_at: string;
  note?: string;
}

export default function Budget() {
  const [_, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [selectedClient, setSelectedClient] = useState<number | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<number | null>(null);
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState("");
  const [manualVehicleInfo, setManualVehicleInfo] = useState("");
  const [isManualVehicle, setIsManualVehicle] = useState(false);
  const [totalAw, setTotalAw] = useState<number>(0);
  const [totalValue, setTotalValue] = useState<number>(0);
  
  // Estado para os danos do veículo (peças)
  const [damagedParts, setDamagedParts] = useState<Record<string, boolean>>({
    paraLamaEsquerdo: false,
    capo: false,
    paraLamaDireito: false,
    colunaEsquerda: false,
    teto: false, 
    colunaDireita: false,
    portaDianteiraEsquerda: false,
    portaDianteiraDireita: false,
    portaTraseiraEsquerda: false,
    portaMalasSuperior: false,
    portaTraseiraDireita: false,
    lateralEsquerda: false,
    portaMalasInferior: false,
    lateralDireita: false
  });
  
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  // Consultas para clientes e veículos
  const { data: clients, isLoading: clientsLoading } = useQuery<Client[]>({
    queryKey: ['/api/clients'],
  });

  // Buscar veículos quando um cliente for selecionado
  const { data: vehicles, isLoading: vehiclesLoading } = useQuery<Vehicle[]>({
    queryKey: [`/api/clients/${selectedClient}/vehicles`],
    enabled: !!selectedClient, // Só executa se o cliente estiver selecionado
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
          client_name: "Alexsandro Figueiredo",
          vehicle_info: "BMW X5 2022 (ABC-1234)",
          date: "2023-10-15",
          damaged_parts: ["paraLamaEsquerdo", "portaDianteiraEsquerda"],
          total_aw: 2,
          total_value: 350.00,
          created_at: new Date().toISOString(),
          note: "Orçamento para reparo de amassado na porta dianteira"
        },
        {
          id: 1002,
          client_name: "Maria Silva",
          vehicle_info: "Mercedes C180 2021 (XYZ-4567)",
          date: "2023-10-20",
          damaged_parts: ["capo", "paraLamaDireito"],
          total_aw: 3,
          total_value: 420.00,
          created_at: new Date().toISOString(),
          note: ""
        }
      ];
    },
  });

  const createBudgetMutation = useMutation({
    mutationFn: async (data: { 
      client_id?: number;
      vehicle_id?: number;
      date: string;
      damaged_parts: string[];
      photo_url?: string;
      total_aw: number;
      total_value: number;
      note: string;
      vehicle_info?: string;
    }) => {
      // Em uma implementação real, faríamos uma chamada à API
      // const response = await apiRequest('POST', '/api/budgets', data);
      // return response.json();
      
      // Simulando a criação de um orçamento
      let client_name = "Cliente não especificado";
      let vehicle_info = data.vehicle_info || "Veículo não especificado";
      
      if (data.client_id && clients) {
        const client = clients.find(c => c.id === data.client_id);
        if (client) client_name = client.name;
      }
      
      if (data.vehicle_id && vehicles) {
        const vehicle = vehicles.find(v => v.id === data.vehicle_id);
        if (vehicle) {
          vehicle_info = `${vehicle.make} ${vehicle.model} ${vehicle.year}`;
          if (vehicle.license_plate) vehicle_info += ` (${vehicle.license_plate})`;
        }
      }
      
      return {
        id: Math.floor(Math.random() * 10000) + 1000,
        client_name,
        vehicle_info,
        date: data.date,
        damaged_parts: data.damaged_parts,
        photo_url: data.photo_url,
        total_aw: data.total_aw,
        total_value: data.total_value,
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
      setSelectedClient(null);
      setSelectedVehicle(null);
      setNote("");
      setDate(new Date().toISOString().split('T')[0]);
      setIsManualVehicle(false);
      setManualVehicleInfo("");
      setDamagedParts({
        paraLamaEsquerdo: false,
        capo: false,
        paraLamaDireito: false,
        colunaEsquerda: false,
        teto: false, 
        colunaDireita: false,
        portaDianteiraEsquerda: false,
        portaDianteiraDireita: false,
        portaTraseiraEsquerda: false,
        portaMalasSuperior: false,
        portaTraseiraDireita: false,
        lateralEsquerda: false,
        portaMalasInferior: false,
        lateralDireita: false
      });
      setPhotoUrl(null);
      setTotalAw(0);
      setTotalValue(0);
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
    // Validar formulário
    if (!selectedClient && !isManualVehicle) {
      toast({
        title: "Erro ao criar orçamento",
        description: "Selecione um cliente ou informe manualmente os dados do veículo.",
        variant: "destructive",
      });
      return;
    }
    
    if (!selectedVehicle && !isManualVehicle) {
      toast({
        title: "Erro ao criar orçamento",
        description: "Selecione um veículo para criar o orçamento.",
        variant: "destructive",
      });
      return;
    }
    
    if (isManualVehicle && !manualVehicleInfo) {
      toast({
        title: "Erro ao criar orçamento",
        description: "Informe os dados do veículo manualmente.",
        variant: "destructive",
      });
      return;
    }
    
    // Contar número de peças danificadas para AW
    const damagedPartsCount = Object.values(damagedParts).filter(Boolean).length;
    
    // Criar orçamento
    createBudgetMutation.mutate({
      client_id: !isManualVehicle && selectedClient ? selectedClient : undefined,
      vehicle_id: !isManualVehicle && selectedVehicle ? selectedVehicle : undefined,
      date,
      damaged_parts: Object.entries(damagedParts)
        .filter(([_, selected]) => selected)
        .map(([part]) => part),
      photo_url: photoUrl || undefined,
      total_aw: totalAw || damagedPartsCount, // Usar valor informado ou contagem de peças
      total_value: totalValue || damagedPartsCount * 100, // Valor arbitrário para exemplo
      note: note.trim(),
      vehicle_info: isManualVehicle ? manualVehicleInfo : undefined
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
      description: "O envio de orçamentos por e-mail será implementada em breve.",
    });
  };
  
  const handleViewBudget = (budgetId: number) => {
    toast({
      title: "Visualizar orçamento",
      description: `Visualizando detalhes do orçamento #${budgetId}.`,
    });
  };

  const handleToggleDamagedPart = (part: string, checked: boolean) => {
    setDamagedParts(prev => ({
      ...prev,
      [part]: checked
    }));
    
    // Atualizar automaticamente o total de AW
    const newCount = Object.entries({
      ...damagedParts,
      [part]: checked
    }).filter(([_, selected]) => selected).length;
    
    setTotalAw(newCount);
    setTotalValue(newCount * 100); // Valor arbitrário para exemplo
  };
  
  const handlePhotoUpload = () => {
    // Simulação de upload
    toast({
      title: "Upload simulado",
      description: "Em uma implementação real, isso abriria um seletor de arquivos ou câmera.",
    });
    setPhotoUrl("https://via.placeholder.com/150");
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
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle>Criar Novo Orçamento</DialogTitle>
                <DialogDescription>
                  Preencha os detalhes para criar um novo orçamento para o cliente.
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-6 py-4 max-h-[70vh] overflow-y-auto">
                {/* Data, Cliente e Veículo */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="date">Data</Label>
                    <Input
                      id="date"
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="client">Cliente</Label>
                    <Select 
                      value={selectedClient?.toString() || ""} 
                      onValueChange={(value) => {
                        if (value) {
                          setSelectedClient(parseInt(value));
                          setIsManualVehicle(false);
                        } else {
                          setSelectedClient(null);
                        }
                      }}
                      disabled={isManualVehicle}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um cliente" />
                      </SelectTrigger>
                      <SelectContent>
                        {clients?.map((client) => (
                          <SelectItem key={client.id} value={client.id.toString()}>
                            {client.name} - {client.phone}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="flex items-center space-x-2 mt-2">
                      <Checkbox 
                        id="manual-vehicle" 
                        checked={isManualVehicle}
                        onCheckedChange={(checked) => {
                          setIsManualVehicle(!!checked);
                          if (checked) {
                            setSelectedClient(null);
                            setSelectedVehicle(null);
                          }
                        }}
                      />
                      <label
                        htmlFor="manual-vehicle"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        Informar veículo manualmente
                      </label>
                    </div>
                  </div>
                  
                  {isManualVehicle ? (
                    <div className="space-y-2">
                      <Label htmlFor="manualVehicle">Informações do Veículo</Label>
                      <Input
                        id="manualVehicle"
                        placeholder="Ex: BMW X5 2022 (ABC-1234)"
                        value={manualVehicleInfo}
                        onChange={(e) => setManualVehicleInfo(e.target.value)}
                      />
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Label htmlFor="vehicle">Veículo</Label>
                      <Select 
                        value={selectedVehicle?.toString() || ""} 
                        onValueChange={(value) => setSelectedVehicle(parseInt(value))}
                        disabled={!selectedClient || vehiclesLoading}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={selectedClient ? "Selecione um veículo" : "Selecione um cliente primeiro"} />
                        </SelectTrigger>
                        <SelectContent>
                          {vehicles?.map((vehicle) => (
                            <SelectItem key={vehicle.id} value={vehicle.id.toString()}>
                              {vehicle.make} {vehicle.model} {vehicle.year}
                              {vehicle.license_plate && ` (${vehicle.license_plate})`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
                
                {/* Grid de Peças do Carro */}
                <div className="space-y-4">
                  <Label>Danos do Veículo</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {/* Linha 1 */}
                    <div className="flex items-center space-x-2 p-2 border rounded-md">
                      <Checkbox 
                        id="paraLamaEsquerdo" 
                        checked={damagedParts.paraLamaEsquerdo}
                        onCheckedChange={(checked) => handleToggleDamagedPart('paraLamaEsquerdo', !!checked)}
                      />
                      <label htmlFor="paraLamaEsquerdo" className="text-sm">Para-lama Esquerdo</label>
                    </div>
                    
                    <div className="flex items-center space-x-2 p-2 border rounded-md">
                      <Checkbox 
                        id="capo" 
                        checked={damagedParts.capo}
                        onCheckedChange={(checked) => handleToggleDamagedPart('capo', !!checked)}
                      />
                      <label htmlFor="capo" className="text-sm">Capô</label>
                    </div>
                    
                    <div className="flex items-center space-x-2 p-2 border rounded-md">
                      <Checkbox 
                        id="paraLamaDireito" 
                        checked={damagedParts.paraLamaDireito}
                        onCheckedChange={(checked) => handleToggleDamagedPart('paraLamaDireito', !!checked)}
                      />
                      <label htmlFor="paraLamaDireito" className="text-sm">Para-lama Direito</label>
                    </div>
                    
                    {/* Linha 2 */}
                    <div className="flex items-center space-x-2 p-2 border rounded-md">
                      <Checkbox 
                        id="colunaEsquerda" 
                        checked={damagedParts.colunaEsquerda}
                        onCheckedChange={(checked) => handleToggleDamagedPart('colunaEsquerda', !!checked)}
                      />
                      <label htmlFor="colunaEsquerda" className="text-sm">Coluna Esquerda</label>
                    </div>
                    
                    <div className="flex items-center space-x-2 p-2 border rounded-md">
                      <Checkbox 
                        id="teto" 
                        checked={damagedParts.teto}
                        onCheckedChange={(checked) => handleToggleDamagedPart('teto', !!checked)}
                      />
                      <label htmlFor="teto" className="text-sm">Teto</label>
                    </div>
                    
                    <div className="flex items-center space-x-2 p-2 border rounded-md">
                      <Checkbox 
                        id="colunaDireita" 
                        checked={damagedParts.colunaDireita}
                        onCheckedChange={(checked) => handleToggleDamagedPart('colunaDireita', !!checked)}
                      />
                      <label htmlFor="colunaDireita" className="text-sm">Coluna Direita</label>
                    </div>
                    
                    {/* Linha 3 */}
                    <div className="flex items-center space-x-2 p-2 border rounded-md">
                      <Checkbox 
                        id="portaDianteiraEsquerda" 
                        checked={damagedParts.portaDianteiraEsquerda}
                        onCheckedChange={(checked) => handleToggleDamagedPart('portaDianteiraEsquerda', !!checked)}
                      />
                      <label htmlFor="portaDianteiraEsquerda" className="text-sm">Porta Dianteira Esq.</label>
                    </div>
                    
                    <div className="flex justify-center items-center p-2 border rounded-md">
                      <Button
                        variant="outline"
                        className="w-full h-full flex flex-col items-center justify-center min-h-[60px]"
                        onClick={handlePhotoUpload}
                      >
                        <CameraIcon className="h-5 w-5 mb-1" />
                        <span className="text-xs">Foto</span>
                      </Button>
                    </div>
                    
                    <div className="flex items-center space-x-2 p-2 border rounded-md">
                      <Checkbox 
                        id="portaDianteiraDireita" 
                        checked={damagedParts.portaDianteiraDireita}
                        onCheckedChange={(checked) => handleToggleDamagedPart('portaDianteiraDireita', !!checked)}
                      />
                      <label htmlFor="portaDianteiraDireita" className="text-sm">Porta Dianteira Dir.</label>
                    </div>
                    
                    {/* Linha 4 */}
                    <div className="flex items-center space-x-2 p-2 border rounded-md">
                      <Checkbox 
                        id="portaTraseiraEsquerda" 
                        checked={damagedParts.portaTraseiraEsquerda}
                        onCheckedChange={(checked) => handleToggleDamagedPart('portaTraseiraEsquerda', !!checked)}
                      />
                      <label htmlFor="portaTraseiraEsquerda" className="text-sm">Porta Traseira Esq.</label>
                    </div>
                    
                    <div className="flex items-center space-x-2 p-2 border rounded-md">
                      <Checkbox 
                        id="portaMalasSuperior" 
                        checked={damagedParts.portaMalasSuperior}
                        onCheckedChange={(checked) => handleToggleDamagedPart('portaMalasSuperior', !!checked)}
                      />
                      <label htmlFor="portaMalasSuperior" className="text-sm">Porta Malas Superior</label>
                    </div>
                    
                    <div className="flex items-center space-x-2 p-2 border rounded-md">
                      <Checkbox 
                        id="portaTraseiraDireita" 
                        checked={damagedParts.portaTraseiraDireita}
                        onCheckedChange={(checked) => handleToggleDamagedPart('portaTraseiraDireita', !!checked)}
                      />
                      <label htmlFor="portaTraseiraDireita" className="text-sm">Porta Traseira Dir.</label>
                    </div>
                    
                    {/* Linha 5 */}
                    <div className="flex items-center space-x-2 p-2 border rounded-md">
                      <Checkbox 
                        id="lateralEsquerda" 
                        checked={damagedParts.lateralEsquerda}
                        onCheckedChange={(checked) => handleToggleDamagedPart('lateralEsquerda', !!checked)}
                      />
                      <label htmlFor="lateralEsquerda" className="text-sm">Lateral Esquerda</label>
                    </div>
                    
                    <div className="flex items-center space-x-2 p-2 border rounded-md">
                      <Checkbox 
                        id="portaMalasInferior" 
                        checked={damagedParts.portaMalasInferior}
                        onCheckedChange={(checked) => handleToggleDamagedPart('portaMalasInferior', !!checked)}
                      />
                      <label htmlFor="portaMalasInferior" className="text-sm">Porta Malas Inferior</label>
                    </div>
                    
                    <div className="flex items-center space-x-2 p-2 border rounded-md">
                      <Checkbox 
                        id="lateralDireita" 
                        checked={damagedParts.lateralDireita}
                        onCheckedChange={(checked) => handleToggleDamagedPart('lateralDireita', !!checked)}
                      />
                      <label htmlFor="lateralDireita" className="text-sm">Lateral Direita</label>
                    </div>
                  </div>
                </div>
                
                {/* Totais */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="totalAw">Total de AW</Label>
                    <Input
                      id="totalAw"
                      type="number"
                      value={totalAw}
                      onChange={(e) => setTotalAw(Number(e.target.value))}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="totalValue">Total em €</Label>
                    <Input
                      id="totalValue"
                      type="number"
                      value={totalValue}
                      onChange={(e) => setTotalValue(Number(e.target.value))}
                    />
                  </div>
                </div>
                
                {/* Observações */}
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
                  disabled={createBudgetMutation.isPending}
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
      </div>
    </div>
  );
}