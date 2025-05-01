import React, { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
// Remover importação de useLocation e usar window.location
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { CalendarIcon, ArrowLeft, Upload, Image } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { calculateBudgetTotals } from "@/utils/hailCalculation";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

// Define a estrutura de uma peça danificada
interface DamageUnit {
  size20?: number;
  size30?: number;
  size40?: number;
  isAluminum?: boolean;
  isGlue?: boolean;
  isPaint?: boolean;
}

// Interface para os danos completos do veículo
interface VehicleDamage {
  [key: string]: DamageUnit;
}

// Schema para validação do formulário
const budgetSchema = z.object({
  date: z.date({
    required_error: "A data é obrigatória",
  }),
  client_name: z.string().min(1, "Nome do cliente é obrigatório"),
  vehicle_info: z.string().min(1, "Informações do veículo são obrigatórias"),
  plate: z.string().optional(),
  chassis_number: z.string().optional(),
});

// Tipo inferido a partir do schema
type BudgetFormValues = z.infer<typeof budgetSchema>;

// Lista de todas as peças do veículo
const vehicleParts = [
  "para_lama_esquerdo", "capo", "para_lama_direito",
  "coluna_esquerda", "teto", "coluna_direita",
  "porta_dianteira_esquerda", "imagem_central", "porta_dianteira_direita",
  "porta_traseira_esquerda", "porta_malas_superior", "porta_traseira_direita",
  "lateral_esquerda", "porta_malas_inferior", "lateral_direita"
];

// Nomes de exibição das peças
const partDisplayNames: Record<string, string> = {
  para_lama_esquerdo: "Para-lama Esquerdo",
  capo: "Capô",
  para_lama_direito: "Para-lama Direito",
  coluna_esquerda: "Coluna Esquerda",
  teto: "Teto",
  coluna_direita: "Coluna Direita",
  porta_dianteira_esquerda: "Porta Dianteira Esquerda",
  imagem_central: "", // Espaço vazio para a imagem
  porta_dianteira_direita: "Porta Dianteira Direita",
  porta_traseira_esquerda: "Porta Traseira Esquerda",
  porta_malas_superior: "Porta Malas Superior",
  porta_traseira_direita: "Porta Traseira Direita",
  lateral_esquerda: "Lateral Esquerda",
  porta_malas_inferior: "Porta Malas Inferior",
  lateral_direita: "Lateral Direita"
};

const NewBudgetForm: React.FC<NewBudgetFormProps> = ({ 
  initialData = null, 
  readOnly = false,
  onSuccess = () => {},
  isInDialog = false
}) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const isGestor = user?.role === "gestor" || user?.role === "manager";
  const queryClient = useQueryClient();
  const [damages, setDamages] = useState<VehicleDamage>({});
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [vehicleImage, setVehicleImage] = useState<string | null>(initialData?.vehicle_image || null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { t } = useTranslation();
  
  // Buscar a lista de clientes do banco de dados
  const { data: clients, isLoading: isLoadingClients } = useQuery<any[]>({
    queryKey: ['/api/clients'],
    retry: 1,
  });

  // Inicialize os danos com todas as peças ou use os danos iniciais
  useEffect(() => {
    let initialDamages: VehicleDamage = {};
    
    // Se temos dados iniciais, tente usar eles
    if (initialData && initialData.damaged_parts) {
      try {
        // Se for string, parse o JSON
        const parsedDamages = typeof initialData.damaged_parts === 'string' 
          ? JSON.parse(initialData.damaged_parts) 
          : initialData.damaged_parts;
        
        initialDamages = parsedDamages;
      } catch (error) {
        console.error("Erro ao processar dados de danos:", error);
      }
    }
    
    // Preencher partes faltantes
    vehicleParts.forEach(part => {
      if (!initialDamages[part]) {
        initialDamages[part] = {
          size20: 0,
          size30: 0,
          size40: 0,
          isAluminum: false,
          isGlue: false,
          isPaint: false
        };
      }
    });
    
    setDamages(initialDamages);
  }, [initialData]);

  // Configuração do formulário
  const form = useForm<BudgetFormValues>({
    resolver: zodResolver(budgetSchema),
    defaultValues: {
      date: initialData?.date ? new Date(initialData.date) : new Date(),
      client_name: initialData?.client_id ? String(initialData.client_id) : "",
      vehicle_info: initialData?.vehicle_info || "",
      plate: initialData?.plate || "",
      chassis_number: initialData?.chassis_number || ""
    },
  });

  // Submissão do formulário
  const onSubmit = async (data: BudgetFormValues) => {
    if (readOnly) return; // Não submeter se estiver em modo somente leitura
    
    try {
      // Calcular valores com base nos danos
      const totalValues = calculateTotalValues(damages);
      
      // Convertemos client_name (que é o ID do cliente como string) para client_id como número
      // Usando destructuring para omitir client_name e adicionar client_id
      const { client_name, ...restData } = data;
      
      const budget = {
        ...restData,
        client_id: parseInt(client_name), // Convertendo para número
        date: format(data.date, "yyyy-MM-dd"),
        damaged_parts: JSON.stringify(damages),
        total_aw: totalValues.totalAw,
        total_value: totalValues.totalValue,
        vehicle_image: vehicleImage
      };
      
      // Log para depuração
      console.log("Enviando orçamento para o servidor:", {
        ...budget,
        vehicle_image: vehicleImage ? `Imagem com ${vehicleImage.length} caracteres` : t("budget.noImage")
      });

      if (initialData) {
        // Atualizar orçamento existente
        await updateBudget(budget, initialData.id);
        toast({
          title: t("budget.budgetUpdated"),
          description: "As alterações foram salvas com sucesso.",
        });
      } else {
        // Criar novo orçamento
        await saveNewBudget(budget);
        toast({
          title: t("budget.budgetCreated"),
          description: "O orçamento foi salvo e está pronto para ser utilizado.",
        });
      }
      
      // Chamar callback de sucesso ou redirecionar
      if (onSuccess) {
        onSuccess(budget);
      } else {
        window.location.href = "/budgets";
      }
    } catch (error) {
      console.error("Erro ao processar orçamento:", error);
      toast({
        title: initialData ? "Erro ao atualizar orçamento" : "Erro ao criar orçamento",
        description: "Ocorreu um problema ao salvar o orçamento. Por favor, tente novamente.",
        variant: "destructive",
      });
    }
  };

  // Função para salvar um novo orçamento
  const saveNewBudget = async (budget: any) => {
    const response = await fetch("/api/budgets", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(budget),
    });

    if (!response.ok) {
      throw new Error("Falha ao criar orçamento");
    }

    return response.json();
  };
  
  // Função para atualizar um orçamento existente
  const updateBudget = async (budget: any, budgetId: number) => {
    const response = await fetch(`/api/budgets/${budgetId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(budget),
    });

    if (!response.ok) {
      throw new Error("Falha ao atualizar orçamento");
    }

    return response.json();
  };

  // Função para atualizar os valores de danos
  const handleDamageChange = (part: string, field: keyof DamageUnit, value: any) => {
    setDamages(prev => ({
      ...prev,
      [part]: {
        ...prev[part],
        [field]: value
      }
    }));
  };

  // Função para calcular os valores totais usando a fórmula avançada
  const calculateTotalValues = (damages: VehicleDamage) => {
    // Usar a função de cálculo avançada
    const { totalAW, totalCost } = calculateBudgetTotals(damages);
    
    return { 
      totalAw: totalAW, 
      totalValue: totalCost 
    };
  };
  
  // Funções para gerenciar o upload de imagens
  const handleImageClick = () => {
    if (readOnly) return;
    fileInputRef.current?.click();
  };
  
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      console.log("Imagem carregada com tamanho:", base64String.length);
      setVehicleImage(base64String);
    };
    reader.readAsDataURL(file);
  };

  // Renderizar o grid de danos do veículo
  const renderDamageGrid = () => {
    return (
      <div className="grid grid-cols-3 gap-2 mt-4 max-w-6xl mx-auto">
        {/* Primeira linha: Para-lama Esquerdo - Capô - Para-lama Direito */}
        <DamagePart part="para_lama_esquerdo" damages={damages} onChange={handleDamageChange} readOnly={readOnly} />
        <DamagePart part="capo" damages={damages} onChange={handleDamageChange} readOnly={readOnly} />
        <DamagePart part="para_lama_direito" damages={damages} onChange={handleDamageChange} readOnly={readOnly} />

        {/* Segunda linha: Coluna Esquerda - Teto - Coluna Direita */}
        <DamagePart part="coluna_esquerda" damages={damages} onChange={handleDamageChange} readOnly={readOnly} />
        <DamagePart part="teto" damages={damages} onChange={handleDamageChange} readOnly={readOnly} />
        <DamagePart part="coluna_direita" damages={damages} onChange={handleDamageChange} readOnly={readOnly} />

        {/* Terceira linha: Porta Dianteira Esquerda - Espaço para Imagem - Porta Dianteira Direita */}
        <DamagePart part="porta_dianteira_esquerda" damages={damages} onChange={handleDamageChange} readOnly={readOnly} />
        <div 
          className={`p-3 border rounded-md ${readOnly ? 'bg-gray-50' : 'bg-gray-50 hover:bg-gray-100 cursor-pointer transition-colors'} flex flex-col items-center justify-center`}
          onClick={handleImageClick}
        >
          {vehicleImage ? (
            <div className="w-full h-full flex items-center justify-center">
              <img 
                src={vehicleImage} 
                alt="Imagem do veículo" 
                className="max-w-full max-h-[80px] object-contain"
              />
            </div>
          ) : (
            <>
              <Upload className="h-5 w-5 text-gray-400 mb-1" />
              <div className="text-center text-gray-400 text-xs">
                {readOnly ? "Sem imagem" : "Clique para inserir foto"}
              </div>
            </>
          )}
          <input 
            type="file"
            ref={fileInputRef}
            onChange={handleImageChange}
            accept="image/*"
            className="hidden"
            disabled={readOnly}
          />
        </div>
        <DamagePart part="porta_dianteira_direita" damages={damages} onChange={handleDamageChange} readOnly={readOnly} />

        {/* Quarta linha: Porta Traseira Esquerda - Porta Malas Superior - Porta Traseira Direita */}
        <DamagePart part="porta_traseira_esquerda" damages={damages} onChange={handleDamageChange} readOnly={readOnly} />
        <DamagePart part="porta_malas_superior" damages={damages} onChange={handleDamageChange} readOnly={readOnly} />
        <DamagePart part="porta_traseira_direita" damages={damages} onChange={handleDamageChange} readOnly={readOnly} />

        {/* Quinta linha: Lateral Esquerda - Porta Malas Inferior - Lateral Direita */}
        <DamagePart part="lateral_esquerda" damages={damages} onChange={handleDamageChange} readOnly={readOnly} />
        <DamagePart part="porta_malas_inferior" damages={damages} onChange={handleDamageChange} readOnly={readOnly} />
        <DamagePart part="lateral_direita" damages={damages} onChange={handleDamageChange} readOnly={readOnly} />
      </div>
    );
  };

  return (
    <div className="container p-0">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Primeira linha: Data e Cliente (selecionável do BD) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>DATA</FormLabel>
                  {readOnly ? (
                    <div className="p-2 border rounded-md">
                      {field.value ? format(field.value, "dd/MM/yyyy", { locale: ptBR }) : ""}
                    </div>
                  ) : (
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={`pl-3 text-left font-normal ${!field.value ? "text-muted-foreground" : ""}`}
                          >
                            {field.value ? (
                              format(field.value, "dd/MM/yyyy", { locale: ptBR })
                            ) : (
                              <span>Selecione uma data</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="client_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>CLIENTE</FormLabel>
                  {readOnly ? (
                    <div className="p-2 border rounded-md">
                      {clients?.find(c => c.id.toString() === field.value)?.name || ""}
                    </div>
                  ) : (
                    <>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                        disabled={readOnly}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione um cliente" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {isLoadingClients ? (
                            <SelectItem value="loading">Carregando clientes...</SelectItem>
                          ) : !clients || clients.length === 0 ? (
                            <SelectItem value="no-clients">Nenhum cliente encontrado</SelectItem>
                          ) : (
                            clients.map((client) => (
                              <SelectItem key={client.id} value={client.id.toString()}>
                                {client.name}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Segunda linha: Veículo - Placa - Chassi (digitados manualmente) */}
          <div className="grid grid-cols-3 gap-4 mb-4">
            <FormField
              control={form.control}
              name="vehicle_info"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>VEÍCULO</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Marca/Modelo" 
                      {...field} 
                      readOnly={readOnly}
                      className={readOnly ? "bg-gray-50" : ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="plate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>PLACA</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="ABC1234" 
                      {...field} 
                      readOnly={readOnly}
                      className={readOnly ? "bg-gray-50" : ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="chassis_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>CHASSI</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Número do chassi" 
                      {...field} 
                      readOnly={readOnly}
                      className={readOnly ? "bg-gray-50" : ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Separador */}
          <Separator className="my-4" />

          {/* Título da seção de danos */}
          <div>
            <h3 className="text-lg font-semibold mb-2">Danos do Veículo</h3>
            <p className="text-sm text-gray-500 mb-4">
              {readOnly 
                ? "Visualização dos danos registrados no veículo" 
                : "Indique a posição, quantidade e tamanho dos danos em cada parte do veículo"
              }
            </p>
          </div>

          {/* Grid de danos do veículo */}
          {renderDamageGrid()}

          {/* Legenda dos materiais especiais */}
          <div className="bg-gray-50 p-4 rounded-md mt-4">
            <h4 className="font-medium mb-2">Materiais Especiais</h4>
            <p className="text-sm">
              (A) = Alumínio (+25%)  |  (K) = Cola (+30%)  |  (P) = Pintura
            </p>
            <p className="text-xs text-gray-500 mt-1">
              *Valores calculados automaticamente de acordo com a tabela de referência
            </p>
          </div>

          {/* Exibição dos Totais - Ocultando para gestores */}
          {!isGestor && (
            <div className="bg-gray-50 p-4 rounded-md mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium mb-2">Total AW</h4>
                  <p className="text-xl font-bold">
                    {calculateTotalValues(damages).totalAw.toFixed(2)}
                  </p>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Total €</h4>
                  <p className="text-xl font-bold">
                    {calculateTotalValues(damages).totalValue.toFixed(2)} €
                  </p>
                </div>
              </div>
            </div>
          )}
          {isGestor && (
            <div className="bg-gray-50 p-4 rounded-md mt-4">
              <p className="text-center text-sm text-gray-500">
                Informações financeiras disponíveis apenas para administradores
              </p>
            </div>
          )}

          {/* Botões de ação - só mostrar se não for modo somente leitura */}
          {!readOnly && (
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (isInDialog) {
                    // Se estiver em um modal, apenas limpar o formulário
                    form.reset();
                  } else {
                    // Se estiver em uma página própria, voltar para a lista
                    window.location.href = "/budgets";
                  }
                }}
              >
                Cancelar
              </Button>
              <Button type="submit">
                {initialData ? "Atualizar Orçamento" : "Salvar Orçamento"}
              </Button>
            </div>
          )}
        </form>
      </Form>
    </div>
  );
};

// Props para o componente NewBudgetForm
interface NewBudgetFormProps {
  initialData?: any;
  readOnly?: boolean;
  onSuccess?: (data: any) => void;
  isInDialog?: boolean;
}

// Componente para renderizar uma unidade de dano (uma parte do veículo)
interface DamagePartProps {
  part: string;
  damages: VehicleDamage;
  onChange: (part: string, field: keyof DamageUnit, value: any) => void;
  readOnly?: boolean;
}

const DamagePart: React.FC<DamagePartProps> = ({ part, damages, onChange, readOnly = false }) => {
  // Acesso ao contexto de autenticação para verificar se é gestor
  const { user } = useAuth();
  const isGestor = user?.role === "gestor" || user?.role === "manager";
  
  // Se for o espaço para imagem, retornar um espaço vazio
  if (part === "imagem_central") {
    return <div className="border rounded-md p-4"></div>;
  }

  const damage = damages[part] || {};
  
  // Removemos a restrição para gestores, agora todos podem ver os detalhes
  // mesmo em modo somente leitura
  
  return (
    <div className="border rounded-md p-2">
      <h4 className="font-medium text-xs mb-1 text-center">{partDisplayNames[part]}</h4>
      <div className="space-y-1">
        {/* Tamanho 20mm - Alinhamento simétrico com padding negativo no rótulo e positivo no input */}
        <div className="flex items-center justify-between">
          <span className="w-8 text-xs text-right -mr-2">20mm:</span>
          {readOnly ? (
            <span className="w-12 h-6 text-xs text-center py-1 border border-gray-200 rounded px-2">{damage.size20 || 0}</span>
          ) : (
            <Input
              type="number"
              value={damage.size20 || 0}
              onChange={(e) => onChange(part, "size20", parseInt(e.target.value) || 0)}
              className="w-12 h-6 text-xs px-2 text-center"
              min={0}
              readOnly={readOnly}
            />
          )}
        </div>
        
        {/* Tamanho 30mm - Alinhamento simétrico com padding negativo no rótulo e positivo no input */}
        <div className="flex items-center justify-between">
          <span className="w-8 text-xs text-right -mr-2">30mm:</span>
          {readOnly ? (
            <span className="w-12 h-6 text-xs text-center py-1 border border-gray-200 rounded px-2">{damage.size30 || 0}</span>
          ) : (
            <Input
              type="number"
              value={damage.size30 || 0}
              onChange={(e) => onChange(part, "size30", parseInt(e.target.value) || 0)}
              className="w-12 h-6 text-xs px-2 text-center"
              min={0}
              readOnly={readOnly}
            />
          )}
        </div>
        
        {/* Tamanho 40mm - Alinhamento simétrico com padding negativo no rótulo e positivo no input */}
        <div className="flex items-center justify-between">
          <span className="w-8 text-xs text-right -mr-2">40mm:</span>
          {readOnly ? (
            <span className="w-12 h-6 text-xs text-center py-1 border border-gray-200 rounded px-2">{damage.size40 || 0}</span>
          ) : (
            <Input
              type="number"
              value={damage.size40 || 0}
              onChange={(e) => onChange(part, "size40", parseInt(e.target.value) || 0)}
              className="w-12 h-6 text-xs px-2 text-center"
              min={0}
              readOnly={readOnly}
            />
          )}
        </div>
        
        {/* Checkboxes para materiais especiais - com melhor alinhamento */}
        <div className="flex justify-between mt-2 -mx-2 w-full">
          <div className="flex items-center justify-center w-6">
            <div className="flex flex-col items-center">
              <Checkbox 
                id={`${part}-aluminum`}
                checked={damage.isAluminum || false}
                onCheckedChange={(checked) => !readOnly && onChange(part, "isAluminum", !!checked)}
                className="h-3 w-3 mb-0.5"
                disabled={readOnly}
              />
              <label htmlFor={`${part}-aluminum`} className="text-xs font-semibold text-red-600">A</label>
            </div>
          </div>
          <div className="flex items-center justify-center w-6">
            <div className="flex flex-col items-center">
              <Checkbox 
                id={`${part}-glue`}
                checked={damage.isGlue || false}
                onCheckedChange={(checked) => !readOnly && onChange(part, "isGlue", !!checked)}
                className="h-3 w-3 mb-0.5"
                disabled={readOnly}
              />
              <label htmlFor={`${part}-glue`} className="text-xs font-semibold text-blue-600">K</label>
            </div>
          </div>
          <div className="flex items-center justify-center w-6">
            <div className="flex flex-col items-center">
              <Checkbox 
                id={`${part}-paint`}
                checked={damage.isPaint || false}
                onCheckedChange={(checked) => !readOnly && onChange(part, "isPaint", !!checked)}
                className="h-3 w-3 mb-0.5"
                disabled={readOnly}
              />
              <label htmlFor={`${part}-paint`} className="text-xs font-semibold text-green-600">P</label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewBudgetForm;