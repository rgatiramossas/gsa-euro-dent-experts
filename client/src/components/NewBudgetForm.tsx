import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
// Remover importação de useLocation e usar window.location
import { useToast } from "@/hooks/use-toast";
import { CalendarIcon, ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { calculateBudgetTotals } from "@/utils/hailCalculation";

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

const NewBudgetForm: React.FC = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [damages, setDamages] = useState<VehicleDamage>({});
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  
  // Buscar a lista de clientes do banco de dados
  const { data: clients, isLoading: isLoadingClients } = useQuery<any[]>({
    queryKey: ['/api/clients'],
    retry: 1,
  });

  // Inicialize os danos com todas as peças
  useEffect(() => {
    const initialDamages: VehicleDamage = {};
    vehicleParts.forEach(part => {
      initialDamages[part] = {
        size20: 0,
        size30: 0,
        size40: 0,
        isAluminum: false,
        isGlue: false,
        isPaint: false
      };
    });
    setDamages(initialDamages);
  }, []);

  // Configuração do formulário
  const form = useForm<BudgetFormValues>({
    resolver: zodResolver(budgetSchema),
    defaultValues: {
      date: new Date(),
      client_name: "",
      vehicle_info: "",
      plate: "",
      chassis_number: ""
    },
  });

  // Submissão do formulário
  const onSubmit = async (data: BudgetFormValues) => {
    try {
      // Calcular valores com base nos danos
      const totalValues = calculateTotalValues(damages);
      
      const budget = {
        ...data,
        date: format(data.date, "yyyy-MM-dd"),
        damaged_parts: damages,
        total_aw: totalValues.totalAw,
        total_value: totalValues.totalValue
      };

      // Enviar para a API
      await saveNewBudget(budget);

      toast({
        title: "Orçamento criado com sucesso",
        description: "O orçamento foi salvo e está pronto para ser utilizado.",
      });
      
      window.location.href = "/budgets";
    } catch (error) {
      console.error("Erro ao criar orçamento:", error);
      toast({
        title: "Erro ao criar orçamento",
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

  // Renderizar o grid de danos do veículo
  const renderDamageGrid = () => {
    return (
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 mt-4 max-w-6xl mx-auto">
        {/* Primeira linha: Para-lama Esquerdo - Capô - Para-lama Direito */}
        <DamagePart part="para_lama_esquerdo" damages={damages} onChange={handleDamageChange} />
        <DamagePart part="capo" damages={damages} onChange={handleDamageChange} />
        <DamagePart part="para_lama_direito" damages={damages} onChange={handleDamageChange} />

        {/* Segunda linha: Coluna Esquerda - Teto - Coluna Direita */}
        <DamagePart part="coluna_esquerda" damages={damages} onChange={handleDamageChange} />
        <DamagePart part="teto" damages={damages} onChange={handleDamageChange} />
        <DamagePart part="coluna_direita" damages={damages} onChange={handleDamageChange} />

        {/* Terceira linha: Porta Dianteira Esquerda - Espaço Imagem - Porta Dianteira Direita */}
        <DamagePart part="porta_dianteira_esquerda" damages={damages} onChange={handleDamageChange} />
        <div className="p-3 border rounded-md bg-gray-50 flex items-center justify-center">
          <div className="text-center text-gray-400 text-xs">Veículo</div>
        </div>
        <DamagePart part="porta_dianteira_direita" damages={damages} onChange={handleDamageChange} />

        {/* Quarta linha: Porta Traseira Esquerda - Porta Malas Superior - Porta Traseira Direita */}
        <DamagePart part="porta_traseira_esquerda" damages={damages} onChange={handleDamageChange} />
        <DamagePart part="porta_malas_superior" damages={damages} onChange={handleDamageChange} />
        <DamagePart part="porta_traseira_direita" damages={damages} onChange={handleDamageChange} />

        {/* Quinta linha: Lateral Esquerda - Porta Malas Inferior - Lateral Direita */}
        <DamagePart part="lateral_esquerda" damages={damages} onChange={handleDamageChange} />
        <DamagePart part="porta_malas_inferior" damages={damages} onChange={handleDamageChange} />
        <DamagePart part="lateral_direita" damages={damages} onChange={handleDamageChange} />
      </div>
    );
  };

  return (
    <div className="container mx-auto p-4 sm:p-6">
      <Card>
        <CardHeader>
          <div className="flex items-center mb-2">
            <Button 
              variant="ghost" 
              className="mr-2 p-0 h-8 w-8" 
              onClick={() => window.location.href = "/budgets"}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <CardTitle className="text-2xl">Novo Orçamento</CardTitle>
          </div>
          <CardDescription>
            Preencha os dados do veículo e indique as áreas danificadas
          </CardDescription>
        </CardHeader>
        <CardContent>
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
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
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
                        <Input placeholder="Marca/Modelo" {...field} />
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
                        <Input placeholder="ABC1234" {...field} />
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
                        <Input placeholder="Número do chassi" {...field} />
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
                  Indique a posição, quantidade e tamanho dos danos em cada parte do veículo
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

              {/* Exibição dos Totais */}
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

              {/* Botões de ação */}
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => window.location.href = "/budgets"}
                >
                  Cancelar
                </Button>
                <Button type="submit">Salvar Orçamento</Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};

// Componente para renderizar uma unidade de dano (uma parte do veículo)
interface DamagePartProps {
  part: string;
  damages: VehicleDamage;
  onChange: (part: string, field: keyof DamageUnit, value: any) => void;
}

const DamagePart: React.FC<DamagePartProps> = ({ part, damages, onChange }) => {
  // Se for o espaço para imagem, retornar um espaço vazio
  if (part === "imagem_central") {
    return <div className="border rounded-md p-4"></div>;
  }

  const damage = damages[part] || {};
  
  return (
    <div className="border rounded-md p-2">
      <h4 className="font-medium text-xs mb-1">{partDisplayNames[part]}</h4>
      <div className="space-y-1">
        {/* Tamanho 20 */}
        <div className="flex items-center justify-between">
          <span className="w-5 text-xs text-right pr-1">20</span>
          <Input
            type="number"
            value={damage.size20 || 0}
            onChange={(e) => onChange(part, "size20", parseInt(e.target.value) || 0)}
            className="w-12 h-6 text-xs px-1 text-right"
            min={0}
          />
        </div>
        
        {/* Tamanho 30 */}
        <div className="flex items-center justify-between">
          <span className="w-5 text-xs text-right pr-1">30</span>
          <Input
            type="number"
            value={damage.size30 || 0}
            onChange={(e) => onChange(part, "size30", parseInt(e.target.value) || 0)}
            className="w-12 h-6 text-xs px-1 text-right"
            min={0}
          />
        </div>
        
        {/* Tamanho 40 */}
        <div className="flex items-center justify-between">
          <span className="w-5 text-xs text-right pr-1">40</span>
          <Input
            type="number"
            value={damage.size40 || 0}
            onChange={(e) => onChange(part, "size40", parseInt(e.target.value) || 0)}
            className="w-12 h-6 text-xs px-1 text-right"
            min={0}
          />
        </div>
        
        {/* Checkboxes para materiais especiais */}
        <div className="flex justify-start gap-3 mt-2">
          <div className="flex items-center">
            <Checkbox 
              id={`${part}-aluminum`}
              checked={damage.isAluminum || false}
              onCheckedChange={(checked) => onChange(part, "isAluminum", !!checked)}
              className="h-3 w-3"
            />
            <label htmlFor={`${part}-aluminum`} className="ml-1 text-xs">A</label>
          </div>
          <div className="flex items-center">
            <Checkbox 
              id={`${part}-glue`}
              checked={damage.isGlue || false}
              onCheckedChange={(checked) => onChange(part, "isGlue", !!checked)}
              className="h-3 w-3"
            />
            <label htmlFor={`${part}-glue`} className="ml-1 text-xs">K</label>
          </div>
          <div className="flex items-center">
            <Checkbox 
              id={`${part}-paint`}
              checked={damage.isPaint || false}
              onCheckedChange={(checked) => onChange(part, "isPaint", !!checked)}
              className="h-3 w-3"
            />
            <label htmlFor={`${part}-paint`} className="ml-1 text-xs">P</label>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewBudgetForm;