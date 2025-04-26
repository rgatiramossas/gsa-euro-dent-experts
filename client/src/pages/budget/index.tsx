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
  Trash2Icon,
  CameraIcon,
  PencilIcon
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
  isHorizontal?: boolean; // true para peças horizontais, false/undefined para verticais
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
  plate?: string; // Placa do veículo para o PDF
  chassisNumber?: string; // Número do chassi para o PDF
}



// Definição de tipos para a tabela de cálculos
type SizeTable = {
  [key: number]: number;
};

type DiameterTable = {
  20: SizeTable;
  30: SizeTable;
  40: SizeTable;
};

type OrientationTable = {
  horizontal: DiameterTable;
  vertical: DiameterTable;
};

// Função para calcular o valor de AW e custo baseado na tabela fornecida
const hailCalculation = (
  size: number,
  dents: number,
  isVertical = false,
  isAluminum = false,
  isGlueTechnique = false,
  needsVordrucken = false,
  needsHohlraum = false,
  hourlyRate = 28 // Taxa horária padrão de 28€
) => {
  // Log para debug
  console.log(`hailCalculation: tamanho=${size}mm, amassados=${dents}, vertical=${isVertical}`);
  
  const baseData: OrientationTable = {
    horizontal: {
      20: { 1: 6, 2: 7, 3: 8, 4: 9, 5: 10, 6: 11, 7: 12, 8: 13, 9: 14, 10: 15,
          13: 17, 16: 19, 19: 20, 22: 22, 25: 23, 28: 24, 31: 25, 34: 26, 37: 27, 40: 28,
          45: 30, 50: 32, 55: 33, 60: 35, 65: 37, 70: 39, 75: 40, 80: 42, 85: 44, 90: 46,
          95: 47, 100: 49, 110: 53, 120: 56, 130: 60, 140: 63, 150: 67, 160: 70, 170: 74, 180: 77,
          190: 80, 200: 84, 210: 87, 220: 91, 230: 94, 240: 98, 250: 102, 260: 104, 270: 106, 280: 109,
           300: 114, 325: 122, 350: 129, 375: 137, 400: 145, 425: 153, 450: 160, 475: 168, 500: 176, 525: 183,
           550: 191, 575: 199, 600: 206 },
    
      30: { 1: 7, 2: 9, 3: 10, 4: 12, 5: 13, 6: 15, 7: 16, 8: 18, 9: 19, 10: 21,
          13: 23, 16: 25, 19: 27, 22: 29, 25: 30, 28: 32, 31: 33, 34: 35, 37: 36, 40: 38,
          45: 40, 50: 43, 55: 45, 60: 48, 65: 50, 70: 53, 75: 55, 80: 58, 85: 60, 90: 63,
          95: 65, 100: 68, 110: 73, 120: 78, 130: 83, 140: 88, 150: 93, 160: 98, 170: 103, 180: 108,
          190: 113, 200: 118, 210: 123, 220: 128, 230: 133, 240: 138, 250: 143, 260: 147, 270: 151, 280: 155,
           300: 163, 325: 174, 350: 186, 375: 197, 400: 209, 425: 220, 450: 232, 475: 243, 500: 255, 525: 266,
           550: 278, 575: 289, 600: 301 },

      40: { 1: 8, 2: 10, 3: 12, 4: 14, 5: 16, 6: 18, 7: 20, 8: 22, 9: 24, 10: 26,
          13: 29, 16: 32, 19: 35, 22: 37, 25: 40, 28: 42, 31: 44, 34: 46, 37: 48, 40: 50,
          45: 54, 50: 57, 55: 61, 60: 64, 65: 68, 70: 71, 75: 75, 80: 78, 85: 82, 90: 85,
          95: 89, 100: 92, 110: 99, 120: 106, 130: 113, 140: 120, 150: 127, 160: 134, 170: 141, 180: 148,
          190: 155, 200: 162, 210: 169, 220: 176, 230: 183, 240: 190, 250: 197, 260: 203, 270: 209, 280: 215,
           300: 229, 325: 246, 350: 264, 375: 281, 400: 298, 425: 315, 450: 332, 475: 349, 500: 366, 525: 384,
           550: 401, 575: 418, 600: 435 }
    },
    vertical: {
      20: { 1: 6, 2: 8, 3: 9, 4: 11, 5: 12, 6: 13, 7: 14, 8: 15, 9: 16, 10: 17,
          11: 18, 12: 16, 13: 20, 14: 21, 15: 22, 16: 23, 17: 24, 18: 25, 19: 26, 20: 27,
          21: 28, 22: 29, 23: 29, 24: 30, 25: 31, 26: 32, 27: 32, 28: 33, 29: 34, 30: 35, 31: 35,
           32: 36, 33: 37, 34: 38, 35: 38, 36: 39, 37: 40, 38: 41, 39: 41,
          40: 42, 41: 43, 42: 44, 43: 44, 44: 45, 45: 46, 46: 47, 47: 47, 48: 48, 49: 49,
          50: 50, 51: 51, 52: 51, 53: 52, 54: 53, 55: 54, 60: 60, 65: 65, 70: 70, 80: 82, 90: 94, 100: 106 },
      
      30: { 1: 7, 2: 9, 3: 11, 4: 13, 5: 15, 6: 17, 7: 18, 8: 20, 9: 21, 10: 23,
          11: 24, 12: 26, 13: 27, 14: 29, 15: 30, 16: 32, 17: 33, 18: 35, 19: 36, 20: 38,
          21: 39, 22: 40, 23: 41, 24: 42, 25: 43, 26: 44, 27: 45, 28: 46, 29: 47, 30: 48, 31: 49,
           32: 50, 33: 51, 34: 52, 35: 53, 36: 54, 37: 55, 38: 56, 39: 57,
          40: 58, 41: 59, 42: 60, 43: 61, 44: 62, 45: 63, 46: 64, 47: 65, 48: 66, 49: 67,
          50: 68, 51: 69, 52: 70, 53: 71, 54: 72, 55: 73, 60: 78, 65: 83, 70: 88, 80: 99, 90: 119, 100: 129 },
    
      40: { 1: 9, 2: 12, 3: 14, 4: 17, 5: 19, 6: 21, 7: 23, 8: 25, 9: 27, 10: 29,
          11: 31, 12: 33, 13: 35, 14: 37, 15: 39, 16: 41, 17: 43, 18: 45, 19: 47, 20: 49,
          21: 51, 22: 52, 23: 54, 24: 55, 25: 57, 26: 58, 27: 60, 28: 61, 29: 63, 30: 64, 31: 66,
           32: 67, 33: 69, 34: 70, 35: 72, 36: 73, 37: 75, 38: 76, 39: 78,
          40: 79, 41: 81, 42: 82, 43: 84, 44: 85, 45: 87, 46: 88, 47: 90, 48: 91, 49: 93,
          50: 94, 51: 96, 52: 97, 53: 99, 54: 100, 55: 102, 60: 108, 65: 115, 70: 122, 80: 136, 90: 150, 100: 164 }
    }
  };

  // Obtém a tabela correta com base na orientação (horizontal ou vertical)
  const awTable = isVertical ? baseData.vertical : baseData.horizontal;
  
  // Obtém a tabela específica para o tamanho (20mm, 30mm ou 40mm)
  let sizeTable;
  
  // Verificar diretamente qual tabela usar com base no diâmetro
  if (size === 20) {
    sizeTable = awTable[20];
  } else if (size === 30) {
    sizeTable = awTable[30];
  } else if (size === 40) {
    sizeTable = awTable[40];
  } else {
    // Se o tamanho não estiver entre os valores padrão, usar o mais próximo
    if (size < 25) {
      sizeTable = awTable[20];
      console.log(`Tamanho ${size}mm não encontrado na tabela. Usando 20mm.`);
    } else if (size < 35) {
      sizeTable = awTable[30];
      console.log(`Tamanho ${size}mm não encontrado na tabela. Usando 30mm.`);
    } else {
      sizeTable = awTable[40];
      console.log(`Tamanho ${size}mm não encontrado na tabela. Usando 40mm.`);
    }
  }
  // Verificar se o tamanho existe na tabela
  if (!sizeTable) {
    console.warn(`Tamanho ${size}mm não encontrado na tabela.`);
    return { aw: 0, hours: 0, cost: "0.00" };
  }
  
  // Verificar se o valor existe diretamente na tabela
  let aw = 0;
  
  // 1. Se o valor existe diretamente na tabela, usamos ele
  if (sizeTable[dents] !== undefined) {
    aw = sizeTable[dents];
    console.log(`Valor exato encontrado na tabela: ${dents} amassados = ${aw} AW`);
  } 
  // 2. Se não existe, usamos a regra de interpolação conforme explicado
  else {
    // Encontrar valores de referência na tabela (valores existentes)
    const availableKeys = Object.keys(sizeTable).map(Number).sort((a, b) => a - b);
    
    // Se não tem amassados, retorna zero
    if (dents === 0 || availableKeys.length === 0) {
      return { aw: 0, hours: 0, cost: "0.00" };
    }
    
    // Encontrar o valor anterior e posterior mais próximos
    const lowerKey = availableKeys.filter(k => k < dents).pop();
    const higherKey = availableKeys.find(k => k > dents);
    
    // Caso temos valores anterior e posterior para fazer a interpolação
    if (lowerKey !== undefined && higherKey !== undefined) {
      const lowerAW = sizeTable[lowerKey];
      const higherAW = sizeTable[higherKey];
      
      // Diferença total em AW
      const awDifference = higherAW - lowerAW;
      
      // Divisão da diferença por 2 (metade)
      const halfDifference = awDifference / 2;
      
      // Calcular o ponto médio entre os valores de referência
      const middlePoint = (lowerKey + higherKey) / 2;
      
      console.log(`Calculando entre ${lowerKey}(${lowerAW} AW) e ${higherKey}(${higherAW} AW), diferença=${awDifference} AW, metade=${halfDifference} AW`);
      console.log(`Ponto médio: ${middlePoint}, dents: ${dents}`);
      
      // Decisão baseada na proximidade
      if (dents >= middlePoint) {
        // Está no meio ou mais próximo do valor posterior
        aw = higherAW + halfDifference;
        console.log(`No meio ou próximo do valor posterior: ${higherAW} + ${halfDifference} = ${aw} AW`);
      } 
      else {
        // Está mais próximo do valor anterior
        aw = lowerAW + halfDifference;
        console.log(`Mais próximo do valor anterior: ${lowerAW} + ${halfDifference} = ${aw} AW`);
      }
    } 
    // Casos onde só temos um valor de referência
    else if (lowerKey === undefined && higherKey !== undefined) {
      // Só temos valor posterior
      aw = sizeTable[higherKey] - 1; // Valor posterior menos 1 AW
      console.log(`Caso limite inferior: ${dents} amassados - usando ${higherKey} (${sizeTable[higherKey]} AW) - 1 = ${aw} AW`);
    } 
    else if (higherKey === undefined && lowerKey !== undefined) {
      // Só temos valor anterior  
      aw = sizeTable[lowerKey] + 1; // Valor anterior mais 1 AW
      console.log(`Caso limite superior: ${dents} amassados - usando ${lowerKey} (${sizeTable[lowerKey]} AW) + 1 = ${aw} AW`);
    }
  }
  
  // Aplica modificadores
  if (isAluminum) aw *= 1.25;  // Adicional para alumínio (+25%)
  if (isGlueTechnique) aw *= 1.30;  // Adicional para cola (+30%)
  // Pintura não afeta o cálculo conforme especificado
  
  // Aplica outros modificadores se necessário
  if (needsVordrucken) aw *= 1.60;
  if (needsHohlraum) aw += 4;

  // Arredonda o AW para um valor inteiro
  aw = Math.round(aw);
  
  // Calcula horas e custo
  const hours = aw / 10;
  const cost = hours * hourlyRate;

  return { aw, hours, cost: cost.toFixed(2) };
};

export default function Budget() {
  const [_, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [isViewMode, setIsViewMode] = useState(false);
  const [selectedBudget, setSelectedBudget] = useState<Budget | null>(null);
  const [selectedClient, setSelectedClient] = useState<number | null>(null);
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [manualVehicleInfo, setManualVehicleInfo] = useState("");
  const [totalAw, setTotalAw] = useState<number>(0);
  const [totalValue, setTotalValue] = useState<number>(0);
  const [licensePlate, setLicensePlate] = useState("");
  const [chassisNumber, setChassisNumber] = useState("");
  const [note, setNote] = useState("");
  
  // Estado para busca (busca única em todos os campos)
  const [searchQuery, setSearchQuery] = useState("");
  
  // Estado para os danos do veículo (peças)
  // Marcar peças horizontais: capô, teto e porta-malas superior
  const [partDamages, setPartDamages] = useState<Record<string, PartDamage>>({
    // Peças verticais
    paraLamaEsquerdo: { selected: false, diameter20: 0, diameter30: 0, diameter40: 0, optionA: false, optionK: false, optionP: false, isHorizontal: false },
    // Peças horizontais
    capo: { selected: false, diameter20: 0, diameter30: 0, diameter40: 0, optionA: false, optionK: false, optionP: false, isHorizontal: true },
    // Peças verticais
    paraLamaDireito: { selected: false, diameter20: 0, diameter30: 0, diameter40: 0, optionA: false, optionK: false, optionP: false, isHorizontal: false },
    colunaEsquerda: { selected: false, diameter20: 0, diameter30: 0, diameter40: 0, optionA: false, optionK: false, optionP: false, isHorizontal: false },
    // Peças horizontais
    teto: { selected: false, diameter20: 0, diameter30: 0, diameter40: 0, optionA: false, optionK: false, optionP: false, isHorizontal: true }, 
    // Peças verticais
    colunaDireita: { selected: false, diameter20: 0, diameter30: 0, diameter40: 0, optionA: false, optionK: false, optionP: false, isHorizontal: false },
    portaDianteiraEsquerda: { selected: false, diameter20: 0, diameter30: 0, diameter40: 0, optionA: false, optionK: false, optionP: false, isHorizontal: false },
    portaDianteiraDireita: { selected: false, diameter20: 0, diameter30: 0, diameter40: 0, optionA: false, optionK: false, optionP: false, isHorizontal: false },
    portaTraseiraEsquerda: { selected: false, diameter20: 0, diameter30: 0, diameter40: 0, optionA: false, optionK: false, optionP: false, isHorizontal: false },
    // Peças horizontais
    portaMalasSuperior: { selected: false, diameter20: 0, diameter30: 0, diameter40: 0, optionA: false, optionK: false, optionP: false, isHorizontal: true },
    // Peças verticais
    portaTraseiraDireita: { selected: false, diameter20: 0, diameter30: 0, diameter40: 0, optionA: false, optionK: false, optionP: false, isHorizontal: false },
    lateralEsquerda: { selected: false, diameter20: 0, diameter30: 0, diameter40: 0, optionA: false, optionK: false, optionP: false, isHorizontal: false },
    portaMalasInferior: { selected: false, diameter20: 0, diameter30: 0, diameter40: 0, optionA: false, optionK: false, optionP: false, isHorizontal: false },
    lateralDireita: { selected: false, diameter20: 0, diameter30: 0, diameter40: 0, optionA: false, optionK: false, optionP: false, isHorizontal: false }
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
      
      // Verificar se existe uma lista de orçamentos no localStorage
      const savedBudgets = localStorage.getItem('eurodent_budgets');
      if (savedBudgets) {
        return JSON.parse(savedBudgets);
      }
      
      // Orçamentos iniciais (só usados na primeira vez)
      const initialBudgets = [
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
      
      // Salvar no localStorage para persistência
      localStorage.setItem('eurodent_budgets', JSON.stringify(initialBudgets));
      
      return initialBudgets;
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
      plate?: string;
      chassisNumber?: string;
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
      
      let vehicleDisplay = vehicle_info;
      // Adiciona informação da placa/chassi ao texto do veículo, se disponível
      if (data.plate) {
        vehicleDisplay += ` (${data.plate})`;
      }
      
      const newBudget = {
        id: Math.floor(Math.random() * 10000) + 1000,
        client_name,
        vehicle_info: vehicleDisplay,
        date: data.date,
        damaged_parts: data.damaged_parts,
        photo_url: data.photo_url,
        total_aw: data.total_aw,
        total_value: data.total_value,
        created_at: new Date().toISOString(),
        note: data.note,
        plate: data.plate,
        chassisNumber: data.chassisNumber
      };
      
      return newBudget;
    },
    onSuccess: (newBudget) => {
      // Adicionar o novo orçamento à lista atual
      const currentBudgets = queryClient.getQueryData<Budget[]>(['/api/budgets']) || [];
      const updatedBudgets = [...currentBudgets, newBudget];
      
      // Atualiza o cache do React Query
      queryClient.setQueryData(['/api/budgets'], updatedBudgets);
      
      // Salvar no localStorage para persistência
      localStorage.setItem('eurodent_budgets', JSON.stringify(updatedBudgets));
      
      toast({
        title: "Orçamento criado",
        description: "O orçamento foi criado com sucesso",
      });
      
      // Fechar o dialog e limpar o form
      setShowDialog(false);
      setSelectedClient(null);
      setNote("");
      setDate(new Date().toISOString().split('T')[0]);
      setManualVehicleInfo("");
      setLicensePlate("");
      setChassisNumber("");
      setPartDamages({
        // Peças verticais
        paraLamaEsquerdo: { selected: false, diameter20: 0, diameter30: 0, diameter40: 0, optionA: false, optionK: false, optionP: false, isHorizontal: false },
        // Peças horizontais
        capo: { selected: false, diameter20: 0, diameter30: 0, diameter40: 0, optionA: false, optionK: false, optionP: false, isHorizontal: true },
        // Peças verticais
        paraLamaDireito: { selected: false, diameter20: 0, diameter30: 0, diameter40: 0, optionA: false, optionK: false, optionP: false, isHorizontal: false },
        colunaEsquerda: { selected: false, diameter20: 0, diameter30: 0, diameter40: 0, optionA: false, optionK: false, optionP: false, isHorizontal: false },
        // Peças horizontais
        teto: { selected: false, diameter20: 0, diameter30: 0, diameter40: 0, optionA: false, optionK: false, optionP: false, isHorizontal: true }, 
        // Peças verticais
        colunaDireita: { selected: false, diameter20: 0, diameter30: 0, diameter40: 0, optionA: false, optionK: false, optionP: false, isHorizontal: false },
        portaDianteiraEsquerda: { selected: false, diameter20: 0, diameter30: 0, diameter40: 0, optionA: false, optionK: false, optionP: false, isHorizontal: false },
        portaDianteiraDireita: { selected: false, diameter20: 0, diameter30: 0, diameter40: 0, optionA: false, optionK: false, optionP: false, isHorizontal: false },
        portaTraseiraEsquerda: { selected: false, diameter20: 0, diameter30: 0, diameter40: 0, optionA: false, optionK: false, optionP: false, isHorizontal: false },
        // Peças horizontais
        portaMalasSuperior: { selected: false, diameter20: 0, diameter30: 0, diameter40: 0, optionA: false, optionK: false, optionP: false, isHorizontal: true },
        // Peças verticais
        portaTraseiraDireita: { selected: false, diameter20: 0, diameter30: 0, diameter40: 0, optionA: false, optionK: false, optionP: false, isHorizontal: false },
        lateralEsquerda: { selected: false, diameter20: 0, diameter30: 0, diameter40: 0, optionA: false, optionK: false, optionP: false, isHorizontal: false },
        portaMalasInferior: { selected: false, diameter20: 0, diameter30: 0, diameter40: 0, optionA: false, optionK: false, optionP: false, isHorizontal: false },
        lateralDireita: { selected: false, diameter20: 0, diameter30: 0, diameter40: 0, optionA: false, optionK: false, optionP: false, isHorizontal: false }
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
    if (!selectedClient && !manualVehicleInfo) {
      toast({
        title: "Erro ao criar orçamento",
        description: "Selecione um cliente e informe os dados do veículo.",
        variant: "destructive",
      });
      return;
    }
    
    // Precisa preencher as informações do veículo
    if (!manualVehicleInfo) {
      toast({
        title: "Erro ao criar orçamento",
        description: "Informe os dados do veículo.",
        variant: "destructive",
      });
      return;
    }
    
    // Validação para placa e chassi - pelo menos um dos dois deve estar preenchido
    if (!licensePlate && !chassisNumber) {
      toast({
        title: "Erro ao criar orçamento",
        description: "Preencha pelo menos um dos campos: placa ou chassi do veículo.",
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
      client_id: selectedClient || undefined,
      vehicle_id: undefined, // Nunca usamos um veículo do banco de dados
      date,
      damaged_parts: Object.entries(partDamages)
        .filter(([_, damage]) => damage.selected)
        .map(([part]) => part),
      photo_url: photoUrl || undefined,
      total_aw: totalAw || totalAWValue,
      total_value: totalValue || totalAWValue * 100, // Valor arbitrário para exemplo
      note: note.trim(),
      vehicle_info: manualVehicleInfo, // Sempre usa as informações manuais do veículo
      plate: licensePlate,
      chassisNumber: chassisNumber
    });
  };

  const handlePrintBudget = async (budgetId: number) => {
    try {
      // Buscar o orçamento selecionado se não estivermos no modo de visualização
      let targetBudget = selectedBudget;
      
      if (!targetBudget && budgets) {
        const foundBudget = budgets.find(b => b.id === budgetId);
        if (foundBudget) {
          targetBudget = foundBudget;
        }
      }
      
      if (!targetBudget) {
        toast({
          title: "Erro ao gerar PDF",
          description: "Orçamento não encontrado.",
          variant: "destructive",
        });
        return;
      }
      
      // Se não estivermos visualizando o orçamento, abri-lo para visualização antes de imprimir
      if (!showDialog || !isViewMode || selectedBudget?.id !== budgetId) {
        handleViewBudget(budgetId);
        
        // Aguardar um pouco até o diálogo ser completamente renderizado
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // Importar as bibliotecas necessárias
      const html2canvas = (await import('html2canvas')).default;
      const jsPDF = (await import('jspdf')).default;
      
      toast({
        title: "Gerando PDF",
        description: "Aguarde enquanto o orçamento é preparado...",
      });
      
      // Criar um clone do diálogo para modificar e capturar
      const dialogElement = document.querySelector('[role="dialog"]') as HTMLElement;
      
      if (!dialogElement) {
        toast({
          title: "Erro ao gerar PDF",
          description: "Diálogo de orçamento não encontrado.",
          variant: "destructive",
        });
        return;
      }
      
      // Criar um clone do conteúdo do diálogo com design melhorado
      const printContainer = document.createElement('div');
      printContainer.style.width = '650px';
      printContainer.style.padding = '18px';
      printContainer.style.backgroundColor = 'white';
      printContainer.style.position = 'absolute';
      printContainer.style.left = '-9999px';
      printContainer.style.fontFamily = 'Arial, sans-serif';
      printContainer.style.fontSize = '10px';
      printContainer.style.color = '#333';
      printContainer.style.boxSizing = 'border-box';
      
      // Cabeçalho com estilo empresarial
      const header = document.createElement('div');
      header.style.borderBottom = '2px solid #1E40AF'; // Borda azul
      header.style.paddingBottom = '8px';
      header.style.marginBottom = '12px';
      header.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div>
            <h2 style="font-size: 16px; margin: 0; color: #1E40AF;">Orçamento #${targetBudget.id}</h2>
            <p style="font-size: 10px; margin: 3px 0 0 0; color: #555;">Euro Dent Experts</p>
          </div>
          <div style="font-size: 10px; text-align: right; color: #555;">
            Data de emissão: ${new Date().toLocaleDateString()}
          </div>
        </div>
      `;
      printContainer.appendChild(header);
      
      // Detalhes do cliente
      const clientTitle = document.createElement('p');
      clientTitle.textContent = 'Detalhes do orçamento para:';
      clientTitle.style.fontSize = '10px';
      clientTitle.style.marginBottom = '6px';
      clientTitle.style.fontWeight = 'bold';
      clientTitle.style.color = '#555';
      printContainer.appendChild(clientTitle);
      
      // Criar seção de dados do cliente e veículo com visual melhorado
      const clientSection = document.createElement('div');
      clientSection.style.display = 'grid';
      clientSection.style.gridTemplateColumns = '1fr 1fr';
      clientSection.style.gap = '10px';
      clientSection.style.marginBottom = '15px';
      clientSection.style.backgroundColor = '#f8f9fa';
      clientSection.style.padding = '10px';
      clientSection.style.borderRadius = '5px';
      
      clientSection.innerHTML = `
        <div>
          <p style="font-weight: 600; margin: 0 0 3px 0; font-size: 9px; color: #1E40AF;">DATA</p>
          <div style="border: 1px solid #e0e0e0; padding: 5px; border-radius: 3px; font-size: 9px; background-color: white;">${formatDate(targetBudget.date) || ""}</div>
        </div>
        <div>
          <p style="font-weight: 600; margin: 0 0 3px 0; font-size: 9px; color: #1E40AF;">CLIENTE</p>
          <div style="border: 1px solid #e0e0e0; padding: 5px; border-radius: 3px; font-size: 9px; background-color: white;">${targetBudget.client_name || ""}</div>
        </div>
        <div>
          <p style="font-weight: 600; margin: 0 0 3px 0; font-size: 9px; color: #1E40AF;">VEÍCULO</p>
          <div style="border: 1px solid #e0e0e0; padding: 5px; border-radius: 3px; font-size: 9px; background-color: white;">${targetBudget.vehicle_info || ""}</div>
        </div>
        <div>
          <p style="font-weight: 600; margin: 0 0 3px 0; font-size: 9px; color: #1E40AF;">PLACA</p>
          <div style="border: 1px solid #e0e0e0; padding: 5px; border-radius: 3px; font-size: 9px; background-color: white;">${targetBudget.plate || licensePlate || ""}</div>
        </div>
        <div style="grid-column: span 2;">
          <p style="font-weight: 600; margin: 0 0 3px 0; font-size: 9px; color: #1E40AF;">CHASSI</p>
          <div style="border: 1px solid #e0e0e0; padding: 5px; border-radius: 3px; font-size: 9px; background-color: white;">${targetBudget.chassisNumber || chassisNumber || ""}</div>
        </div>
      `;
      printContainer.appendChild(clientSection);
      
      // Título da seção de danos com estilo aprimorado
      const damageTitle = document.createElement('div');
      damageTitle.style.display = 'flex';
      damageTitle.style.alignItems = 'center';
      damageTitle.style.marginBottom = '10px';
      
      const damageTitleIcon = document.createElement('div');
      damageTitleIcon.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M19 9L12 16L5 9" stroke="#1E40AF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>`;
      damageTitleIcon.style.marginRight = '5px';
      
      const damageTitleText = document.createElement('h3');
      damageTitleText.textContent = 'Danos do Veículo';
      damageTitleText.style.fontSize = '12px';
      damageTitleText.style.margin = '0';
      damageTitleText.style.fontWeight = 'bold';
      damageTitleText.style.color = '#1E40AF';
      
      damageTitle.appendChild(damageTitleIcon);
      damageTitle.appendChild(damageTitleText);
      printContainer.appendChild(damageTitle);
      
      // Grid de peças danificadas em linhas e colunas específicas
      const partsGrid = document.createElement('div');
      partsGrid.style.display = 'grid';
      partsGrid.style.gridTemplateColumns = 'repeat(3, 1fr)';
      partsGrid.style.gap = '8px'; // Reduzido o espaçamento para caber melhor
      partsGrid.style.fontSize = '10px'; // Fonte menor para caber tudo
      
      // Lista de peças na ordem exata do grid
      const gridLayout = [
        // Linha 1
        ['paraLamaEsquerdo', 'capo', 'paraLamaDireito'],
        // Linha 2
        ['colunaEsquerda', 'teto', 'colunaDireita'],
        // Linha 3 (com foto no meio)
        ['portaDianteiraEsquerda', 'foto', 'portaDianteiraDireita'],
        // Linha 4
        ['portaTraseiraEsquerda', 'portaMalasSuperior', 'portaTraseiraDireita'],
        // Linha 5
        ['lateralEsquerda', 'portaMalasInferior', 'lateralDireita']
      ];
      
      // Lista de nomes legíveis das peças
      const partsNames: Record<string, string> = {
        paraLamaEsquerdo: "Para-lama Esquerdo",
        capo: "Capô",
        paraLamaDireito: "Para-lama Direito",
        colunaEsquerda: "Coluna Esquerda",
        teto: "Teto",
        colunaDireita: "Coluna Direita",
        portaDianteiraEsquerda: "Porta Dianteira Esquerda",
        portaDianteiraDireita: "Porta Dianteira Direita",
        portaTraseiraEsquerda: "Porta Traseira Esquerda",
        portaMalasSuperior: "Porta Malas Superior",
        portaTraseiraDireita: "Porta Traseira Direita",
        lateralEsquerda: "Lateral Esquerda",
        portaMalasInferior: "Porta Malas Inferior",
        lateralDireita: "Lateral Direita"
      };
      
      // Criar uma peça com todos os detalhes e design aprimorado
      const createPartElement = (partKey: string, displayName: string, isSelected: boolean): HTMLElement => {
        const part = document.createElement('div');
        part.style.border = `1px solid ${isSelected ? '#1E40AF' : '#e0e0e0'}`;
        part.style.borderRadius = '5px';
        part.style.padding = '6px';
        part.style.backgroundColor = isSelected ? '#EFF6FF' : 'white';
        part.style.boxShadow = isSelected ? '0 1px 3px rgba(0,0,0,0.12)' : 'none';
        
        const title = document.createElement('div');
        title.textContent = displayName;
        title.style.fontWeight = 'bold';
        title.style.borderBottom = '1px solid #e0e0e0';
        title.style.paddingBottom = '3px';
        title.style.marginBottom = '3px';
        title.style.textAlign = 'center';
        title.style.fontSize = '9px';
        title.style.color = isSelected ? '#1E40AF' : '#444';
        part.appendChild(title);
        
        // Adicionar campos de diâmetro com visual aprimorado
        ['20mm', '30mm', '40mm'].forEach(diameter => {
          const row = document.createElement('div');
          row.style.display = 'flex';
          row.style.justifyContent = 'space-between';
          row.style.alignItems = 'center';
          row.style.marginBottom = '3px';
          
          const label = document.createElement('span');
          label.textContent = diameter + ':';
          label.style.fontSize = '9px';
          label.style.color = '#555';
          label.style.fontWeight = '500';
          
          const input = document.createElement('div');
          input.style.width = '50px';
          input.style.height = '16px';
          input.style.border = '1px solid #e0e0e0';
          input.style.borderRadius = '3px';
          input.style.backgroundColor = '#fafafa';
          
          row.appendChild(label);
          row.appendChild(input);
          part.appendChild(row);
        });
        
        // Adicionar checkboxes A, K, P exatamente como na imagem de referência
        const optionsRow = document.createElement('div');
        optionsRow.style.display = 'flex';
        optionsRow.style.justifyContent = 'space-between';
        optionsRow.style.borderTop = '1px solid #e0e0e0';
        optionsRow.style.paddingTop = '3px';
        optionsRow.style.marginTop = '2px';
        
        const optionColors = {
          'A': '#fca5a5', // Vermelho claro para Alumínio
          'K': '#a5b4fc', // Azul claro para Cola
          'P': '#86efac'  // Verde claro para Pintura
        };
        
        ['A', 'K', 'P'].forEach(option => {
          const optionGroup = document.createElement('div');
          optionGroup.style.display = 'flex';
          optionGroup.style.alignItems = 'center';
          
          // Checkbox branco
          const checkbox = document.createElement('div');
          checkbox.style.width = '12px';
          checkbox.style.height = '12px';
          checkbox.style.border = '1px solid #ccc';
          checkbox.style.borderRadius = '2px';
          checkbox.style.marginRight = '4px';
          checkbox.style.backgroundColor = 'white';
          
          // Letra colorida dentro de box (ajustando posição vertical conforme referência)
          const colorBox = document.createElement('div');
          colorBox.style.width = '14px';
          colorBox.style.height = '14px';
          colorBox.style.backgroundColor = optionColors[option as keyof typeof optionColors];
          colorBox.style.borderRadius = '2px';
          colorBox.style.position = 'relative'; // Para posicionamento absoluto do label
          
          const label = document.createElement('span');
          label.textContent = option;
          label.style.fontSize = '8px';
          label.style.fontWeight = 'bold';
          label.style.color = '#333';
          label.style.position = 'absolute';
          label.style.top = '4px'; // Ajuste para posicionar no centro vertical do box
          label.style.left = '0';
          label.style.right = '0';
          label.style.textAlign = 'center';
          label.style.lineHeight = '6px';
          
          colorBox.appendChild(label);
          optionGroup.appendChild(checkbox);
          optionGroup.appendChild(colorBox);
          optionsRow.appendChild(optionGroup);
        });
        
        part.appendChild(optionsRow);
        return part;
      };
      
      // Criar componente de foto para a posição central com visual aprimorado
      const createPhotoElement = (): HTMLElement => {
        const photoContainer = document.createElement('div');
        photoContainer.style.border = '1px solid #e0e0e0';
        photoContainer.style.borderRadius = '5px';
        photoContainer.style.padding = '6px';
        photoContainer.style.textAlign = 'center';
        photoContainer.style.display = 'flex';
        photoContainer.style.flexDirection = 'column';
        photoContainer.style.justifyContent = 'center';
        photoContainer.style.alignItems = 'center';
        photoContainer.style.backgroundColor = '#f8f9fa';
        photoContainer.style.boxShadow = '0 1px 2px rgba(0,0,0,0.05)';
        
        const photoIcon = document.createElement('div');
        photoIcon.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect opacity="0.5" x="2" y="4" width="20" height="16" rx="2" stroke="#1E40AF" stroke-width="1.5"/>
          <circle cx="8.5" cy="8.5" r="2.5" stroke="#1E40AF" stroke-width="1.5"/>
          <path d="M14.5 11.5C14.5 11.5 15.5 10.25 17 10.25C18.5 10.25 19.5 11.5 19.5 11.5V18H14.5V11.5Z" stroke="#1E40AF" stroke-width="1.5"/>
          <path d="M4.5 18V13.5C4.5 13.5 5.5 12 7 12C8.5 12 9.5 13.5 9.5 13.5L12.5 15.5" stroke="#1E40AF" stroke-width="1.5"/>
        </svg>`;
        
        // Título da foto
        const photoTitle = document.createElement('div');
        photoTitle.textContent = "Veículo";
        photoTitle.style.fontWeight = 'bold';
        photoTitle.style.fontSize = '9px';
        photoTitle.style.color = '#1E40AF';
        photoTitle.style.marginBottom = '4px';
        
        const photoText = document.createElement('div');
        photoText.textContent = "Foto disponível no sistema";
        photoText.style.marginTop = '6px';
        photoText.style.fontSize = '8px';
        photoText.style.color = '#555';
        
        photoContainer.appendChild(photoTitle);
        photoContainer.appendChild(photoIcon);
        photoContainer.appendChild(photoText);
        return photoContainer;
      };
      
      // Construir o grid linha a linha
      gridLayout.forEach(row => {
        row.forEach(partKey => {
          if (partKey === 'foto') {
            // Adicionar o elemento de foto
            partsGrid.appendChild(createPhotoElement());
          } else {
            // Adicionar a peça com seu estado
            const isSelected = targetBudget.damaged_parts?.includes(partKey) || false;
            const partElement = createPartElement(partKey, partsNames[partKey], isSelected);
            partsGrid.appendChild(partElement);
          }
        });
      });
      
      printContainer.appendChild(partsGrid);
      
      // Rodapé com legenda elegante
      const footer = document.createElement('div');
      footer.style.marginTop = '20px';
      footer.style.borderTop = '2px solid #e0e0e0';
      footer.style.paddingTop = '12px';
      
      // Título dos materiais
      const legendContainer = document.createElement('div');
      legendContainer.style.backgroundColor = '#f8f9fa';
      legendContainer.style.padding = '10px 12px';
      legendContainer.style.borderRadius = '5px';
      legendContainer.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)';
      
      const legendHeader = document.createElement('div');
      legendHeader.style.display = 'flex';
      legendHeader.style.alignItems = 'center';
      legendHeader.style.marginBottom = '8px';
      
      const legendIcon = document.createElement('div');
      legendIcon.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 4V20M12 4L6 10M12 4L18 10" stroke="#1E40AF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>`;
      legendIcon.style.marginRight = '5px';
      
      const legendTitle = document.createElement('div');
      legendTitle.textContent = 'Materiais Especiais';
      legendTitle.style.fontWeight = 'bold';
      legendTitle.style.fontSize = '10px';
      legendTitle.style.color = '#1E40AF';
      
      legendHeader.appendChild(legendIcon);
      legendHeader.appendChild(legendTitle);
      legendContainer.appendChild(legendHeader);
      
      // Criar caixas coloridas destacadas para cada material
      const materialsContainer = document.createElement('div');
      materialsContainer.style.display = 'flex';
      materialsContainer.style.justifyContent = 'space-around';
      materialsContainer.style.width = '100%';
      
      const materials = [
        { code: 'A', desc: 'ALUMÍNIO', color: '#fca5a5' }, // Vermelho claro
        { code: 'K', desc: 'COLA', color: '#a5b4fc' },     // Azul claro
        { code: 'P', desc: 'PINTURA', color: '#86efac' }   // Verde claro
      ];
      
      materials.forEach(material => {
        const materialBox = document.createElement('div');
        materialBox.style.display = 'flex';
        materialBox.style.alignItems = 'center';
        materialBox.style.margin = '0 5px';
        
        const codeCircle = document.createElement('div');
        codeCircle.textContent = material.code;
        codeCircle.style.width = '16px';
        codeCircle.style.height = '16px';
        codeCircle.style.borderRadius = '50%';
        codeCircle.style.backgroundColor = material.color;
        codeCircle.style.color = '#333';
        codeCircle.style.fontWeight = 'bold';
        codeCircle.style.fontSize = '9px';
        codeCircle.style.display = 'flex';
        codeCircle.style.justifyContent = 'center';
        codeCircle.style.alignItems = 'center';
        codeCircle.style.marginRight = '5px';
        codeCircle.style.boxShadow = '0 1px 2px rgba(0,0,0,0.1)';
        
        const descText = document.createElement('span');
        descText.textContent = material.desc;
        descText.style.fontSize = '9px';
        descText.style.fontWeight = '500';
        descText.style.color = '#444';
        
        materialBox.appendChild(codeCircle);
        materialBox.appendChild(descText);
        materialsContainer.appendChild(materialBox);
      });
      
      legendContainer.appendChild(materialsContainer);
      footer.appendChild(legendContainer);
      printContainer.appendChild(footer);
      
      // Observações removidas conforme solicitado
      
      // Adicionar o container à página
      document.body.appendChild(printContainer);
      
      try {
        // Capturar o conteúdo como imagem
        const canvas = await html2canvas(printContainer, {
          scale: 2, // Melhor qualidade
          useCORS: true,
          allowTaint: true,
          backgroundColor: "#fff",
          logging: false
        });
        
        // Criar PDF no formato A4
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: 'a4'
        });
        
        // Calcular dimensões para ajustar ao A4
        const imgWidth = 210; // A4 tem 210mm de largura
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        
        // Adicionar imagem ao PDF
        pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
        
        // Adicionar uma linha horizontal fina seguida do rodapé (exatamente como na imagem de referência)
        pdf.setDrawColor(200, 200, 200);
        pdf.line(0, 280, 210, 280);
        
        pdf.setFontSize(9);
        pdf.setTextColor(120, 120, 120);
        pdf.text(`Orçamento #${targetBudget.id} - Euro Dent Experts - Gerado em ${new Date().toLocaleDateString()}`, 105, 287, { align: 'center' });
        
        // Salvar o PDF
        pdf.save(`orcamento_${targetBudget.id}_${targetBudget.client_name.replace(/\s+/g, '_')}.pdf`);
        
        toast({
          title: "PDF gerado com sucesso",
          description: "O orçamento foi exportado para PDF.",
        });
      } finally {
        // Remover o container da página
        document.body.removeChild(printContainer);
      }
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      toast({
        title: "Erro ao gerar PDF",
        description: "Ocorreu um erro ao gerar o PDF. Tente novamente.",
        variant: "destructive",
      });
    }
  };
  
  // Função para atualizar um orçamento existente
  const handleUpdateBudget = () => {
    if (!selectedBudget) return;
    
    // Validar formulário
    if (!manualVehicleInfo) {
      toast({
        title: "Erro ao atualizar orçamento",
        description: "Os dados do veículo não podem ficar em branco.",
        variant: "destructive",
      });
      return;
    }
    
    // Obter peças danificadas selecionadas
    const damagedParts = Object.entries(partDamages)
      .filter(([_, damage]) => damage.selected)
      .map(([part]) => part);
    
    // Em uma implementação real, enviaríamos uma requisição PUT para atualizar o orçamento
    
    // Atualizar o orçamento selecionado com os valores atuais
    const updatedBudget = {
      ...selectedBudget,
      date,
      vehicle_info: manualVehicleInfo,
      total_aw: totalAw,
      total_value: totalValue,
      note,
      damaged_parts: damagedParts
    };
    
    // Atualizar a lista de orçamentos
    if (budgets) {
      const updatedBudgets = budgets.map(b => 
        b.id === selectedBudget.id ? updatedBudget : b
      );
      
      // Atualizar o cache do React Query
      queryClient.setQueryData(['/api/budgets'], updatedBudgets);
      
      // Salvar no localStorage para persistência
      localStorage.setItem('eurodent_budgets', JSON.stringify(updatedBudgets));
    }
    
    toast({
      title: "Orçamento atualizado",
      description: `O orçamento #${selectedBudget.id} foi atualizado com sucesso.`,
    });
    
    // Voltar para o modo de visualização
    setIsViewMode(true);
  };

  const handleDeleteBudget = (budgetId: number) => {
    if (window.confirm(`Tem certeza que deseja excluir o orçamento #${budgetId}?`)) {
      // Simulação de exclusão - em uma implementação real, seria feita uma chamada à API
      
      // Atualize o estado local para remover o orçamento
      const updatedBudgets = budgets?.filter(budget => budget.id !== budgetId) || [];
      
      // Atualiza o cache do React Query
      queryClient.setQueryData(['/api/budgets'], updatedBudgets);
      
      // Salvar no localStorage para persistência
      localStorage.setItem('eurodent_budgets', JSON.stringify(updatedBudgets));
      
      toast({
        title: "Orçamento excluído",
        description: `O orçamento #${budgetId} foi excluído com sucesso.`,
      });
      
      // Fechar o diálogo se estiver aberto
      if (showDialog && selectedBudget?.id === budgetId) {
        setShowDialog(false);
      }
    }
  };
  
  const handleViewBudget = (budgetId: number) => {
    if (!budgets) return;
    
    const budget = budgets.find(b => b.id === budgetId);
    if (!budget) {
      toast({
        title: "Erro",
        description: `Orçamento #${budgetId} não encontrado.`,
        variant: "destructive",
      });
      return;
    }
    
    // Resetar o formulário primeiro
    setSelectedClient(null);
    setManualVehicleInfo(budget.vehicle_info || "");
    setDate(budget.date || new Date().toISOString().split('T')[0]);
    setNote(budget.note || "");
    setTotalAw(budget.total_aw || 0);
    setTotalValue(budget.total_value || 0);
    setPhotoUrl(budget.photo_url || null);
    
    // Resetar todas as peças para não selecionadas, mas mantendo as informações de orientação
    const initialPartDamages: Record<string, PartDamage> = {
      // Peças verticais
      paraLamaEsquerdo: { selected: false, diameter20: 0, diameter30: 0, diameter40: 0, optionA: false, optionK: false, optionP: false, isHorizontal: false },
      // Peças horizontais
      capo: { selected: false, diameter20: 0, diameter30: 0, diameter40: 0, optionA: false, optionK: false, optionP: false, isHorizontal: true },
      // Peças verticais
      paraLamaDireito: { selected: false, diameter20: 0, diameter30: 0, diameter40: 0, optionA: false, optionK: false, optionP: false, isHorizontal: false },
      colunaEsquerda: { selected: false, diameter20: 0, diameter30: 0, diameter40: 0, optionA: false, optionK: false, optionP: false, isHorizontal: false },
      // Peças horizontais
      teto: { selected: false, diameter20: 0, diameter30: 0, diameter40: 0, optionA: false, optionK: false, optionP: false, isHorizontal: true }, 
      // Peças verticais
      colunaDireita: { selected: false, diameter20: 0, diameter30: 0, diameter40: 0, optionA: false, optionK: false, optionP: false, isHorizontal: false },
      portaDianteiraEsquerda: { selected: false, diameter20: 0, diameter30: 0, diameter40: 0, optionA: false, optionK: false, optionP: false, isHorizontal: false },
      portaDianteiraDireita: { selected: false, diameter20: 0, diameter30: 0, diameter40: 0, optionA: false, optionK: false, optionP: false, isHorizontal: false },
      portaTraseiraEsquerda: { selected: false, diameter20: 0, diameter30: 0, diameter40: 0, optionA: false, optionK: false, optionP: false, isHorizontal: false },
      // Peças horizontais
      portaMalasSuperior: { selected: false, diameter20: 0, diameter30: 0, diameter40: 0, optionA: false, optionK: false, optionP: false, isHorizontal: true },
      // Peças verticais
      portaTraseiraDireita: { selected: false, diameter20: 0, diameter30: 0, diameter40: 0, optionA: false, optionK: false, optionP: false, isHorizontal: false },
      lateralEsquerda: { selected: false, diameter20: 0, diameter30: 0, diameter40: 0, optionA: false, optionK: false, optionP: false, isHorizontal: false },
      portaMalasInferior: { selected: false, diameter20: 0, diameter30: 0, diameter40: 0, optionA: false, optionK: false, optionP: false, isHorizontal: false },
      lateralDireita: { selected: false, diameter20: 0, diameter30: 0, diameter40: 0, optionA: false, optionK: false, optionP: false, isHorizontal: false }
    };
    
    // Marcar as peças danificadas
    if (budget.damaged_parts && budget.damaged_parts.length > 0) {
      budget.damaged_parts.forEach(part => {
        if (initialPartDamages[part]) {
          initialPartDamages[part].selected = true;
          
          // Se tivermos dados mais detalhados em uma implementação real, poderíamos
          // adicionar valores para os diâmetros e opções aqui
        }
      });
    }
    
    setPartDamages(initialPartDamages);
    
    // Definir o orçamento selecionado e modo de visualização
    setSelectedBudget(budget);
    setIsViewMode(true);
    setShowDialog(true);
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
          // Apenas foca o elemento
          inputElement.focus();
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
    
    // Criar uma versão atualizada para calcular totais
    const updatedDamages = {
      ...partDamages,
      [part]: {
        ...partDamages[part],
        [diameter]: value,
        selected: value > 0 // Assumimos que se há um valor, a peça está selecionada
      }
    };
    
    // Calculadora de AW e valor total
    calculateTotals(updatedDamages);
  };
  
  // Função para calcular os totais de AW e valor com base na tabela
  const calculateTotals = (damages: Record<string, PartDamage>) => {
    
    // Cálculo normal para outros casos
    let totalAW = 0;
    let totalEuros = 0;
    
    // Para cada peça danificada, calcular o AW
    Object.entries(damages).forEach(([partKey, damage]) => {
      // Verifica se algum diâmetro possui valor
      if (damage.selected) {
        // Processar diâmetro 20mm se houver
        if (damage.diameter20 > 0) {
          const result = hailCalculation(
            20, 
            damage.diameter20, 
            !damage.isHorizontal, // isVertical é o oposto de isHorizontal
            damage.optionA,  // Alumínio
            damage.optionK   // Cola (Glue)
          );
          totalAW += result.aw;
          totalEuros += parseFloat(result.cost);
        }
        
        // Processar diâmetro 30mm se houver
        if (damage.diameter30 > 0) {
          const result = hailCalculation(
            30, 
            damage.diameter30, 
            !damage.isHorizontal, 
            damage.optionA, 
            damage.optionK
          );
          totalAW += result.aw;
          totalEuros += parseFloat(result.cost);
        }
        
        // Processar diâmetro 40mm se houver
        if (damage.diameter40 > 0) {
          const result = hailCalculation(
            40, 
            damage.diameter40, 
            !damage.isHorizontal, 
            damage.optionA, 
            damage.optionK
          );
          totalAW += result.aw;
          totalEuros += parseFloat(result.cost);
        }
      }
    });
    
    // Arredondar o valor total para 2 casas decimais
    totalEuros = Math.round(totalEuros * 100) / 100;
    
    // Atualizar os estados
    setTotalAw(totalAW);
    setTotalValue(totalEuros);
  };
  
  // Referência para o input de arquivo
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  
  // Função para abrir o seletor de arquivos
  const handlePhotoUpload = () => {
    if (isViewMode) return; // Não permitir uploads no modo de visualização
    
    // Acionar o input de arquivo oculto
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };
  
  // Função para processar o arquivo selecionado
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    // Verificar o tipo de arquivo (apenas imagens)
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Tipo de arquivo inválido",
        description: "Por favor, selecione uma imagem (JPG, PNG, etc).",
        variant: "destructive",
      });
      return;
    }
    
    // Verificar o tamanho do arquivo (máximo de 5MB por exemplo)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      toast({
        title: "Arquivo muito grande",
        description: "O tamanho máximo permitido é 5MB.",
        variant: "destructive",
      });
      return;
    }
    
    // Criar uma URL para o arquivo selecionado
    const fileUrl = URL.createObjectURL(file);
    setPhotoUrl(fileUrl);
    
    toast({
      title: "Foto adicionada",
      description: "A foto foi adicionada ao orçamento com sucesso.",
    });
    
    // Limpar o valor do input para permitir selecionar o mesmo arquivo novamente
    event.target.value = '';
  };



  // Componente para renderizar cada item de peça
  const DamagedPartItem = ({ partKey, label }: { partKey: string, label: string }) => {
    const damage = partDamages[partKey];
    
    // Função para lidar com o foco no input
    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      if (isViewMode) return; // Não ajustar o cursor no modo de visualização
      
      // Precisamos usar setTimeout para garantir que o browser tenha tempo de processar o foco
      setTimeout(() => {
        // Posiciona o cursor no final do texto
        const length = e.target.value.length;
        e.target.setSelectionRange(length, length);
      }, 0);
    };
    
    // Função otimizada para lidar com a mudança nos inputs 
    // mantendo o foco ativo no campo atual
    const handleInputChange = (diameter: 'diameter20' | 'diameter30' | 'diameter40', value: string) => {
      if (isViewMode) return; // Não permitir alterações no modo de visualização
      
      const numValue = parseInt(value) || 0;
      
      // Atualizar o valor no estado
      handleDiameterChange(partKey, diameter, numValue);
    };
    
    return (
      <div className={`p-2 border rounded-md space-y-3 ${damage.selected ? 'border-primary bg-blue-50' : 'border-gray-200'}`}>
        <div className="font-medium text-sm text-center border-b pb-1 mb-1">
          {label}
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label htmlFor={`${partKey}-diameter20`} className="text-xs">20mm:</label>
            <Input
              id={`${partKey}-diameter20`}
              type="text"
              pattern="[0-9]*"
              inputMode="numeric"
              value={damage.diameter20 || ''}
              onChange={(e) => {
                // Permitir apenas números e limitar a 4 dígitos
                const value = e.target.value.replace(/\D/g, '').substring(0, 4);
                handleInputChange('diameter20', value);
              }}
              onFocus={handleFocus}
              autoComplete="off"
              className="w-16 h-7 text-xs"
              ref={(el) => {
                inputRefs.current[`${partKey}-diameter20`] = el;
              }}
              readOnly={isViewMode}
              disabled={isViewMode}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <label htmlFor={`${partKey}-diameter30`} className="text-xs">30mm:</label>
            <Input
              id={`${partKey}-diameter30`}
              type="text"
              pattern="[0-9]*"
              inputMode="numeric"
              value={damage.diameter30 || ''}
              onChange={(e) => {
                // Permitir apenas números e limitar a 4 dígitos
                const value = e.target.value.replace(/\D/g, '').substring(0, 4);
                handleInputChange('diameter30', value);
              }}
              onFocus={handleFocus}
              autoComplete="off"
              className="w-16 h-7 text-xs"
              ref={(el) => {
                inputRefs.current[`${partKey}-diameter30`] = el;
              }}
              readOnly={isViewMode}
              disabled={isViewMode}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <label htmlFor={`${partKey}-diameter40`} className="text-xs">40mm:</label>
            <Input
              id={`${partKey}-diameter40`}
              type="text"
              pattern="[0-9]*"
              inputMode="numeric"
              value={damage.diameter40 || ''}
              onChange={(e) => {
                // Permitir apenas números e limitar a 4 dígitos
                const value = e.target.value.replace(/\D/g, '').substring(0, 4);
                handleInputChange('diameter40', value);
              }}
              onFocus={handleFocus}
              autoComplete="off"
              className="w-16 h-7 text-xs"
              ref={(el) => {
                inputRefs.current[`${partKey}-diameter40`] = el;
              }}
              readOnly={isViewMode}
              disabled={isViewMode}
            />
          </div>
          
          {/* Checkboxes A, K, P */}
          <div className="flex justify-between pt-1 border-t mt-2">
            <div className="flex items-center gap-1">
              <Checkbox 
                id={`${partKey}-optionA`} 
                checked={damage.optionA}
                onCheckedChange={(checked) => {
                  if (isViewMode) return; // Não permitir alterações no modo de visualização
                  const newValue = !!checked;
                  
                  // Atualizar estado do checkbox
                  setPartDamages(prev => {
                    const updatedDamages = {
                      ...prev,
                      [partKey]: {
                        ...prev[partKey],
                        optionA: newValue
                      }
                    };
                    
                    // Recalcular totais após a mudança se a peça estiver selecionada
                    if (prev[partKey].selected) {
                      calculateTotals(updatedDamages);
                    }
                    
                    return updatedDamages;
                  });
                }}
                disabled={isViewMode}
              />
              <label htmlFor={`${partKey}-optionA`} className="text-xs">(A)</label>
            </div>
            
            <div className="flex items-center gap-1">
              <Checkbox 
                id={`${partKey}-optionK`} 
                checked={damage.optionK}
                onCheckedChange={(checked) => {
                  if (isViewMode) return; // Não permitir alterações no modo de visualização
                  const newValue = !!checked;
                  
                  // Atualizar estado do checkbox
                  setPartDamages(prev => {
                    const updatedDamages = {
                      ...prev,
                      [partKey]: {
                        ...prev[partKey],
                        optionK: newValue
                      }
                    };
                    
                    // Recalcular totais após a mudança se a peça estiver selecionada
                    if (prev[partKey].selected) {
                      calculateTotals(updatedDamages);
                    }
                    
                    return updatedDamages;
                  });
                }}
                disabled={isViewMode}
              />
              <label htmlFor={`${partKey}-optionK`} className="text-xs">(K)</label>
            </div>
            
            <div className="flex items-center gap-1">
              <Checkbox 
                id={`${partKey}-optionP`} 
                checked={damage.optionP}
                onCheckedChange={(checked) => {
                  if (isViewMode) return; // Não permitir alterações no modo de visualização
                  // Pintura não afeta o cálculo conforme especificado
                  setPartDamages(prev => ({
                    ...prev,
                    [partKey]: {
                      ...prev[partKey],
                      optionP: !!checked
                    }
                  }));
                }}
                disabled={isViewMode}
              />
              <label htmlFor={`${partKey}-optionP`} className="text-xs">(P)</label>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Filtrar orçamentos baseado numa busca que procura em todos os campos simultaneamente
  const filteredBudgets = React.useMemo(() => {
    if (!budgets || !searchQuery.trim()) return budgets;
    
    const query = searchQuery.toLowerCase().trim();
    
    return budgets.filter(budget => {
      // Procurar em todos os campos simultaneamente
      const matchesClient = budget.client_name.toLowerCase().includes(query);
      const matchesVehicle = budget.vehicle_info.toLowerCase().includes(query);
      const matchesId = budget.id.toString().includes(query);
      
      // Retorna true se qualquer um dos campos contiver o texto da busca
      return matchesClient || matchesVehicle || matchesId;
    });
  }, [budgets, searchQuery]);
  
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
          <Dialog open={showDialog} onOpenChange={(open) => {
              // Ao fechar o diálogo, resetar o modo de visualização
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
                      value={totalValue}
                      onChange={(e) => setTotalValue(Number(e.target.value))}
                      onFocus={(e) => e.target.select()}
                      autoComplete="off"
                      readOnly={isViewMode}
                      disabled={isViewMode}
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
                {isViewMode ? (
                  <>
                    <Button variant="outline" onClick={() => setShowDialog(false)}>
                      Fechar
                    </Button>
                    <Button 
                      variant="secondary"
                      onClick={() => setIsViewMode(false)}
                      className="mr-2"
                    >
                      <PencilIcon className="h-4 w-4 mr-2" />
                      Editar
                    </Button>
                    <Button 
                      variant="default"
                      onClick={() => handlePrintBudget(selectedBudget?.id || 0)}
                    >
                      <PrinterIcon className="h-4 w-4 mr-2" />
                      Imprimir
                    </Button>
                  </>
                ) : selectedBudget ? (
                  // Se temos um orçamento selecionado, estamos editando (não criando)
                  <>
                    <Button variant="outline" onClick={() => setIsViewMode(true)}>
                      Cancelar
                    </Button>
                    <Button 
                      onClick={handleUpdateBudget}
                    >
                      Salvar Alterações
                    </Button>
                  </>
                ) : (
                  // Caso contrário, estamos criando um novo orçamento
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
        }
      />
      
      <div className="grid gap-6 mt-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Orçamentos</CardTitle>
            <CardDescription>
              Todos os orçamentos criados para clientes
            </CardDescription>
            
            <div className="mt-4">
              <Input
                placeholder="Buscar por Cliente, Placa ou Chassi..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full"
              />
            </div>
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
                {filteredBudgets && filteredBudgets.length > 0 ? (
                  filteredBudgets.map((budget) => (
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
                            onClick={() => handleDeleteBudget(budget.id)}
                            title="Excluir orçamento"
                          >
                            <Trash2Icon className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-6 text-gray-500 italic">
                      {budgets && budgets.length > 0 && searchQuery 
                        ? `Nenhum orçamento encontrado para "${searchQuery}".` 
                        : "Nenhum orçamento encontrado. Crie um novo orçamento para começar."}
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