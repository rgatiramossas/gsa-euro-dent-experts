import React, { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Loader2, Save, ArrowLeft, AlertCircle } from "lucide-react";
import { generateDamagedPartsGrid } from "@/components/PdfGenerator";

// Define schema para validação do formulário de edição de orçamento
const budgetSchema = z.object({
  client_id: z.string().min(1, { message: "Cliente obrigatório" }),
  vehicle_info: z.string().min(1, { message: "Informações do veículo obrigatórias" }),
  plate: z.string().optional(),
  chassis_number: z.string().optional(),
  date: z.string().min(1, { message: "Data obrigatória" }),
  total_aw: z.coerce.number().nonnegative().optional(),
  total_value: z.coerce.number().nonnegative().optional(),
  note: z.string().optional(),
  damaged_parts: z.any().optional(),
  photo_url: z.string().optional(),
});

type BudgetFormValues = z.infer<typeof budgetSchema>;

interface Client {
  id: number;
  name: string;
}

interface EditBudgetPageProps {
  id: string;
}

// Opções para o grid de danos
const damagePartsOptions = [
  { id: 'paraLamaEsquerdo', name: 'Para-lama Esquerdo' },
  { id: 'capo', name: 'Capô' },
  { id: 'paraLamaDireito', name: 'Para-lama Direito' },
  { id: 'colunaEsquerda', name: 'Coluna Esquerda' },
  { id: 'teto', name: 'Teto' },
  { id: 'colunaDireita', name: 'Coluna Direita' },
  { id: 'portaDianteiraEsquerda', name: 'Porta Dianteira Esquerda' },
  { id: 'portaDianteiraDireita', name: 'Porta Dianteira Direita' },
  { id: 'portaTraseiraEsquerda', name: 'Porta Traseira Esquerda' },
  { id: 'lateral', name: 'Lateral' },
  { id: 'portaTraseiraDireita', name: 'Porta Traseira Direita' },
  { id: 'portaMalasInferior', name: 'Porta-malas Inferior' },
];

const EditBudgetPage: React.FC<EditBudgetPageProps> = ({ id }) => {
  const { toast } = useToast();
  const [_, navigate] = useLocation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedParts, setSelectedParts] = useState<Record<string, any>>({});
  const [currentTab, setCurrentTab] = useState("general");

  // Fetch budget data
  const { data: budget, isLoading: isLoadingBudget, error: budgetError } = useQuery({
    queryKey: [`/api/budgets/${id}`],
    queryFn: async () => {
      const response = await fetch(`/api/budgets/${id}`);
      if (!response.ok) {
        throw new Error("Falha ao carregar orçamento");
      }
      return response.json();
    },
  });

  // Fetch clients for select dropdown
  const { data: clients, isLoading: isLoadingClients } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
    retry: 1,
  });

  // Setup form with validation
  const form = useForm<BudgetFormValues>({
    resolver: zodResolver(budgetSchema),
    defaultValues: {
      client_id: "",
      vehicle_info: "",
      plate: "",
      chassis_number: "",
      date: new Date().toISOString().split("T")[0],
      total_aw: 0,
      total_value: 0,
      note: "",
      damaged_parts: "{}",
      photo_url: "",
    },
  });

  // Update form with budget data when loaded
  useEffect(() => {
    if (budget) {
      form.reset({
        client_id: budget.client_id.toString(),
        vehicle_info: budget.vehicle_info || "",
        plate: budget.plate || "",
        chassis_number: budget.chassis_number || "",
        date: budget.date ? new Date(budget.date).toISOString().split("T")[0] : "",
        total_aw: budget.total_aw || 0,
        total_value: budget.total_value || 0,
        note: budget.note || "",
        damaged_parts: budget.damaged_parts || "{}",
        photo_url: budget.photo_url || "",
      });

      // Processar o objeto damaged_parts
      try {
        const damagedParts = typeof budget.damaged_parts === 'string' 
          ? JSON.parse(budget.damaged_parts) 
          : budget.damaged_parts || {};
        setSelectedParts(damagedParts);
      } catch (error) {
        console.error("Erro ao processar partes danificadas:", error);
        setSelectedParts({});
      }
    }
  }, [budget, form]);

  // Função para atualizar as partes selecionadas
  const handlePartSelection = (partId: string, selected: boolean) => {
    setSelectedParts(prev => {
      const newParts = { ...prev };
      
      if (selected) {
        // Adicionar parte ou atualizar se já existir
        newParts[partId] = {
          ...(newParts[partId] || {}),
          selected: true,
          diameter20: newParts[partId]?.diameter20 || 0,
          diameter30: newParts[partId]?.diameter30 || 0,
          diameter40: newParts[partId]?.diameter40 || 0,
          optionA: newParts[partId]?.optionA || false,
          optionK: newParts[partId]?.optionK || false,
          optionP: newParts[partId]?.optionP || false,
        };
      } else {
        // Remover seleção (manter a parte no objeto mas marcada como não selecionada)
        if (newParts[partId]) {
          newParts[partId].selected = false;
        }
      }
      
      return newParts;
    });
  };

  // Funções para atualizar os diâmetros e opções
  const handleDiameterChange = (partId: string, size: string, value: number) => {
    setSelectedParts(prev => {
      const newParts = { ...prev };
      
      if (!newParts[partId]) {
        newParts[partId] = {
          selected: true,
          diameter20: 0,
          diameter30: 0,
          diameter40: 0,
          optionA: false,
          optionK: false,
          optionP: false,
        };
      }
      
      newParts[partId][size] = value;
      return newParts;
    });
  };

  const handleOptionChange = (partId: string, option: string, checked: boolean) => {
    setSelectedParts(prev => {
      const newParts = { ...prev };
      
      if (!newParts[partId]) {
        newParts[partId] = {
          selected: true,
          diameter20: 0,
          diameter30: 0,
          diameter40: 0,
          optionA: false,
          optionK: false,
          optionP: false,
        };
      }
      
      newParts[partId][option] = checked;
      return newParts;
    });
  };

  // Handle form submission
  const onSubmit = async (data: BudgetFormValues) => {
    setIsSubmitting(true);
    
    try {
      // Converter client_id para número (já que forms sempre passam string)
      const formattedData = {
        ...data,
        client_id: parseInt(data.client_id),
        damaged_parts: JSON.stringify(selectedParts)
      };
      
      // Enviar para a API
      const response = await fetch(`/api/budgets/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formattedData),
      });
      
      if (!response.ok) {
        throw new Error("Falha ao atualizar orçamento");
      }
      
      const result = await response.json();
      
      toast({
        title: "Orçamento atualizado",
        description: "O orçamento foi atualizado com sucesso.",
      });
      
      // Invalidar o cache e redirecionar
      queryClient.invalidateQueries({ queryKey: ["/api/budgets"] });
      queryClient.invalidateQueries({ queryKey: [`/api/budgets/${id}`] });
      navigate("/budgets");
      
    } catch (error) {
      console.error("Erro ao atualizar orçamento:", error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao atualizar o orçamento. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Mostrar tela de carregamento
  if (isLoadingBudget) {
    return (
      <div className="container mx-auto p-4 sm:p-6 flex justify-center items-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Carregando orçamento...</span>
      </div>
    );
  }

  // Mostrar tela de erro
  if (budgetError) {
    return (
      <div className="container mx-auto p-4 sm:p-6">
        <Card className="border-red-200">
          <CardHeader>
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
              <CardTitle>Erro ao Carregar Orçamento</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p>Não foi possível carregar os dados do orçamento. Verifique se o ID está correto.</p>
            <Button 
              onClick={() => navigate("/budgets")} 
              className="mt-4"
            >
              Voltar para Orçamentos
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 sm:p-6">
      <Card>
        <CardHeader>
          <div className="flex items-center mb-2">
            <Button 
              variant="ghost" 
              className="mr-2 p-0 h-8 w-8" 
              onClick={() => navigate("/budgets")}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <CardTitle className="text-2xl">Editar Orçamento #{id}</CardTitle>
          </div>
          <CardDescription>
            Atualize as informações do orçamento
          </CardDescription>
        </CardHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <Tabs value={currentTab} onValueChange={setCurrentTab}>
              <div className="px-6">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="general">Informações Gerais</TabsTrigger>
                  <TabsTrigger value="damages">Mapa de Danos</TabsTrigger>
                </TabsList>
              </div>
              
              <TabsContent value="general">
                <CardContent className="space-y-4 pt-4">
                  {/* Seção Cliente e Veículo */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="client_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Cliente</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione um cliente" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {isLoadingClients ? (
                                <SelectItem value="">Carregando...</SelectItem>
                              ) : clients && clients.length > 0 ? (
                                clients.map((client) => (
                                  <SelectItem key={client.id} value={client.id.toString()}>
                                    {client.name}
                                  </SelectItem>
                                ))
                              ) : (
                                <SelectItem value="">Nenhum cliente encontrado</SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="vehicle_info"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Veículo</FormLabel>
                          <FormControl>
                            <Input placeholder="Modelo, ano, etc" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  {/* Seção Placa e Data */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="plate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Placa</FormLabel>
                          <FormControl>
                            <Input placeholder="ABC-1234" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Data</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  {/* Seção Chassi e Valores */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="chassis_number"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Chassi</FormLabel>
                          <FormControl>
                            <Input placeholder="Número do chassi" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="total_aw"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Total AW</FormLabel>
                          <FormControl>
                            <Input type="number" min="0" step="0.1" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="total_value"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Valor Total (R$)</FormLabel>
                          <FormControl>
                            <Input type="number" min="0" step="0.01" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  {/* URL da Foto */}
                  <FormField
                    control={form.control}
                    name="photo_url"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>URL da Foto</FormLabel>
                        <FormControl>
                          <Input placeholder="http://exemplo.com/foto.jpg" {...field} />
                        </FormControl>
                        <FormDescription>
                          URL da foto do veículo (opcional)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {/* Observações */}
                  <FormField
                    control={form.control}
                    name="note"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Observações</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Observações sobre o orçamento" 
                            className="resize-none h-24"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </TabsContent>
              
              <TabsContent value="damages">
                <CardContent className="pt-4">
                  <div className="mb-4">
                    <h3 className="text-lg font-medium mb-2">Peças Danificadas</h3>
                    <p className="text-sm text-muted-foreground">
                      Selecione as peças danificadas e especifique o tipo e quantidade de danos.
                    </p>
                  </div>
                  
                  {/* Grid de seleção de peças */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                    {damagePartsOptions.map((part) => (
                      <div key={part.id} className="border rounded-md p-4 space-y-3">
                        <div className="flex items-center space-x-2">
                          <Checkbox 
                            id={`part-${part.id}`} 
                            checked={selectedParts[part.id]?.selected || false}
                            onCheckedChange={(checked) => 
                              handlePartSelection(part.id, checked === true)
                            }
                          />
                          <Label 
                            htmlFor={`part-${part.id}`}
                            className="font-medium"
                          >
                            {part.name}
                          </Label>
                        </div>
                        
                        {selectedParts[part.id]?.selected && (
                          <div className="pl-6 space-y-3">
                            <div className="space-y-2">
                              <Label className="text-xs">Quantidade de Amassados</Label>
                              <div className="grid grid-cols-3 gap-2">
                                <div>
                                  <Label htmlFor={`${part.id}-20mm`} className="text-xs">20mm</Label>
                                  <Input 
                                    id={`${part.id}-20mm`}
                                    type="number" 
                                    min="0"
                                    className="h-8"
                                    value={selectedParts[part.id]?.diameter20 || 0}
                                    onChange={(e) => 
                                      handleDiameterChange(part.id, 'diameter20', Number(e.target.value))
                                    }
                                  />
                                </div>
                                <div>
                                  <Label htmlFor={`${part.id}-30mm`} className="text-xs">30mm</Label>
                                  <Input 
                                    id={`${part.id}-30mm`}
                                    type="number" 
                                    min="0"
                                    className="h-8"
                                    value={selectedParts[part.id]?.diameter30 || 0}
                                    onChange={(e) => 
                                      handleDiameterChange(part.id, 'diameter30', Number(e.target.value))
                                    }
                                  />
                                </div>
                                <div>
                                  <Label htmlFor={`${part.id}-40mm`} className="text-xs">40mm</Label>
                                  <Input 
                                    id={`${part.id}-40mm`}
                                    type="number" 
                                    min="0"
                                    className="h-8"
                                    value={selectedParts[part.id]?.diameter40 || 0}
                                    onChange={(e) => 
                                      handleDiameterChange(part.id, 'diameter40', Number(e.target.value))
                                    }
                                  />
                                </div>
                              </div>
                            </div>
                            
                            <div className="space-y-1">
                              <Label className="text-xs">Opções</Label>
                              <div className="flex space-x-4">
                                <div className="flex items-center space-x-1">
                                  <Checkbox 
                                    id={`${part.id}-optionA`}
                                    checked={selectedParts[part.id]?.optionA || false}
                                    onCheckedChange={(checked) => 
                                      handleOptionChange(part.id, 'optionA', checked === true)
                                    }
                                  />
                                  <Label 
                                    htmlFor={`${part.id}-optionA`}
                                    className="text-xs text-red-500 font-medium"
                                  >
                                    A
                                  </Label>
                                </div>
                                <div className="flex items-center space-x-1">
                                  <Checkbox 
                                    id={`${part.id}-optionK`}
                                    checked={selectedParts[part.id]?.optionK || false}
                                    onCheckedChange={(checked) => 
                                      handleOptionChange(part.id, 'optionK', checked === true)
                                    }
                                  />
                                  <Label 
                                    htmlFor={`${part.id}-optionK`}
                                    className="text-xs text-blue-500 font-medium"
                                  >
                                    K
                                  </Label>
                                </div>
                                <div className="flex items-center space-x-1">
                                  <Checkbox 
                                    id={`${part.id}-optionP`}
                                    checked={selectedParts[part.id]?.optionP || false}
                                    onCheckedChange={(checked) => 
                                      handleOptionChange(part.id, 'optionP', checked === true)
                                    }
                                  />
                                  <Label 
                                    htmlFor={`${part.id}-optionP`}
                                    className="text-xs text-green-500 font-medium"
                                  >
                                    P
                                  </Label>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  
                  <div className="border rounded-md p-4 mb-4">
                    <h4 className="font-medium mb-2">Legenda</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div className="flex items-center">
                        <span className="inline-block w-4 h-4 text-center font-bold text-red-500 mr-2">A</span>
                        <span className="text-sm">Alumínio</span>
                      </div>
                      <div className="flex items-center">
                        <span className="inline-block w-4 h-4 text-center font-bold text-blue-500 mr-2">K</span>
                        <span className="text-sm">Peça Substituída</span>
                      </div>
                      <div className="flex items-center">
                        <span className="inline-block w-4 h-4 text-center font-bold text-green-500 mr-2">P</span>
                        <span className="text-sm">Com Pintura</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Visualização do grid resultante */}
                  <div className="border rounded-md p-4">
                    <h4 className="font-medium mb-2">Visualização do Mapa de Danos</h4>
                    <div className="mt-3 p-4 bg-gray-50 rounded-md overflow-x-auto">
                      <div 
                        dangerouslySetInnerHTML={{ 
                          __html: generateDamagedPartsGrid(selectedParts)
                        }} 
                      />
                    </div>
                  </div>
                </CardContent>
              </TabsContent>
            </Tabs>
            
            <CardFooter className="flex justify-between">
              <Button 
                variant="outline" 
                type="button"
                onClick={() => navigate("/budgets")}
              >
                Cancelar
              </Button>
              <Button 
                type="submit"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Salvar
                  </>
                )}
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>
    </div>
  );
};

export default EditBudgetPage;