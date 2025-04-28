import React, { useState, useEffect, useRef, createContext, useContext } from "react";
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
  Eye as EyeIcon,
  Printer as PrinterIcon
} from "lucide-react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

interface Budget {
  id: number;
  client_id: number;
  client_name: string;
  vehicle_info: string;
  date: string;
  damaged_parts?: string | string[]; // Pode ser uma string JSON ou um array
  photo_url?: string;
  total_aw?: number;
  total_value?: number;
  created_at: string;
  note?: string;
  plate?: string;
  chassisNumber?: string;
  chassis_number?: string; // Variação do nome no banco de dados
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

// Definir contexto para compartilhar dados de peças danificadas
interface DamagedPartsContextType {
  damagedParts: Record<string, PartDamage>;
  updateDamagedPart: (key: string, damage: PartDamage) => void;
}

const DamagedPartsContext = createContext<DamagedPartsContextType | null>(null);

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
  onChange,
  initialDamage
}: { 
  partKey: string; 
  label: string; 
  isHorizontal?: boolean; 
  isViewMode?: boolean;
  onChange?: (key: string, value: PartDamage) => void;
  initialDamage?: PartDamage;
}) {
  // Usar o estado global para damagedParts
  const damagedPartsContext = useContext(DamagedPartsContext);
  const partsData = damagedPartsContext?.damagedParts || {};
  
  // Use o estado local apenas para edição
  const [localDamage, setLocalDamage] = useState<PartDamage>({ 
    selected: false, 
    diameter20: 0, 
    diameter30: 0, 
    diameter40: 0, 
    optionA: false, 
    optionK: false, 
    optionP: false, 
    isHorizontal: isHorizontal 
  });
  
  // Obtenha os dados de dano para esta parte específica
  const partData = partsData[partKey] || initialDamagedParts[partKey] || localDamage;
  
  // Efeito para atualizar o estado local a partir de props ou contexto
  useEffect(() => {
    if (initialDamage) {
      setLocalDamage(initialDamage);
    } else if (partsData[partKey]) {
      setLocalDamage(partsData[partKey]);
    }
  }, [initialDamage, partsData, partKey]);
  
  // Determinar qual fonte de dados usar
  const damage = isViewMode
    ? (initialDamage || partsData[partKey] || localDamage)
    : localDamage;
  
  // Log para debug - remover em produção
  useEffect(() => {
    if (partKey === 'capo' || partKey === 'paraLamaEsquerdo') {
      console.log(`[${partKey}] Renderizando com damage:`, damage);
      console.log(`[${partKey}] partsData:`, partsData[partKey]);
      console.log(`[${partKey}] initialDamage:`, initialDamage);
    }
  }, [damage, partKey, partsData, initialDamage]);
  
  const updateDamage = (field: keyof PartDamage, value: any) => {
    const updatedDamage = { ...localDamage, [field]: value };
    
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
    setLocalDamage(updatedDamage);
    
    // Notifica o componente pai sobre a mudança
    if (onChange) {
      onChange(partKey, updatedDamage);
    }
  };
  
  // Se estiver no modo de visualização, mostramos um formato mais simples
  if (isViewMode) {
    return (
      <div className={`border rounded-md p-2 space-y-2 overflow-hidden ${damage.selected ? 'border-blue-500' : ''}`}>
        <div className="text-center mb-2 text-sm font-medium truncate">
          {label}
        </div>
        <div className="space-y-2">
          <div className="flex justify-between items-center gap-1">
            <span className="text-xs whitespace-nowrap">20mm:</span>
            <span className="text-xs sm:text-sm text-right font-medium bg-gray-50 rounded px-2 py-1 w-16 inline-block">
              {damage.diameter20 || '0'}
            </span>
          </div>
          <div className="flex justify-between items-center gap-1">
            <span className="text-xs whitespace-nowrap">30mm:</span>
            <span className="text-xs sm:text-sm text-right font-medium bg-gray-50 rounded px-2 py-1 w-16 inline-block">
              {damage.diameter30 || '0'}
            </span>
          </div>
          <div className="flex justify-between items-center gap-1">
            <span className="text-xs whitespace-nowrap">40mm:</span>
            <span className="text-xs sm:text-sm text-right font-medium bg-gray-50 rounded px-2 py-1 w-16 inline-block">
              {damage.diameter40 || '0'}
            </span>
          </div>
          <div className="flex justify-between pt-1">
            <div className="flex items-center gap-0.5">
              <div className={`w-4 h-4 rounded border ${damage.optionA ? 'bg-red-100 border-red-300' : 'bg-gray-100 border-gray-300'}`}>
                {damage.optionA && <span className="flex items-center justify-center text-xs">✓</span>}
              </div>
              <Label className="rounded px-1 text-xs bg-red-100">A</Label>
            </div>
            <div className="flex items-center gap-0.5">
              <div className={`w-4 h-4 rounded border ${damage.optionK ? 'bg-blue-100 border-blue-300' : 'bg-gray-100 border-gray-300'}`}>
                {damage.optionK && <span className="flex items-center justify-center text-xs">✓</span>}
              </div>
              <Label className="rounded px-1 text-xs bg-blue-100">K</Label>
            </div>
            <div className="flex items-center gap-0.5">
              <div className={`w-4 h-4 rounded border ${damage.optionP ? 'bg-green-100 border-green-300' : 'bg-gray-100 border-gray-300'}`}>
                {damage.optionP && <span className="flex items-center justify-center text-xs">✓</span>}
              </div>
              <Label className="rounded px-1 text-xs bg-green-100">P</Label>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  // Modo de edição
  return (
    <div className="border rounded-md p-2 space-y-2 overflow-hidden">
      <div className="text-center mb-2 text-sm font-medium truncate">
        {label}
      </div>
      <div className="space-y-2">
        <div className="flex justify-between items-center gap-1">
          <span className="text-xs whitespace-nowrap">20mm:</span>
          <Input 
            type="number" 
            className="w-full min-w-0 h-7 px-1 text-xs sm:text-sm text-right"
            value={damage.diameter20 > 0 ? damage.diameter20.toString() : ''}
            onChange={(e) => updateDamage('diameter20', e.target.value)}
            min="0"
          />
        </div>
        <div className="flex justify-between items-center gap-1">
          <span className="text-xs whitespace-nowrap">30mm:</span>
          <Input 
            type="number" 
            className="w-full min-w-0 h-7 px-1 text-xs sm:text-sm text-right"
            value={damage.diameter30 > 0 ? damage.diameter30.toString() : ''}
            onChange={(e) => updateDamage('diameter30', e.target.value)}
            min="0"
          />
        </div>
        <div className="flex justify-between items-center gap-1">
          <span className="text-xs whitespace-nowrap">40mm:</span>
          <Input 
            type="number" 
            className="w-full min-w-0 h-7 px-1 text-xs sm:text-sm text-right"
            value={damage.diameter40 > 0 ? damage.diameter40.toString() : ''}
            onChange={(e) => updateDamage('diameter40', e.target.value)}
            min="0"
          />
        </div>
        <div className="flex justify-between pt-1">
          <div className="flex items-center gap-0.5">
            <Checkbox 
              id={`${partKey}-a`} 
              className="w-3.5 h-3.5 sm:w-4 sm:h-4"
              checked={damage.optionA}
              onCheckedChange={(checked) => updateDamage('optionA', !!checked)}
            />
            <Label htmlFor={`${partKey}-a`} className="rounded px-1 text-xs bg-red-100">A</Label>
          </div>
          <div className="flex items-center gap-0.5">
            <Checkbox 
              id={`${partKey}-k`} 
              className="w-3.5 h-3.5 sm:w-4 sm:h-4"
              checked={damage.optionK}
              onCheckedChange={(checked) => updateDamage('optionK', !!checked)}
            />
            <Label htmlFor={`${partKey}-k`} className="rounded px-1 text-xs bg-blue-100">K</Label>
          </div>
          <div className="flex items-center gap-0.5">
            <Checkbox 
              id={`${partKey}-p`} 
              className="w-3.5 h-3.5 sm:w-4 sm:h-4"
              checked={damage.optionP}
              onCheckedChange={(checked) => updateDamage('optionP', !!checked)}
            />
            <Label htmlFor={`${partKey}-p`} className="rounded px-1 text-xs bg-green-100">P</Label>
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
  const isGestor = user?.role === 'gestor' || user?.role === 'manager';
  const isTechnician = user?.role === 'technician';
  
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
  
  // Criar o valor do contexto
  const damagedPartsContextValue = {
    damagedParts,
    updateDamagedPart: (key: string, damage: PartDamage) => {
      setDamagedParts(prev => ({
        ...prev,
        [key]: damage
      }));
    }
  };

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
      damaged_parts: JSON.stringify(damagedParts), // Incluir informações sobre as peças danificadas
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
      // Log para debug
      console.log("Orçamento selecionado:", budget);
      console.log("URL da imagem no orçamento:", budget.photo_url);
      
      setSelectedBudget(budget);
      // Importante: definir o cliente selecionado
      setSelectedClient(budget.client_id);
      setDate(budget.date || new Date().toISOString().split('T')[0]);
      setManualVehicleInfo(budget.vehicle_info || '');
      setTotalAw(budget.total_aw || 0);
      setTotalValue(budget.total_value || 0);
      setPhotoUrl(budget.photo_url || null);
      setNote(budget.note || '');
      setLicensePlate(budget.plate || '');
      setChassisNumber(budget.chassisNumber || '');
      
      // Carregar informações das peças danificadas, se disponíveis
      if (budget.damaged_parts) {
        try {
          let parsedDamagedParts;
          if (typeof budget.damaged_parts === 'string') {
            parsedDamagedParts = JSON.parse(budget.damaged_parts);
          } else {
            // Se já for um objeto (mais improvável), vamos tentar usá-lo diretamente
            parsedDamagedParts = budget.damaged_parts;
          }
          console.log("Carregando peças danificadas:", parsedDamagedParts);
          
          // Certifique-se de que parsedDamagedParts seja um objeto
          if (parsedDamagedParts && typeof parsedDamagedParts === 'object') {
            const damagedPartsCopy = {...initialDamagedParts}; // Começar com os valores padrão
            
            // Mesclar com os valores do banco de dados
            Object.keys(parsedDamagedParts).forEach(key => {
              if (damagedPartsCopy[key]) {
                damagedPartsCopy[key] = {
                  ...damagedPartsCopy[key],
                  ...parsedDamagedParts[key]
                };
              }
            });
            
            // Atualizar o estado
            setDamagedParts(damagedPartsCopy);
            
            // Debug dos valores após o processamento
            console.log("Valores de damaged parts após processamento:", damagedPartsCopy);
          }
        } catch (error) {
          console.error("Erro ao fazer parse das peças danificadas:", error);
        }
      }
      
      setIsViewMode(true);
      
      console.log("Carregando orçamento para edição:", budget);
      
      // Abre o dialog adequado dependendo do tipo de usuário
      if (isGestor) {
        // Aguarde a atualização do estado antes de abrir o diálogo
        setTimeout(() => {
          setShowViewDialog(true); // Diálogo de visualização somente para gestores
        }, 50);
      } else {
        // Aguarde a atualização do estado antes de abrir o diálogo
        setTimeout(() => {
          setShowDialog(true); // Diálogo principal para admin e técnicos
        }, 50);
      }
    }
  };

  const handleDeleteBudget = (id: number) => {
    if (window.confirm("Tem certeza que deseja excluir este orçamento?")) {
      deleteBudgetMutation.mutate(id);
    }
  };
  
  // Função para gerar o PDF a partir do conteúdo
  const handlePrintBudget = async () => {
    console.log("Iniciando geração do PDF");
    if (!selectedBudget) {
      console.error("Nenhum orçamento selecionado");
      return;
    }
    
    toast({
      title: "Gerando PDF...",
      description: "Aguarde enquanto o documento é preparado para impressão.",
    });
    
    try {
      // Criamos um elemento temporário que será renderizado apenas para gerar o PDF
      const printDiv = document.createElement('div');
      printDiv.className = 'print-content';
      printDiv.style.width = '210mm'; // Tamanho A4
      printDiv.style.padding = '15px'; 
      printDiv.style.fontFamily = 'Arial, sans-serif';
      printDiv.style.fontSize = '11px';
      printDiv.style.position = 'fixed';
      printDiv.style.top = '-9999px';
      printDiv.style.left = '-9999px';
      printDiv.style.backgroundColor = '#ffffff';

      // Formatação da data no formato "Hoje, HH:MM"
      const formatDisplayDate = (dateString: string) => {
        const date = new Date(dateString);
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        return `Hoje, ${hours}:${minutes}`;
      };
      
      // Cabeçalho no novo formato
      const headerDiv = document.createElement('div');
      headerDiv.style.marginBottom = '15px';
      headerDiv.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
          <div>
            <div style="color: #0047AB; font-weight: bold; font-size: 14px;">Orçamento #${selectedBudget.id}</div>
            <div style="color: #0047AB; font-size: 12px;">Euro Dent Experts</div>
          </div>
          <div style="text-align: right; font-size: 11px;">
            Data de emissão: ${formatDate(new Date().toISOString())}
          </div>
        </div>
        <div style="height: 1px; background-color: #0047AB; margin: 8px 0;"></div>
      `;
      printDiv.appendChild(headerDiv);
      
      // Informações do cliente no novo formato
      const clientInfoDiv = document.createElement('div');
      clientInfoDiv.style.marginBottom = '15px';
      clientInfoDiv.innerHTML = `
        <div style="font-weight: bold; margin-bottom: 8px; font-size: 13px;">Detalhes do orçamento para:</div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
          <div>
            <div style="color: #0047AB; font-weight: bold; font-size: 11px; margin-bottom: 3px;">DATA</div>
            <div style="border: 1px solid #ddd; padding: 5px; border-radius: 3px; background-color: #f9f9f9;">${formatDisplayDate(selectedBudget.date)}</div>
          </div>
          <div>
            <div style="color: #0047AB; font-weight: bold; font-size: 11px; margin-bottom: 3px;">CLIENTE</div>
            <div style="border: 1px solid #ddd; padding: 5px; border-radius: 3px; background-color: #f9f9f9;">${selectedBudget.client_name}</div>
          </div>
          <div>
            <div style="color: #0047AB; font-weight: bold; font-size: 11px; margin-bottom: 3px;">VEÍCULO</div>
            <div style="border: 1px solid #ddd; padding: 5px; border-radius: 3px; background-color: #f9f9f9;">${selectedBudget.vehicle_info}</div>
          </div>
          <div>
            <div style="color: #0047AB; font-weight: bold; font-size: 11px; margin-bottom: 3px;">PLACA</div>
            <div style="border: 1px solid #ddd; padding: 5px; border-radius: 3px; background-color: #f9f9f9;">${selectedBudget.plate || '-'}</div>
          </div>
          <div>
            <div style="color: #0047AB; font-weight: bold; font-size: 11px; margin-bottom: 3px;">CHASSI</div>
            <div style="border: 1px solid #ddd; padding: 5px; border-radius: 3px; background-color: #f9f9f9;">${selectedBudget.chassisNumber || selectedBudget.chassis_number || '-'}</div>
          </div>
        </div>
      `;
      printDiv.appendChild(clientInfoDiv);
      
      // Danos do veículo no novo formato
      const damagesDiv = document.createElement('div');
      damagesDiv.style.marginBottom = '15px';
      damagesDiv.innerHTML = `
        <div style="font-weight: bold; margin-bottom: 8px; font-size: 13px; display: flex; align-items: center;">
          <svg width="16" height="16" viewBox="0 0 24 24" style="margin-right: 5px;">
            <path fill="#0047AB" d="M7.41,8.58L12,13.17L16.59,8.58L18,10L12,16L6,10L7.41,8.58Z" />
          </svg>
          Danos do Veículo
        </div>
        <div id="damaged-parts-grid" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 15px;">
        </div>
        <div style="margin-bottom: 10px; padding: 5px; font-size: 11px; text-align: center;">
          <strong>MATERIAIS ESPECIAIS:</strong> <span style="color: #ff0000; font-weight: bold;">A</span>= ALUMÍNIO &nbsp;&nbsp; <span style="color: #0000ff; font-weight: bold;">K</span>= COLA &nbsp;&nbsp; <span style="color: #00aa00; font-weight: bold;">P</span>= PINTURA
        </div>
      `;
      printDiv.appendChild(damagesDiv);
      
      // Observações
      if (selectedBudget.note) {
        const notesDiv = document.createElement('div');
        notesDiv.style.marginBottom = '15px';
        notesDiv.innerHTML = `
          <div style="font-weight: bold; margin-bottom: 8px; font-size: 13px; display: flex; align-items: center;">
            <svg width="16" height="16" viewBox="0 0 24 24" style="margin-right: 5px;">
              <path fill="#0047AB" d="M7.41,8.58L12,13.17L16.59,8.58L18,10L12,16L6,10L7.41,8.58Z" />
            </svg>
            Observações
          </div>
          <div style="padding: 8px; border: 1px solid #ddd; border-radius: 3px; font-size: 11px; background-color: #f9f9f9;">
            ${selectedBudget.note}
          </div>
        `;
        printDiv.appendChild(notesDiv);
      }
      
      // Rodapé
      const footerDiv = document.createElement('div');
      footerDiv.style.textAlign = 'center';
      footerDiv.style.fontSize = '10px';
      footerDiv.style.color = '#666';
      footerDiv.style.marginTop = '20px';
      footerDiv.innerHTML = `
        Orçamento #${selectedBudget.id} · Euro Dent Experts · Gerado em ${formatDate(new Date().toISOString())}
      `;
      printDiv.appendChild(footerDiv);
      
      // Adicionamos o elemento ao documento
      document.body.appendChild(printDiv);
      
      // Processamos as peças danificadas
      const gridElement = printDiv.querySelector('#damaged-parts-grid');
      if (gridElement) {
        try {
          // Nomes amigáveis para as partes
          const partNames: Record<string, string> = {
            capo: 'Capô',
            teto: 'Teto',
            portaMalasSuperior: 'Porta Malas Superior',
            paraLamaEsquerdo: 'Para-lama Esquerdo',
            paraLamaDireito: 'Para-lama Direito',
            colunaEsquerda: 'Coluna Esquerda',
            colunaDireita: 'Coluna Direita',
            portaDianteiraEsquerda: 'Porta Dianteira Esq.',
            portaDianteiraDireita: 'Porta Dianteira Dir.',
            portaTraseiraEsquerda: 'Porta Traseira Esq.',
            portaTraseiraDireita: 'Porta Traseira Dir.',
            lateralEsquerda: 'Lateral Esquerda',
            lateralDireita: 'Lateral Direita',
            portaMalasInferior: 'Porta Malas Inferior'
          };
          
          // Parse das peças danificadas (se existirem)
          let parsedDamagedParts: Record<string, PartDamage> = {};
          if (selectedBudget.damaged_parts) {
            if (typeof selectedBudget.damaged_parts === 'string') {
              parsedDamagedParts = JSON.parse(selectedBudget.damaged_parts);
            } else if (typeof selectedBudget.damaged_parts === 'object' && !Array.isArray(selectedBudget.damaged_parts)) {
              parsedDamagedParts = selectedBudget.damaged_parts as unknown as Record<string, PartDamage>;
            }
          }

          // Lista de todas as peças que queremos mostrar no grid, independente se estão danificadas ou não
          const allPartKeys = [
            'paraLamaEsquerdo', 'capo', 'paraLamaDireito',
            'colunaEsquerda', 'teto', 'colunaDireita',
            'portaDianteiraEsquerda', 'portaDianteiraDireita',
            'portaTraseiraEsquerda', 'portaMalasSuperior', 'portaTraseiraDireita',
            'lateralEsquerda', 'portaMalasInferior', 'lateralDireita'
          ];

          // Definição de um objeto padrão para peças não danificadas
          const defaultPartDamage: PartDamage = {
            selected: false,
            diameter20: 0,
            diameter30: 0,
            diameter40: 0,
            optionA: false,
            optionK: false,
            optionP: false,
            isHorizontal: false
          };

          // Iterar sobre todas as peças e renderizar todas, independente de estarem danificadas
          allPartKeys.forEach(key => {
            // Pegar dados da peça se existir, ou usar valores padrão
            const part = parsedDamagedParts[key] || { ...defaultPartDamage };
            
            // Alguns ajustes específicos para peças horizontais
            if (key === 'capo' || key === 'teto' || key === 'portaMalasSuperior') {
              part.isHorizontal = true;
            }
            
            const partDiv = document.createElement('div');
            partDiv.style.border = '1px solid #ddd';
            partDiv.style.margin = '0';
            partDiv.style.padding = '6px';
            partDiv.style.fontSize = '10px';
            
            // Criar o cabeçalho com o nome da peça
            const partHeader = document.createElement('div');
            partHeader.style.textAlign = 'center';
            partHeader.style.fontWeight = 'bold';
            partHeader.style.color = '#0047AB';
            partHeader.style.fontSize = '11px';
            partHeader.style.marginBottom = '5px';
            partHeader.style.whiteSpace = 'nowrap';
            partHeader.style.overflow = 'hidden';
            partHeader.style.textOverflow = 'ellipsis';
            partHeader.innerText = partNames[key] || key;
            partDiv.appendChild(partHeader);
            
            // Criar os campos de diâmetros
            const diametersDiv = document.createElement('div');
            
            // 20mm
            const div20mm = document.createElement('div');
            div20mm.style.display = 'flex';
            div20mm.style.justifyContent = 'space-between';
            div20mm.style.marginBottom = '6px';
            div20mm.style.alignItems = 'center';
            
            const label20mm = document.createElement('span');
            label20mm.innerText = '20mm:';
            label20mm.style.fontSize = '10px';
            div20mm.appendChild(label20mm);
            
            const input20mm = document.createElement('div');
            input20mm.style.width = '35px';
            input20mm.style.height = '14px';
            input20mm.style.border = '1px solid #ccc';
            input20mm.style.display = 'flex';
            input20mm.style.justifyContent = 'center';
            input20mm.style.alignItems = 'center';
            input20mm.style.fontSize = '10px';
            input20mm.style.backgroundColor = part.diameter20 > 0 ? '#f4f4f4' : 'white';
            input20mm.innerText = part.diameter20 > 0 ? part.diameter20.toString() : '';
            div20mm.appendChild(input20mm);
            
            diametersDiv.appendChild(div20mm);
            
            // 30mm
            const div30mm = document.createElement('div');
            div30mm.style.display = 'flex';
            div30mm.style.justifyContent = 'space-between';
            div30mm.style.marginBottom = '6px';
            div30mm.style.alignItems = 'center';
            
            const label30mm = document.createElement('span');
            label30mm.innerText = '30mm:';
            label30mm.style.fontSize = '10px';
            div30mm.appendChild(label30mm);
            
            const input30mm = document.createElement('div');
            input30mm.style.width = '35px';
            input30mm.style.height = '14px';
            input30mm.style.border = '1px solid #ccc';
            input30mm.style.display = 'flex';
            input30mm.style.justifyContent = 'center';
            input30mm.style.alignItems = 'center';
            input30mm.style.fontSize = '10px';
            input30mm.style.backgroundColor = part.diameter30 > 0 ? '#f4f4f4' : 'white';
            input30mm.innerText = part.diameter30 > 0 ? part.diameter30.toString() : '';
            div30mm.appendChild(input30mm);
            
            diametersDiv.appendChild(div30mm);
            
            // 40mm
            const div40mm = document.createElement('div');
            div40mm.style.display = 'flex';
            div40mm.style.justifyContent = 'space-between';
            div40mm.style.marginBottom = '6px';
            div40mm.style.alignItems = 'center';
            
            const label40mm = document.createElement('span');
            label40mm.innerText = '40mm:';
            label40mm.style.fontSize = '10px';
            div40mm.appendChild(label40mm);
            
            const input40mm = document.createElement('div');
            input40mm.style.width = '35px';
            input40mm.style.height = '14px';
            input40mm.style.border = '1px solid #ccc';
            input40mm.style.display = 'flex';
            input40mm.style.justifyContent = 'center';
            input40mm.style.alignItems = 'center';
            input40mm.style.fontSize = '10px';
            input40mm.style.backgroundColor = part.diameter40 > 0 ? '#f4f4f4' : 'white';
            input40mm.innerText = part.diameter40 > 0 ? part.diameter40.toString() : '';
            div40mm.appendChild(input40mm);
            
            diametersDiv.appendChild(div40mm);
            
            partDiv.appendChild(diametersDiv);
            
            // Criar os checkboxes A, K, P
            const optionsDiv = document.createElement('div');
            optionsDiv.style.display = 'flex';
            optionsDiv.style.justifyContent = 'space-between';
            optionsDiv.style.alignItems = 'center';
            
            // Opção A
            const optionADiv = document.createElement('div');
            optionADiv.style.display = 'flex';
            optionADiv.style.alignItems = 'center';
            
            const checkboxA = document.createElement('div');
            checkboxA.style.width = '12px';
            checkboxA.style.height = '12px';
            checkboxA.style.border = '1px solid #ccc';
            checkboxA.style.backgroundColor = part.optionA ? '#ff8888' : 'white';
            checkboxA.style.marginRight = '2px';
            checkboxA.style.display = 'flex';
            checkboxA.style.justifyContent = 'center';
            checkboxA.style.alignItems = 'center';
            checkboxA.style.fontSize = '8px';
            checkboxA.innerHTML = part.optionA ? '✓' : '';
            optionADiv.appendChild(checkboxA);
            
            const labelA = document.createElement('span');
            labelA.style.color = '#ff0000';
            labelA.style.fontWeight = 'bold';
            labelA.style.fontSize = '10px';
            labelA.innerText = 'A';
            optionADiv.appendChild(labelA);
            
            optionsDiv.appendChild(optionADiv);
            
            // Opção K
            const optionKDiv = document.createElement('div');
            optionKDiv.style.display = 'flex';
            optionKDiv.style.alignItems = 'center';
            
            const checkboxK = document.createElement('div');
            checkboxK.style.width = '12px';
            checkboxK.style.height = '12px';
            checkboxK.style.border = '1px solid #ccc';
            checkboxK.style.backgroundColor = part.optionK ? '#8888ff' : 'white';
            checkboxK.style.marginRight = '2px';
            checkboxK.style.display = 'flex';
            checkboxK.style.justifyContent = 'center';
            checkboxK.style.alignItems = 'center';
            checkboxK.style.fontSize = '8px';
            checkboxK.innerHTML = part.optionK ? '✓' : '';
            optionKDiv.appendChild(checkboxK);
            
            const labelK = document.createElement('span');
            labelK.style.color = '#0000ff';
            labelK.style.fontWeight = 'bold';
            labelK.style.fontSize = '10px';
            labelK.innerText = 'K';
            optionKDiv.appendChild(labelK);
            
            optionsDiv.appendChild(optionKDiv);
            
            // Opção P
            const optionPDiv = document.createElement('div');
            optionPDiv.style.display = 'flex';
            optionPDiv.style.alignItems = 'center';
            
            const checkboxP = document.createElement('div');
            checkboxP.style.width = '12px';
            checkboxP.style.height = '12px';
            checkboxP.style.border = '1px solid #ccc';
            checkboxP.style.backgroundColor = part.optionP ? '#88ff88' : 'white';
            checkboxP.style.marginRight = '2px';
            checkboxP.style.display = 'flex';
            checkboxP.style.justifyContent = 'center';
            checkboxP.style.alignItems = 'center';
            checkboxP.style.fontSize = '8px';
            checkboxP.innerHTML = part.optionP ? '✓' : '';
            optionPDiv.appendChild(checkboxP);
            
            const labelP = document.createElement('span');
            labelP.style.color = '#00aa00';
            labelP.style.fontWeight = 'bold';
            labelP.style.fontSize = '10px';
            labelP.innerText = 'P';
            optionPDiv.appendChild(labelP);
            
            optionsDiv.appendChild(optionPDiv);
            
            partDiv.appendChild(optionsDiv);
            gridElement.appendChild(partDiv);
          });
        } catch (error) {
          console.error("Erro ao processar peças danificadas:", error);
        }
      }
      
      try {
        // Geramos o canvas com html2canvas
        console.log("Iniciando captura com html2canvas");
        const canvas = await html2canvas(printDiv, {
          scale: 2,
          useCORS: true,
          backgroundColor: '#ffffff'
        });
        
        // Convertemos o canvas para imagem
        const imgData = canvas.toDataURL('image/png');
        
        // Criamos o PDF
        const pdf = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: 'a4'
        });
        
        // Configuramos as dimensões
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const canvasRatio = canvas.height / canvas.width;
        const imgWidth = pdfWidth;
        const imgHeight = imgWidth * canvasRatio;
        
        // Adicionamos a imagem
        pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
        
        // Se for maior que uma página, adicionamos mais páginas
        let heightLeft = imgHeight;
        let position = 0;
        
        while (heightLeft > pdfHeight) {
          position = pdfHeight - imgHeight;
          pdf.addPage();
          pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
          heightLeft -= pdfHeight;
        }
        
        // Em vez de usar o método save() direto, vamos usar uma abordagem que
        // funciona melhor em dispositivos móveis, abrindo o PDF em uma nova aba
        
        try {
          // Primeiro, tente a abordagem com base64 - geralmente funciona em mais dispositivos
          const pdfOutput = pdf.output('datauristring');
          
          // Para depuração
          console.log("PDF gerado como URI de dados");
          
          // Abre o PDF em uma nova aba, permitindo que o usuário salve
          window.open(pdfOutput, '_blank');
          
          // Limpa o elemento temporário
          document.body.removeChild(printDiv);
          
          // Se o método acima falhar em algum dispositivo móvel, 
          // tente a segunda abordagem com blob como fallback
          if (!window.open(pdfOutput)) {
            console.log("Abordagem com URI de dados falhou, tentando blob...");
            
            const pdfBlob = pdf.output('blob');
            const blobUrl = URL.createObjectURL(pdfBlob);
            
            const downloadLink = document.createElement('a');
            downloadLink.href = blobUrl;
            downloadLink.download = `Orcamento_${selectedBudget.id}_${selectedBudget.client_name.replace(/[^\w\s]/gi, '')}.pdf`;
            downloadLink.target = '_blank';
            downloadLink.rel = 'noopener noreferrer';
            document.body.appendChild(downloadLink);
            
            downloadLink.click();
            
            setTimeout(() => {
              URL.revokeObjectURL(blobUrl);
              document.body.removeChild(downloadLink);
            }, 100);
          }
        } catch (error) {
          console.error("Erro ao abrir o PDF:", error);
          
          // Em último caso, tente o método save() padrão
          console.log("Tentando método save() padrão...");
          pdf.save(`Orcamento_${selectedBudget.id}_${selectedBudget.client_name.replace(/[^\w\s]/gi, '')}.pdf`);
          document.body.removeChild(printDiv);
        }
        
        toast({
          title: "PDF gerado com sucesso!",
          description: "O download do arquivo foi iniciado.",
        });
      } catch (err) {
        console.error("Erro na geração do PDF:", err);
        document.body.removeChild(printDiv);
        throw err;
      }
    } catch (error) {
      console.error("Erro geral na geração do PDF:", error);
      toast({
        title: "Erro ao gerar PDF",
        description: "Ocorreu um erro ao gerar o documento. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  return (
    <DamagedPartsContext.Provider value={damagedPartsContextValue}>
      <div className="py-6 px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Orçamentos</h1>
            <p className="text-muted-foreground">Gerencie orçamentos para seus clientes</p>
          </div>
        
        {/* Botão "Novo Orçamento" aparece para admin e técnicos, mas não para gestores */}
        {(!isGestor || isTechnician) && (
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
              
              <DialogFooter className="flex justify-between">
                {isViewMode ? (
                  <>
                    <div>
                      <Button 
                        variant="default" 
                        onClick={handlePrintBudget}
                        className="mr-2"
                      >
                        <PrinterIcon className="h-4 w-4 mr-2" />
                        Imprimir
                      </Button>
                    </div>
                    <div>
                      <Button variant="outline" onClick={() => setShowDialog(false)}>
                        Fechar
                      </Button>
                      {!isGestor && (
                        <Button 
                          variant="secondary"
                          onClick={() => setIsViewMode(false)}
                          className="ml-2"
                        >
                          <PencilIcon className="h-4 w-4 mr-2" />
                          Editar
                        </Button>
                      )}
                    </div>
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
                <DamagedPartItem partKey="paraLamaEsquerdo" label="Para-lama Esquerdo" isViewMode={true} 
                  initialDamage={damagedParts["paraLamaEsquerdo"]} />
                <DamagedPartItem partKey="capo" label="Capô" isHorizontal={true} isViewMode={true}
                  initialDamage={damagedParts["capo"]} />
                <DamagedPartItem partKey="paraLamaDireito" label="Para-lama Direito" isViewMode={true}
                  initialDamage={damagedParts["paraLamaDireito"]} />
                
                {/* Linha 2 */}
                <DamagedPartItem partKey="colunaEsquerda" label="Coluna Esquerda" isViewMode={true}
                  initialDamage={damagedParts["colunaEsquerda"]} />
                <DamagedPartItem partKey="teto" label="Teto" isHorizontal={true} isViewMode={true}
                  initialDamage={damagedParts["teto"]} />
                <DamagedPartItem partKey="colunaDireita" label="Coluna Direita" isViewMode={true}
                  initialDamage={damagedParts["colunaDireita"]} />
                
                {/* Linha 3 */}
                <DamagedPartItem partKey="portaDianteiraEsquerda" label="Porta Dianteira Esq." isViewMode={true}
                  initialDamage={damagedParts["portaDianteiraEsquerda"]} />
                
                <div className="flex justify-center items-center p-2 border rounded-md">
                  {(() => {
                    // Log para debug
                    console.log("Visualização do gestor - photo_url:", selectedBudget?.photo_url);
                    return selectedBudget?.photo_url ? (
                      <div className="w-full h-full flex flex-col items-center justify-center min-h-[135px]">
                        <img 
                          src={selectedBudget.photo_url} 
                          alt="Foto do veículo" 
                          className="max-h-[135px] max-w-full object-contain"
                          onError={(e) => {
                            console.error("Erro ao carregar imagem:", e);
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      </div>
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center min-h-[135px] text-gray-400">
                        <CameraIcon className="h-10 w-10 mb-2" />
                        <span className="text-sm">Sem foto</span>
                      </div>
                    );
                  })()}
                </div>
                
                <DamagedPartItem partKey="portaDianteiraDireita" label="Porta Dianteira Dir." isViewMode={true}
                  initialDamage={damagedParts["portaDianteiraDireita"]} />
                
                {/* Linha 4 */}
                <DamagedPartItem partKey="portaTraseiraEsquerda" label="Porta Traseira Esq." isViewMode={true}
                  initialDamage={damagedParts["portaTraseiraEsquerda"]} />
                <DamagedPartItem partKey="portaMalasSuperior" label="Porta Malas Superior" isHorizontal={true} isViewMode={true}
                  initialDamage={damagedParts["portaMalasSuperior"]} />
                <DamagedPartItem partKey="portaTraseiraDireita" label="Porta Traseira Dir." isViewMode={true}
                  initialDamage={damagedParts["portaTraseiraDireita"]} />
                
                {/* Linha 5 */}
                <DamagedPartItem partKey="lateralEsquerda" label="Lateral Esquerda" isViewMode={true}
                  initialDamage={damagedParts["lateralEsquerda"]} />
                <DamagedPartItem partKey="portaMalasInferior" label="Porta Malas Inferior" isViewMode={true}
                  initialDamage={damagedParts["portaMalasInferior"]} />
                <DamagedPartItem partKey="lateralDireita" label="Lateral Direita" isViewMode={true}
                  initialDamage={damagedParts["lateralDireita"]} />
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
          
          <DialogFooter className="flex justify-between">
            <div>
              <Button 
                variant="default" 
                onClick={handlePrintBudget}
                className="mr-2"
              >
                <PrinterIcon className="h-4 w-4 mr-2" />
                Imprimir
              </Button>
            </div>
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
    </DamagedPartsContext.Provider>
  );
}
