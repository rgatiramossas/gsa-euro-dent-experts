import React, { useState, useEffect } from "react";
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
  optionA: boolean;
  optionK: boolean;
  optionP: boolean;
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
  const [manualVehicleInfo, setManualVehicleInfo] = useState("");
  const [isManualVehicle, setIsManualVehicle] = useState(false);
  const [totalAw, setTotalAw] = useState<number>(0);
  const [totalValue, setTotalValue] = useState<number>(0);
  const [licensePlate, setLicensePlate] = useState("");
  const [chassisNumber, setChassisNumber] = useState("");
  const [note, setNote] = useState("");
  
  // Estado para os danos do veículo (peças)
  const [partDamages, setPartDamages] = useState<Record<string, PartDamage>>({
    paraLamaEsquerdo: { selected: false, diameter20: 0, diameter30: 0, diameter40: 0, optionA: false, optionK: false, optionP: false },
    capo: { selected: false, diameter20: 0, diameter30: 0, diameter40: 0, optionA: false, optionK: false, optionP: false },
    paraLamaDireito: { selected: false, diameter20: 0, diameter30: 0, diameter40: 0, optionA: false, optionK: false, optionP: false },
    colunaEsquerda: { selected: false, diameter20: 0, diameter30: 0, diameter40: 0, optionA: false, optionK: false, optionP: false },
    teto: { selected: false, diameter20: 0, diameter30: 0, diameter40: 0, optionA: false, optionK: false, optionP: false }, 
    colunaDireita: { selected: false, diameter20: 0, diameter30: 0, diameter40: 0, optionA: false, optionK: false, optionP: false },
    portaDianteiraEsquerda: { selected: false, diameter20: 0, diameter30: 0, diameter40: 0, optionA: false, optionK: false, optionP: false },
    portaDianteiraDireita: { selected: false, diameter20: 0, diameter30: 0, diameter40: 0, optionA: false, optionK: false, optionP: false },
    portaTraseiraEsquerda: { selected: false, diameter20: 0, diameter30: 0, diameter40: 0, optionA: false, optionK: false, optionP: false },
    portaMalasSuperior: { selected: false, diameter20: 0, diameter30: 0, diameter40: 0, optionA: false, optionK: false, optionP: false },
    portaTraseiraDireita: { selected: false, diameter20: 0, diameter30: 0, diameter40: 0, optionA: false, optionK: false, optionP: false },
    lateralEsquerda: { selected: false, diameter20: 0, diameter30: 0, diameter40: 0, optionA: false, optionK: false, optionP: false },
    portaMalasInferior: { selected: false, diameter20: 0, diameter30: 0, diameter40: 0, optionA: false, optionK: false, optionP: false },
    lateralDireita: { selected: false, diameter20: 0, diameter30: 0, diameter40: 0, optionA: false, optionK: false, optionP: false }
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
      setLicensePlate("");
      setChassisNumber("");
      setPartDamages({
        paraLamaEsquerdo: { selected: false, diameter20: 0, diameter30: 0, diameter40: 0, optionA: false, optionK: false, optionP: false },
        capo: { selected: false, diameter20: 0, diameter30: 0, diameter40: 0, optionA: false, optionK: false, optionP: false },
        paraLamaDireito: { selected: false, diameter20: 0, diameter30: 0, diameter40: 0, optionA: false, optionK: false, optionP: false },
        colunaEsquerda: { selected: false, diameter20: 0, diameter30: 0, diameter40: 0, optionA: false, optionK: false, optionP: false },
        teto: { selected: false, diameter20: 0, diameter30: 0, diameter40: 0, optionA: false, optionK: false, optionP: false }, 
        colunaDireita: { selected: false, diameter20: 0, diameter30: 0, diameter40: 0, optionA: false, optionK: false, optionP: false },
        portaDianteiraEsquerda: { selected: false, diameter20: 0, diameter30: 0, diameter40: 0, optionA: false, optionK: false, optionP: false },
        portaDianteiraDireita: { selected: false, diameter20: 0, diameter30: 0, diameter40: 0, optionA: false, optionK: false, optionP: false },
        portaTraseiraEsquerda: { selected: false, diameter20: 0, diameter30: 0, diameter40: 0, optionA: false, optionK: false, optionP: false },
        portaMalasSuperior: { selected: false, diameter20: 0, diameter30: 0, diameter40: 0, optionA: false, optionK: false, optionP: false },
        portaTraseiraDireita: { selected: false, diameter20: 0, diameter30: 0, diameter40: 0, optionA: false, optionK: false, optionP: false },
        lateralEsquerda: { selected: false, diameter20: 0, diameter30: 0, diameter40: 0, optionA: false, optionK: false, optionP: false },
        portaMalasInferior: { selected: false, diameter20: 0, diameter30: 0, diameter40: 0, optionA: false, optionK: false, optionP: false },
        lateralDireita: { selected: false, diameter20: 0, diameter30: 0, diameter40: 0, optionA: false, optionK: false, optionP: false }
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
  
  // Estado para armazenar a informação do último input modificado
  const [lastModified, setLastModified] = React.useState<{
    part: string;
    diameter: 'diameter20' | 'diameter30' | 'diameter40';
    id: string;
  } | null>(null);

  // Referência para armazenar os refs dos inputs
  const inputRefs = React.useRef<{[key: string]: HTMLInputElement | null}>({});
  
  // UseEffect para restaurar o foco quando lastModified muda
  React.useEffect(() => {
    if (lastModified) {
      const inputId = `${lastModified.part}-${lastModified.diameter}`;
      const inputElement = inputRefs.current[inputId];
      
      if (inputElement) {
        // Usar requestAnimationFrame garante que o DOM já foi atualizado
        requestAnimationFrame(() => {
          inputElement.focus();
          inputElement.select();
        });
      }
    }
  }, [lastModified, partDamages]); // Dependência em partDamages para garantir que o efeito roda após atualização do estado
  
  // Função para atualizar a quantidade de um diâmetro específico
  const handleDiameterChange = (part: string, diameter: 'diameter20' | 'diameter30' | 'diameter40', value: number) => {
    // Registrar qual campo foi modificado
    setLastModified({
      part,
      diameter,
      id: `${part}-${diameter}`
    });
    
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
    
    // Calcular total de diâmetros
    let totalDiameters = 0;
    let selectedCount = 0;
    
    // Criar uma versão atualizada para calcular totais
    const updatedDamages = {
      ...partDamages,
      [part]: {
        ...partDamages[part],
        [diameter]: value,
        selected: true // Assumimos que se há um valor, a peça está selecionada
      }
    };
    
    Object.entries(updatedDamages).forEach(([partKey, damage]) => {
      // Se a peça for a que estamos atualizando agora, usar os valores atualizados
      const hasValue = damage.diameter20 > 0 || damage.diameter30 > 0 || damage.diameter40 > 0;
      
      if (hasValue) {
        selectedCount++;
        totalDiameters += damage.diameter20 + damage.diameter30 + damage.diameter40;
      }
    });
    
    // Usar a contagem de diâmetros se houver algum, senão usar a contagem de peças
    const totalAWValue = totalDiameters > 0 ? totalDiameters : selectedCount;
    
    setTotalAw(totalAWValue);
    setTotalValue(totalAWValue * 100); // Valor arbitrário para exemplo
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
    
    // Função para evitar perda de foco e selecionar todo o texto
    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      e.target.select();
    };
    
    // Função otimizada para lidar com a mudança nos inputs 
    // mantendo o foco ativo no campo atual
    const handleInputChange = (diameter: 'diameter20' | 'diameter30' | 'diameter40', value: string) => {
      const numValue = parseInt(value) || 0;
      
      // Atualizar o valor no estado
      handleDiameterChange(partKey, diameter, numValue);
    };
    
    return (
      <div className="p-2 border rounded-md space-y-3">
        <div className="font-medium text-sm text-center border-b pb-1 mb-1">
          {label}
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label htmlFor={`${partKey}-diameter20`} className="text-xs">20mm:</label>
            <Input
              id={`${partKey}-diameter20`}
              type="number"
              min="0"
              max="9999"
              value={damage.diameter20}
              onChange={(e) => handleInputChange('diameter20', e.target.value)}
              onFocus={handleFocus}
              autoComplete="off"
              className="w-16 h-7 text-xs"
              ref={(el) => {
                inputRefs.current[`${partKey}-diameter20`] = el;
              }}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <label htmlFor={`${partKey}-diameter30`} className="text-xs">30mm:</label>
            <Input
              id={`${partKey}-diameter30`}
              type="number"
              min="0"
              max="9999"
              value={damage.diameter30}
              onChange={(e) => handleInputChange('diameter30', e.target.value)}
              onFocus={handleFocus}
              autoComplete="off"
              className="w-16 h-7 text-xs"
              ref={(el) => {
                inputRefs.current[`${partKey}-diameter30`] = el;
              }}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <label htmlFor={`${partKey}-diameter40`} className="text-xs">40mm:</label>
            <Input
              id={`${partKey}-diameter40`}
              type="number"
              min="0"
              max="9999"
              value={damage.diameter40}
              onChange={(e) => handleInputChange('diameter40', e.target.value)}
              onFocus={handleFocus}
              autoComplete="off"
              className="w-16 h-7 text-xs"
              ref={(el) => {
                inputRefs.current[`${partKey}-diameter40`] = el;
              }}
            />
          </div>
          
          {/* Checkboxes A, K, P */}
          <div className="flex justify-between pt-1 border-t mt-2">
            <div className="flex items-center gap-1">
              <Checkbox 
                id={`${partKey}-optionA`} 
                checked={damage.optionA}
                onCheckedChange={(checked) => {
                  setPartDamages(prev => ({
                    ...prev,
                    [partKey]: {
                      ...prev[partKey],
                      optionA: !!checked
                    }
                  }));
                }}
              />
              <label htmlFor={`${partKey}-optionA`} className="text-xs">(A)</label>
            </div>
            
            <div className="flex items-center gap-1">
              <Checkbox 
                id={`${partKey}-optionK`} 
                checked={damage.optionK}
                onCheckedChange={(checked) => {
                  setPartDamages(prev => ({
                    ...prev,
                    [partKey]: {
                      ...prev[partKey],
                      optionK: !!checked
                    }
                  }));
                }}
              />
              <label htmlFor={`${partKey}-optionK`} className="text-xs">(K)</label>
            </div>
            
            <div className="flex items-center gap-1">
              <Checkbox 
                id={`${partKey}-optionP`} 
                checked={damage.optionP}
                onCheckedChange={(checked) => {
                  setPartDamages(prev => ({
                    ...prev,
                    [partKey]: {
                      ...prev[partKey],
                      optionP: !!checked
                    }
                  }));
                }}
              />
              <label htmlFor={`${partKey}-optionP`} className="text-xs">(P)</label>
            </div>
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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                          } else {
                            setSelectedClient(null);
                          }
                        }}
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
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="vehicleInfo">Veículo</Label>
                      <Input
                        id="vehicleInfo"
                        placeholder="Ex: BMW X5 2022"
                        value={manualVehicleInfo}
                        onChange={(e) => setManualVehicleInfo(e.target.value)}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="licensePlate">Placa</Label>
                      <Input
                        id="licensePlate"
                        placeholder="Ex: ABC-1234"
                        value={licensePlate}
                        onChange={(e) => setLicensePlate(e.target.value)}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="chassisNumber">Chassi</Label>
                      <Input
                        id="chassisNumber"
                        placeholder="Ex: 9BW11111111111111"
                        value={chassisNumber}
                        onChange={(e) => setChassisNumber(e.target.value)}
                      />
                    </div>
                  </div>
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
                      min="0"
                      max="99999"
                      value={totalAw}
                      onChange={(e) => setTotalAw(Number(e.target.value))}
                      onFocus={(e) => e.target.select()}
                      autoComplete="off"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="totalValue">Total em €</Label>
                    <Input
                      id="totalValue"
                      type="number"
                      min="0"
                      max="9999999"
                      value={totalValue}
                      onChange={(e) => setTotalValue(Number(e.target.value))}
                      onFocus={(e) => e.target.select()}
                      autoComplete="off"
                    />
                  </div>
                </div>
                
                {/* Materiais Especiais */}
                <div className="space-y-2">
                  <Label>Materiais Especiais</Label>
                  <div className="text-sm border p-2 rounded bg-muted">
                    <strong>MATERIAIS ESPECIAIS:</strong><br />
                    A= ALUMÍNIO   K= COLA   P= PINTURA
                  </div>
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