import React, { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Client } from "@/types";
import { apiRequest } from "@/lib/queryClient";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { hailCalculation } from '../../utils/hailCalculation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
  PlusIcon, 
  Pencil as PencilIcon, 
  Trash2 as Trash2Icon,
  Camera as CameraIcon,
  FileText as FileTextIcon,
  Download as DownloadIcon,
  Eye as EyeIcon
} from "lucide-react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

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
  plate?: string;
  chassisNumber?: string;
}

interface PartDamage {
  selected: boolean;
  diameter20: number;
  diameter30: number;
  diameter40: number;
  optionA: boolean;
  optionK: boolean;
  optionP: boolean;
  isHorizontal?: boolean;
}

interface CarPart {
  id: string;
  name: string;
  damage: PartDamage;
}

// Definição dos dados iniciais para cada peça
const initialDamagedParts: Record<string, PartDamage> = {
  // Peças horizontais
  capo: { selected: false, diameter20: 0, diameter30: 0, diameter40: 0, optionA: false, optionK: false, optionP: false, isHorizontal: true },
  teto: { selected: false, diameter20: 0, diameter30: 0, diameter40: 0, optionA: false, optionK: false, optionP: false, isHorizontal: true },
  portaMalasSuperior: { selected: false, diameter20: 0, diameter30: 0, diameter40: 0, optionA: false, optionK: false, optionP: false, isHorizontal: true },
  
  // Peças verticais (padrão)
  paraLamaEsquerdo: { selected: false, diameter20: 0, diameter30: 0, diameter40: 0, optionA: false, optionK: false, optionP: false, isHorizontal: false },
  paraLamaDireito: { selected: false, diameter20: 0, diameter30: 0, diameter40: 0, optionA: false, optionK: false, optionP: false, isHorizontal: false },
  colunaEsquerda: { selected: false, diameter20: 0, diameter30: 0, diameter40: 0, optionA: false, optionK: false, optionP: false, isHorizontal: false },
  colunaDireita: { selected: false, diameter20: 0, diameter30: 0, diameter40: 0, optionA: false, optionK: false, optionP: false, isHorizontal: false },
  portaDianteiraEsquerda: { selected: false, diameter20: 0, diameter30: 0, diameter40: 0, optionA: false, optionK: false, optionP: false, isHorizontal: false },
  portaDianteiraDireita: { selected: false, diameter20: 0, diameter30: 0, diameter40: 0, optionA: false, optionK: false, optionP: false, isHorizontal: false },
  portaTraseiraEsquerda: { selected: false, diameter20: 0, diameter30: 0, diameter40: 0, optionA: false, optionK: false, optionP: false, isHorizontal: false },
  portaTraseiraDireita: { selected: false, diameter20: 0, diameter30: 0, diameter40: 0, optionA: false, optionK: false, optionP: false, isHorizontal: false },
  lateralEsquerda: { selected: false, diameter20: 0, diameter30: 0, diameter40: 0, optionA: false, optionK: false, optionP: false, isHorizontal: false },
  lateralDireita: { selected: false, diameter20: 0, diameter30: 0, diameter40: 0, optionA: false, optionK: false, optionP: false, isHorizontal: false },
  portaMalasInferior: { selected: false, diameter20: 0, diameter30: 0, diameter40: 0, optionA: false, optionK: false, optionP: false, isHorizontal: false },
};

// Definição do componente de peça danificada
function DamagedPartItem({ 
  partKey, 
  label, 
  isHorizontal = false, 
  isViewMode = false,
  onChange
}: { 
  partKey: string; 
  label: string; 
  isHorizontal?: boolean; 
  isViewMode?: boolean;
  onChange?: (key: string, value: PartDamage) => void;
}) {
  const [damage, setDamage] = useState<PartDamage>(initialDamagedParts[partKey] || { 
    selected: false, 
    diameter20: 0, 
    diameter30: 0, 
    diameter40: 0, 
    optionA: false, 
    optionK: false, 
    optionP: false, 
    isHorizontal: isHorizontal 
  });
  
  const updateDamage = (field: keyof PartDamage, value: any) => {
    const updatedDamage = { ...damage, [field]: value };
    
    // Se algum campo for preenchido, marcamos a peça como selecionada
    if (field === 'diameter20' || field === 'diameter30' || field === 'diameter40') {
      const numValue = parseInt(value) || 0;
      updatedDamage[field] = numValue;
      
      // Marca como selecionado se tiver algum valor
      if (numValue > 0 || updatedDamage.optionA || updatedDamage.optionK || updatedDamage.optionP) {
        updatedDamage.selected = true;
      } else if (
        updatedDamage.diameter20 === 0 && 
        updatedDamage.diameter30 === 0 && 
        updatedDamage.diameter40 === 0 &&
        !updatedDamage.optionA && 
        !updatedDamage.optionK && 
        !updatedDamage.optionP
      ) {
        updatedDamage.selected = false;
      }
    }
    
    // Atualiza o estado local
    setDamage(updatedDamage);
    
    // Notifica o componente pai sobre a mudança
    if (onChange) {
      onChange(partKey, updatedDamage);
    }
  };
  
  return (
    <div className="border rounded-md p-2 space-y-2">
      <div className="text-center mb-2">
        {label}
        {isHorizontal && <span className="text-xs text-muted-foreground ml-1">(Horizontal)</span>}
      </div>
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-sm">20mm:</span>
          <Input 
            type="number" 
            className="w-28"
            readOnly={isViewMode}
            disabled={isViewMode}
            value={damage.diameter20 > 0 ? damage.diameter20.toString() : ''}
            onChange={(e) => updateDamage('diameter20', e.target.value)}
            min="0"
          />
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm">30mm:</span>
          <Input 
            type="number" 
            className="w-28"
            readOnly={isViewMode}
            disabled={isViewMode}
            value={damage.diameter30 > 0 ? damage.diameter30.toString() : ''}
            onChange={(e) => updateDamage('diameter30', e.target.value)}
            min="0"
          />
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm">40mm:</span>
          <Input 
            type="number" 
            className="w-28"
            readOnly={isViewMode}
            disabled={isViewMode}
            value={damage.diameter40 > 0 ? damage.diameter40.toString() : ''}
            onChange={(e) => updateDamage('diameter40', e.target.value)}
            min="0"
          />
        </div>
        <div className="flex justify-between pt-1">
          <div className="flex items-center gap-1">
            <Checkbox 
              id={`${partKey}-a`} 
              checked={damage.optionA}
              disabled={isViewMode}
              onCheckedChange={(checked) => updateDamage('optionA', !!checked)}
            />
            <Label htmlFor={`${partKey}-a`} className="rounded px-1 bg-red-100">A</Label>
          </div>
          <div className="flex items-center gap-1">
            <Checkbox 
              id={`${partKey}-k`} 
              checked={damage.optionK}
              disabled={isViewMode}
              onCheckedChange={(checked) => updateDamage('optionK', !!checked)}
            />
            <Label htmlFor={`${partKey}-k`} className="rounded px-1 bg-blue-100">K</Label>
          </div>
          <div className="flex items-center gap-1">
            <Checkbox 
              id={`${partKey}-p`} 
              checked={damage.optionP}
              disabled={isViewMode}
              onCheckedChange={(checked) => updateDamage('optionP', !!checked)}
            />
            <Label htmlFor={`${partKey}-p`} className="rounded px-1 bg-green-100">P</Label>
          </div>
        </div>
      </div>
    </div>
  );
}

// Função de cálculo do valor AW baseado nos danos das peças
function calculateAw(parts: Record<string, PartDamage>) {
  let totalAw = 0;
  
  // Itera sobre todas as peças
  Object.entries(parts).forEach(([partKey, part]) => {
    if (part.selected) {
      // Usar a função de cálculo avançada para cada diâmetro
      if (part.diameter20 > 0) {
        const result = hailCalculation(
          20, // tamanho 20mm
          part.diameter20, // quantidade
          !part.isHorizontal, // isVertical (inverso de isHorizontal)
          part.optionA, // isAluminum
          part.optionK, // isGlueTechnique
          false, // needsVordrucken (não usado na interface)
          false // needsHohlraum (não usado na interface)
          // Taxa padrão de 2.8€ será usada (definida na função hailCalculation)
        );
        totalAw += result.aw;
      }
      
      if (part.diameter30 > 0) {
        const result = hailCalculation(
          30, // tamanho 30mm  
          part.diameter30, // quantidade
          !part.isHorizontal, // isVertical
          part.optionA, // isAluminum
          part.optionK, // isGlueTechnique
          false, // needsVordrucken
          false // needsHohlraum
          // Taxa padrão de 2.8€ será usada (definida na função hailCalculation)
        );
        totalAw += result.aw;
      }
      
      if (part.diameter40 > 0) {
        const result = hailCalculation(
          40, // tamanho 40mm
          part.diameter40, // quantidade  
          !part.isHorizontal, // isVertical
          part.optionA, // isAluminum
          part.optionK, // isGlueTechnique
          false, // needsVordrucken
          false // needsHohlraum
          // Taxa padrão de 2.8€ será usada (definida na função hailCalculation)
        );
        totalAw += result.aw;
      }
      
      // Não adicionamos valor extra para pintura, pois já está computado corretamente 
      // na função hailCalculation e nos requisitos do projeto
      // if (part.optionP) totalAw += 15; // Removido o adicional arbitrário de 15 pontos
    }
  });
  
  return Math.round(totalAw); // Arredonda para o número inteiro mais próximo
}

// Função de cálculo do valor monetário baseado no AW
function calculateValue(aw: number) {
  // Taxa base por AW (valor em euros)
  const ratePerAw = 2.8;
  
  // Arredonda para 2 casas decimais e depois para um número inteiro se for um valor exato
  const value = Math.round((aw * ratePerAw) * 100) / 100;
  return value;
}

export default function BudgetPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isGestor = user?.role === 'manager';
  
  // Estados para o formulário
  const [showDialog, setShowDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false); // Dialog separado para visualização
  const [isViewMode, setIsViewMode] = useState(false);
  const [selectedBudget, setSelectedBudget] = useState<Budget | null>(null);
  
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedClient, setSelectedClient] = useState<number | null>(null);
  const [manualVehicleInfo, setManualVehicleInfo] = useState('');
  const [totalAw, setTotalAw] = useState(0);
  const [totalValue, setTotalValue] = useState(0);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [licensePlate, setLicensePlate] = useState('');
  const [chassisNumber, setChassisNumber] = useState('');
  const [damagedParts, setDamagedParts] = useState<Record<string, PartDamage>>(initialDamagedParts);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Consultas
  const { data: clients } = useQuery({
    queryKey: ['/api/clients'],
    select: (data) => data as Client[],
  });

  const { data: budgets = [], isLoading } = useQuery({
    queryKey: ['/api/budgets'],
    select: (data) => data as Budget[],
  });

  // Mutations
  const createBudgetMutation = useMutation({
    mutationFn: async (budgetData: any) => {
      return await apiRequest('/api/budgets', 'POST', budgetData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/budgets'] });
      setShowDialog(false);
      toast({
        title: "Orçamento criado",
        description: "O orçamento foi criado com sucesso.",
      });
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: `Erro ao criar orçamento: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const updateBudgetMutation = useMutation({
    mutationFn: async (budgetData: any) => {
      return await apiRequest(`/api/budgets/${selectedBudget?.id}`, 'PATCH', budgetData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/budgets'] });
      setShowDialog(false);
      toast({
        title: "Orçamento atualizado",
        description: "O orçamento foi atualizado com sucesso.",
      });
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: `Erro ao atualizar orçamento: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const deleteBudgetMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest(`/api/budgets/${id}`, 'DELETE');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/budgets'] });
      toast({
        title: "Orçamento excluído",
        description: "O orçamento foi excluído com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: `Erro ao excluir orçamento: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Atualização quando uma peça é modificada
  const handlePartChange = (key: string, updatedPart: PartDamage) => {
    // Atualiza o estado das peças
    const updatedParts = { 
      ...damagedParts, 
      [key]: updatedPart 
    };
    setDamagedParts(updatedParts);
    
    // Recalcula o AW total
    const newAw = calculateAw(updatedParts);
    setTotalAw(newAw);
    
    // Recalcula o valor monetário
    const newValue = calculateValue(newAw);
    setTotalValue(newValue);
  };

  // Funções auxiliares
  const resetForm = () => {
    setDate(new Date().toISOString().split('T')[0]);
    setSelectedClient(null);
    setManualVehicleInfo('');
    setTotalAw(0);
    setTotalValue(0);
    setPhotoUrl(null);
    setNote('');
    setLicensePlate('');
    setChassisNumber('');
    setDamagedParts(initialDamagedParts);
    setIsViewMode(false);
    setSelectedBudget(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setPhotoUrl(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePhotoUpload = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleCreateBudget = () => {
    if (!selectedClient && !isViewMode) {
      toast({
        title: "Campo obrigatório",
        description: "Por favor, selecione um cliente.",
        variant: "destructive",
      });
      return;
    }

    if (!manualVehicleInfo && !isViewMode) {
      toast({
        title: "Campo obrigatório",
        description: "Por favor, informe o veículo.",
        variant: "destructive",
      });
      return;
    }

    const budgetData = {
      client_id: selectedClient,
      vehicle_info: manualVehicleInfo,
      date: date,
      total_aw: totalAw,
      total_value: totalValue,
      photo_url: photoUrl,
      note: note,
      plate: licensePlate,
      chassisNumber: chassisNumber,
    };

    if (selectedBudget && selectedBudget.id) {
      updateBudgetMutation.mutate(budgetData);
    } else {
      createBudgetMutation.mutate(budgetData);
    }
  };

  const handleViewBudget = (id: number) => {
    const budget = budgets.find(b => b.id === id);
    if (budget) {
      setSelectedBudget(budget);
      setDate(budget.date || new Date().toISOString().split('T')[0]);
      setManualVehicleInfo(budget.vehicle_info || '');
      setTotalAw(budget.total_aw || 0);
      setTotalValue(budget.total_value || 0);
      setPhotoUrl(budget.photo_url || null);
      setNote(budget.note || '');
      setLicensePlate(budget.plate || '');
      setChassisNumber(budget.chassisNumber || '');
      setIsViewMode(true);
      
      // Abre o dialog adequado dependendo do tipo de usuário
      if (isGestor) {
        setShowViewDialog(true); // Diálogo de visualização para gestores
      } else {
        setShowDialog(true); // Diálogo principal para técnicos/admin
      }
    }
  };

  const handleDeleteBudget = (id: number) => {
    if (window.confirm("Tem certeza que deseja excluir este orçamento?")) {
      deleteBudgetMutation.mutate(id);
    }
  };

  return (
    <div className="py-6 px-4 sm:px-6 lg:px-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Orçamentos</h1>
          <p className="text-muted-foreground">Gerencie orçamentos para seus clientes</p>
        </div>
        
        {/* Botão "Novo Orçamento" aparece apenas para não-gestores */}
        {!isGestor && (
          <Dialog open={showDialog} onOpenChange={(open) => {
            if (!open) {
              setIsViewMode(false);
              setSelectedBudget(null);
            }
            setShowDialog(open);
          }}>
            <DialogTrigger asChild>
              <Button>
                <PlusIcon className="h-4 w-4 mr-2" />
                Novo Orçamento
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle>
                  {isViewMode ? `Visualizar Orçamento #${selectedBudget?.id}` : 'Criar Novo Orçamento'}
                </DialogTitle>
                <DialogDescription>
                  {isViewMode 
                    ? `Detalhes do orçamento para ${selectedBudget?.client_name}.`
                    : 'Preencha os detalhes para criar um novo orçamento para o cliente.'}
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-6 py-4 max-h-[70vh] overflow-y-auto">
                {/* Formulário simplificado */}
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="date">Data</Label>
                      <Input
                        id="date"
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        readOnly={isViewMode}
                        disabled={isViewMode}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="client">Cliente</Label>
                      <Select 
                        value={selectedClient?.toString() || ""} 
                        onValueChange={(value) => {
                          if (!isViewMode && value) {
                            setSelectedClient(parseInt(value));
                          } else if (!isViewMode) {
                            setSelectedClient(null);
                          }
                        }}
                        disabled={isViewMode}
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
                        readOnly={isViewMode}
                        disabled={isViewMode}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="licensePlate">Placa</Label>
                      <Input
                        id="licensePlate"
                        placeholder="Ex: ABC-1234"
                        value={licensePlate}
                        onChange={(e) => setLicensePlate(e.target.value)}
                        readOnly={isViewMode}
                        disabled={isViewMode}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="chassisNumber">Chassi</Label>
                      <Input
                        id="chassisNumber"
                        placeholder="Ex: 9BW11111111111111"
                        value={chassisNumber}
                        onChange={(e) => setChassisNumber(e.target.value)}
                        readOnly={isViewMode}
                        disabled={isViewMode}
                      />
                    </div>
                  </div>
                </div>
                
                {/* Grid de Peças do Carro */}
                <div className="space-y-4">
                  <Label>Danos do Veículo</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {/* Linha 1 */}
                    <DamagedPartItem partKey="paraLamaEsquerdo" label="Para-lama Esquerdo" isViewMode={isViewMode} onChange={handlePartChange} />
                    <DamagedPartItem partKey="capo" label="Capô" isHorizontal={true} isViewMode={isViewMode} onChange={handlePartChange} />
                    <DamagedPartItem partKey="paraLamaDireito" label="Para-lama Direito" isViewMode={isViewMode} onChange={handlePartChange} />
                    
                    {/* Linha 2 */}
                    <DamagedPartItem partKey="colunaEsquerda" label="Coluna Esquerda" isViewMode={isViewMode} onChange={handlePartChange} />
                    <DamagedPartItem partKey="teto" label="Teto" isHorizontal={true} isViewMode={isViewMode} onChange={handlePartChange} />
                    <DamagedPartItem partKey="colunaDireita" label="Coluna Direita" isViewMode={isViewMode} onChange={handlePartChange} />
                    
                    {/* Linha 3 */}
                    <DamagedPartItem partKey="portaDianteiraEsquerda" label="Porta Dianteira Esq." isViewMode={isViewMode} onChange={handlePartChange} />
                    
                    <div className="flex justify-center items-center p-2 border rounded-md">
                      {/* Input file oculto */}
                      <input 
                        type="file"
                        accept="image/*"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        style={{ display: 'none' }}
                      />
                      
                      {/* Exibir foto se existir ou mostrar botão/ícone */}
                      {photoUrl ? (
                        <div className="w-full h-full flex flex-col items-center justify-center min-h-[135px] relative">
                          <img 
                            src={photoUrl} 
                            alt="Foto do veículo" 
                            className="max-h-[135px] max-w-full object-contain"
                          />
                          {!isViewMode && (
                            <Button
                              variant="destructive"
                              size="sm"
                              className="absolute top-1 right-1"
                              onClick={() => setPhotoUrl(null)}
                            >
                              <Trash2Icon className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      ) : isViewMode ? (
                        <div className="w-full h-full flex flex-col items-center justify-center min-h-[135px] text-gray-400">
                          <CameraIcon className="h-10 w-10 mb-2" />
                          <span className="text-sm">Sem foto</span>
                        </div>
                      ) : (
                        <Button
                          variant="outline"
                          className="w-full h-full flex flex-col items-center justify-center min-h-[135px]"
                          onClick={handlePhotoUpload}
                        >
                          <CameraIcon className="h-10 w-10 mb-2" />
                          <span className="text-sm">Adicionar Foto</span>
                        </Button>
                      )}
                    </div>
                    
                    <DamagedPartItem partKey="portaDianteiraDireita" label="Porta Dianteira Dir." isViewMode={isViewMode} onChange={handlePartChange} />
                    
                    {/* Linha 4 */}
                    <DamagedPartItem partKey="portaTraseiraEsquerda" label="Porta Traseira Esq." isViewMode={isViewMode} onChange={handlePartChange} />
                    <DamagedPartItem partKey="portaMalasSuperior" label="Porta Malas Superior" isHorizontal={true} isViewMode={isViewMode} onChange={handlePartChange} />
                    <DamagedPartItem partKey="portaTraseiraDireita" label="Porta Traseira Dir." isViewMode={isViewMode} onChange={handlePartChange} />
                    
                    {/* Linha 5 */}
                    <DamagedPartItem partKey="lateralEsquerda" label="Lateral Esquerda" isViewMode={isViewMode} onChange={handlePartChange} />
                    <DamagedPartItem partKey="portaMalasInferior" label="Porta Malas Inferior" isViewMode={isViewMode} onChange={handlePartChange} />
                    <DamagedPartItem partKey="lateralDireita" label="Lateral Direita" isViewMode={isViewMode} onChange={handlePartChange} />
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
                
                {/* Totais - não mostrados para gestores */}
                {!isGestor && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="totalAw">Total de AW</Label>
                      <Input
                        id="totalAw"
                        type="number"
                        min="0"
                        max="99999"
                        value={Math.round(totalAw)}
                        onChange={(e) => setTotalAw(Number(e.target.value))}
                        onFocus={(e) => e.target.select()}
                        autoComplete="off"
                        readOnly={isViewMode}
                        disabled={isViewMode}
                      />
                    </div>
                  
                    <div className="space-y-2">
                      <Label htmlFor="totalValue">Total em €</Label>
                      <Input
                        id="totalValue"
                        type="number"
                        min="0"
                        max="9999999"
                        value={totalValue.toFixed(2)}
                        onChange={(e) => setTotalValue(Number(e.target.value))}
                        onFocus={(e) => e.target.select()}
                        autoComplete="off"
                        readOnly={isViewMode}
                        disabled={isViewMode}
                      />
                    </div>
                  </div>
                )}
                
                {/* Observações */}
                <div className="space-y-2">
                  <Label htmlFor="note">Observações</Label>
                  <Textarea
                    id="note"
                    placeholder="Observações sobre o orçamento..."
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={3}
                    readOnly={isViewMode}
                    disabled={isViewMode}
                  />
                </div>
              </div>
              
              <DialogFooter>
                {isViewMode ? (
                  <>
                    <Button variant="outline" onClick={() => setShowDialog(false)}>
                      Fechar
                    </Button>
                    {!isGestor && (
                      <Button 
                        variant="secondary"
                        onClick={() => setIsViewMode(false)}
                        className="mr-2"
                      >
                        <PencilIcon className="h-4 w-4 mr-2" />
                        Editar
                      </Button>
                    )}
                  </>
                ) : (
                  <>
                    <Button variant="outline" onClick={() => setShowDialog(false)}>
                      Cancelar
                    </Button>
                    <Button 
                      onClick={handleCreateBudget} 
                      disabled={createBudgetMutation.isPending}
                    >
                      {createBudgetMutation.isPending ? "Criando..." : "Criar Orçamento"}
                    </Button>
                  </>
                )}
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
      
      {/* Dialog de Visualização para Gestores */}
      <Dialog open={showViewDialog} onOpenChange={(open) => {
        if (!open) {
          setIsViewMode(false);
          setSelectedBudget(null);
        }
        setShowViewDialog(open);
      }}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              Visualizar Orçamento #{selectedBudget?.id}
            </DialogTitle>
            <DialogDescription>
              Detalhes do orçamento para {selectedBudget?.client_name}.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4 max-h-[70vh] overflow-y-auto">
            {/* Formulário simplificado */}
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="date-view">Data</Label>
                  <Input
                    id="date-view"
                    type="date"
                    value={date}
                    readOnly
                    disabled
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="client-view">Cliente</Label>
                  <Input
                    id="client-view"
                    value={selectedBudget?.client_name || ""}
                    readOnly
                    disabled
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="vehicleInfo-view">Veículo</Label>
                  <Input
                    id="vehicleInfo-view"
                    value={manualVehicleInfo}
                    readOnly
                    disabled
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="licensePlate-view">Placa</Label>
                  <Input
                    id="licensePlate-view"
                    value={licensePlate}
                    readOnly
                    disabled
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="chassisNumber-view">Chassi</Label>
                  <Input
                    id="chassisNumber-view"
                    value={chassisNumber}
                    readOnly
                    disabled
                  />
                </div>
              </div>
            </div>
            
            {/* Grid de Peças do Carro */}
            <div className="space-y-4">
              <Label>Danos do Veículo</Label>
              <div className="grid grid-cols-3 gap-2">
                {/* Linha 1 */}
                <DamagedPartItem partKey="paraLamaEsquerdo" label="Para-lama Esquerdo" isViewMode={true} />
                <DamagedPartItem partKey="capo" label="Capô" isHorizontal={true} isViewMode={true} />
                <DamagedPartItem partKey="paraLamaDireito" label="Para-lama Direito" isViewMode={true} />
                
                {/* Linha 2 */}
                <DamagedPartItem partKey="colunaEsquerda" label="Coluna Esquerda" isViewMode={true} />
                <DamagedPartItem partKey="teto" label="Teto" isHorizontal={true} isViewMode={true} />
                <DamagedPartItem partKey="colunaDireita" label="Coluna Direita" isViewMode={true} />
                
                {/* Linha 3 */}
                <DamagedPartItem partKey="portaDianteiraEsquerda" label="Porta Dianteira Esq." isViewMode={true} />
                
                <div className="flex justify-center items-center p-2 border rounded-md">
                  {photoUrl ? (
                    <div className="w-full h-full flex flex-col items-center justify-center min-h-[135px]">
                      <img 
                        src={photoUrl} 
                        alt="Foto do veículo" 
                        className="max-h-[135px] max-w-full object-contain"
                      />
                    </div>
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center min-h-[135px] text-gray-400">
                      <CameraIcon className="h-10 w-10 mb-2" />
                      <span className="text-sm">Sem foto</span>
                    </div>
                  )}
                </div>
                
                <DamagedPartItem partKey="portaDianteiraDireita" label="Porta Dianteira Dir." isViewMode={true} />
                
                {/* Linha 4 */}
                <DamagedPartItem partKey="portaTraseiraEsquerda" label="Porta Traseira Esq." isViewMode={true} />
                <DamagedPartItem partKey="portaMalasSuperior" label="Porta Malas Superior" isHorizontal={true} isViewMode={true} />
                <DamagedPartItem partKey="portaTraseiraDireita" label="Porta Traseira Dir." isViewMode={true} />
                
                {/* Linha 5 */}
                <DamagedPartItem partKey="lateralEsquerda" label="Lateral Esquerda" isViewMode={true} />
                <DamagedPartItem partKey="portaMalasInferior" label="Porta Malas Inferior" isViewMode={true} />
                <DamagedPartItem partKey="lateralDireita" label="Lateral Direita" isViewMode={true} />
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
            
            {/* Observações */}
            <div className="space-y-2">
              <Label htmlFor="note-view">Observações</Label>
              <Textarea
                id="note-view"
                value={note}
                readOnly
                disabled
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowViewDialog(false)}
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <div className="grid gap-6 mt-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Orçamentos</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">ID</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Veículo</TableHead>
                  <TableHead>Data</TableHead>
                  {!isGestor && <TableHead>Total AW</TableHead>}
                  {!isGestor && <TableHead className="text-right">Valor</TableHead>}
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={isGestor ? 5 : 7} className="text-center py-4">
                      Carregando...
                    </TableCell>
                  </TableRow>
                ) : budgets.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={isGestor ? 5 : 7} className="text-center py-4">
                      Nenhum orçamento encontrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  budgets.map((budget) => (
                    <TableRow key={budget.id}>
                      <TableCell>{budget.id}</TableCell>
                      <TableCell>{budget.client_name}</TableCell>
                      <TableCell>{budget.vehicle_info}</TableCell>
                      <TableCell>{formatDate(budget.date)}</TableCell>
                      {!isGestor && <TableCell>{Math.round(budget.total_aw || 0)}</TableCell>}
                      {!isGestor && <TableCell className="text-right">{formatCurrency(Number((budget.total_value || 0).toFixed(2)))}</TableCell>}
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewBudget(budget.id)}
                          >
                            <EyeIcon className="h-4 w-4" />
                          </Button>
                          
                          {!isGestor && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setIsViewMode(false);
                                  handleViewBudget(budget.id);
                                }}
                              >
                                <PencilIcon className="h-4 w-4" />
                              </Button>
                              
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDeleteBudget(budget.id)}
                              >
                                <Trash2Icon className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}