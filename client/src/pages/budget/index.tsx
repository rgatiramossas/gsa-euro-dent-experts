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
  CameraIcon
} from "lucide-react";

// Tipos para orçamento
interface PartDamage {
  selected: boolean;
  diameter20: number;
  diameter30: number;
  diameter40: number;
}

interface CarPart {
  id: string;
  name: string;
  damage: PartDamage;
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
  const [partDamages, setPartDamages] = useState<Record<string, PartDamage>>({
    paraLamaEsquerdo: { selected: false, diameter20: 0, diameter30: 0, diameter40: 0 },
    capo: { selected: false, diameter20: 0, diameter30: 0, diameter40: 0 },
    paraLamaDireito: { selected: false, diameter20: 0, diameter30: 0, diameter40: 0 },
    colunaEsquerda: { selected: false, diameter20: 0, diameter30: 0, diameter40: 0 },
    teto: { selected: false, diameter20: 0, diameter30: 0, diameter40: 0 }, 
    colunaDireita: { selected: false, diameter20: 0, diameter30: 0, diameter40: 0 },
    portaDianteiraEsquerda: { selected: false, diameter20: 0, diameter30: 0, diameter40: 0 },
    portaDianteiraDireita: { selected: false, diameter20: 0, diameter30: 0, diameter40: 0 },
    portaTraseiraEsquerda: { selected: false, diameter20: 0, diameter30: 0, diameter40: 0 },
    portaMalasSuperior: { selected: false, diameter20: 0, diameter30: 0, diameter40: 0 },
    portaTraseiraDireita: { selected: false, diameter20: 0, diameter30: 0, diameter40: 0 },
    lateralEsquerda: { selected: false, diameter20: 0, diameter30: 0, diameter40: 0 },
    portaMalasInferior: { selected: false, diameter20: 0, diameter30: 0, diameter40: 0 },
    lateralDireita: { selected: false, diameter20: 0, diameter30: 0, diameter40: 0 }
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
      setPartDamages({
        paraLamaEsquerdo: { selected: false, diameter20: 0, diameter30: 0, diameter40: 0 },
        capo: { selected: false, diameter20: 0, diameter30: 0, diameter40: 0 },
        paraLamaDireito: { selected: false, diameter20: 0, diameter30: 0, diameter40: 0 },
        colunaEsquerda: { selected: false, diameter20: 0, diameter30: 0, diameter40: 0 },
        teto: { selected: false, diameter20: 0, diameter30: 0, diameter40: 0 }, 
        colunaDireita: { selected: false, diameter20: 0, diameter30: 0, diameter40: 0 },
        portaDianteiraEsquerda: { selected: false, diameter20: 0, diameter30: 0, diameter40: 0 },
        portaDianteiraDireita: { selected: false, diameter20: 0, diameter30: 0, diameter40: 0 },
        portaTraseiraEsquerda: { selected: false, diameter20: 0, diameter30: 0, diameter40: 0 },
        portaMalasSuperior: { selected: false, diameter20: 0, diameter30: 0, diameter40: 0 },
        portaTraseiraDireita: { selected: false, diameter20: 0, diameter30: 0, diameter40: 0 },
        lateralEsquerda: { selected: false, diameter20: 0, diameter30: 0, diameter40: 0 },
        portaMalasInferior: { selected: false, diameter20: 0, diameter30: 0, diameter40: 0 },
        lateralDireita: { selected: false, diameter20: 0, diameter30: 0, diameter40: 0 }
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
    const selectedParts = Object.values(partDamages).filter(damage => damage.selected);
    const selectedPartsCount = selectedParts.length;
    
    // Calcular total de diâmetros
    let totalDiameters = 0;
    selectedParts.forEach(damage => {
      totalDiameters += damage.diameter20 + damage.diameter30 + damage.diameter40;
    });
    
    // Usar a contagem de diâmetros se houver algum, senão usar a contagem de peças
    const totalAWValue = totalDiameters > 0 ? totalDiameters : selectedPartsCount;
    
    // Criar orçamento
    createBudgetMutation.mutate({
      client_id: !isManualVehicle && selectedClient ? selectedClient : undefined,
      vehicle_id: !isManualVehicle && selectedVehicle ? selectedVehicle : undefined,
      date,
      damaged_parts: Object.entries(partDamages)
        .filter(([_, damage]) => damage.selected)
        .map(([part]) => part),
      photo_url: photoUrl || undefined,
      total_aw: totalAw || totalAWValue,
      total_value: totalValue || totalAWValue * 100, // Valor arbitrário para exemplo
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
  
  // Função para atualizar a quantidade de um diâmetro específico
  const handleDiameterChange = (part: string, diameter: 'diameter20' | 'diameter30' | 'diameter40', value: number) => {
    setPartDamages(prev => {
      // Determinar se a peça está selecionada com base em se algum diâmetro tem um valor > 0
      const newPartDamage = {
        ...prev[part],
        [diameter]: value
      };
      
      // Atualizar selected baseado em se algum diâmetro tem um valor
      const hasValue = newPartDamage.diameter20 > 0 || newPartDamage.diameter30 > 0 || newPartDamage.diameter40 > 0;
      newPartDamage.selected = hasValue;
      
      return {
        ...prev,
        [part]: newPartDamage
      };
    });
    
    // Recalcular totais - usar setTimeout para garantir que o estado foi atualizado
    setTimeout(() => {
      // Calcular total de diâmetros
      let totalDiameters = 0;
      let selectedCount = 0;
      
      Object.values(partDamages).forEach(damage => {
        // Determinar se a peça tem algum valor positivo em qualquer diâmetro
        const hasValue = damage.diameter20 > 0 || damage.diameter30 > 0 || damage.diameter40 > 0;
        
        if (hasValue) {
          selectedCount++;
          totalDiameters += damage.diameter20 + damage.diameter30 + damage.diameter40;
        }
      });
      
      // Consideramos a peça sendo editada agora
      const currentDamage = {
        ...partDamages[part],
        [diameter]: value
      };
      
      const currentHasValue = currentDamage.diameter20 > 0 || currentDamage.diameter30 > 0 || currentDamage.diameter40 > 0;
      
      // Atualizar os totais com os valores atuais
      if (currentHasValue && !partDamages[part].selected) {
        selectedCount++;
        totalDiameters += currentDamage.diameter20 + currentDamage.diameter30 + currentDamage.diameter40;
      } else if (!currentHasValue && partDamages[part].selected) {
        selectedCount--;
        totalDiameters -= (partDamages[part].diameter20 + partDamages[part].diameter30 + partDamages[part].diameter40);
        totalDiameters += currentDamage.diameter20 + currentDamage.diameter30 + currentDamage.diameter40;
      } else if (partDamages[part].selected) {
        // Ajustar apenas o diâmetro que mudou
        totalDiameters -= partDamages[part][diameter];
        totalDiameters += value;
      }
      
      // Usar a contagem de diâmetros se houver algum, senão usar a contagem de peças
      const totalAWValue = totalDiameters > 0 ? totalDiameters : selectedCount;
      
      setTotalAw(totalAWValue);
      setTotalValue(totalAWValue * 100); // Valor arbitrário para exemplo
    }, 0);
  };
  
  const handlePhotoUpload = () => {
    // Simulação de upload
    toast({
      title: "Upload simulado",
      description: "Em uma implementação real, isso abriria um seletor de arquivos ou câmera.",
    });
    setPhotoUrl("https://via.placeholder.com/150");
  };

  // Componente para renderizar cada item de peça
  const DamagedPartItem = ({ partKey, label }: { partKey: string, label: string }) => {
    const damage = partDamages[partKey];
    
    return (
      <div className="p-2 border rounded-md space-y-3">
        <div className="font-medium text-sm text-center border-b pb-1 mb-1">
          {label}
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label htmlFor={`${partKey}-20`} className="text-xs">20mm:</label>
            <Input
              id={`${partKey}-20`}
              type="number"
              min="0"
              value={damage.diameter20}
              onChange={(e) => handleDiameterChange(partKey, 'diameter20', parseInt(e.target.value) || 0)}
              className="w-16 h-7 text-xs"
            />
          </div>
          
          <div className="flex items-center justify-between">
            <label htmlFor={`${partKey}-30`} className="text-xs">30mm:</label>
            <Input
              id={`${partKey}-30`}
              type="number"
              min="0"
              value={damage.diameter30}
              onChange={(e) => handleDiameterChange(partKey, 'diameter30', parseInt(e.target.value) || 0)}
              className="w-16 h-7 text-xs"
            />
          </div>
          
          <div className="flex items-center justify-between">
            <label htmlFor={`${partKey}-40`} className="text-xs">40mm:</label>
            <Input
              id={`${partKey}-40`}
              type="number"
              min="0"
              value={damage.diameter40}
              onChange={(e) => handleDiameterChange(partKey, 'diameter40', parseInt(e.target.value) || 0)}
              className="w-16 h-7 text-xs"
            />
          </div>
        </div>
      </div>
    );
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
                    <DamagedPartItem partKey="paraLamaEsquerdo" label="Para-lama Esquerdo" />
                    <DamagedPartItem partKey="capo" label="Capô" />
                    <DamagedPartItem partKey="paraLamaDireito" label="Para-lama Direito" />
                    
                    {/* Linha 2 */}
                    <DamagedPartItem partKey="colunaEsquerda" label="Coluna Esquerda" />
                    <DamagedPartItem partKey="teto" label="Teto" />
                    <DamagedPartItem partKey="colunaDireita" label="Coluna Direita" />
                    
                    {/* Linha 3 */}
                    <DamagedPartItem partKey="portaDianteiraEsquerda" label="Porta Dianteira Esq." />
                    
                    <div className="flex justify-center items-center p-2 border rounded-md">
                      <Button
                        variant="outline"
                        className="w-full h-full flex flex-col items-center justify-center min-h-[135px]"
                        onClick={handlePhotoUpload}
                      >
                        <CameraIcon className="h-10 w-10 mb-2" />
                        <span className="text-sm">Adicionar Foto</span>
                      </Button>
                    </div>
                    
                    <DamagedPartItem partKey="portaDianteiraDireita" label="Porta Dianteira Dir." />
                    
                    {/* Linha 4 */}
                    <DamagedPartItem partKey="portaTraseiraEsquerda" label="Porta Traseira Esq." />
                    <DamagedPartItem partKey="portaMalasSuperior" label="Porta Malas Superior" />
                    <DamagedPartItem partKey="portaTraseiraDireita" label="Porta Traseira Dir." />
                    
                    {/* Linha 5 */}
                    <DamagedPartItem partKey="lateralEsquerda" label="Lateral Esquerda" />
                    <DamagedPartItem partKey="portaMalasInferior" label="Porta Malas Inferior" />
                    <DamagedPartItem partKey="lateralDireita" label="Lateral Direita" />
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
                  <TableHead>Total (AW)</TableHead>
                  <TableHead>Total (€)</TableHead>
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
                      <TableCell>{budget.total_aw}</TableCell>
                      <TableCell>{formatCurrency(budget.total_value || 0)}</TableCell>
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
                    <TableCell colSpan={6} className="text-center py-6 text-gray-500 italic">
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