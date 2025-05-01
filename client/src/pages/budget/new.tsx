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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Loader2, Save, ArrowLeft } from "lucide-react";
import { storeOfflineRequest } from "@/lib/offlineDb";

// Define schema para validação do formulário de orçamento
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
});

type BudgetFormValues = z.infer<typeof budgetSchema>;

interface Client {
  id: number;
  name: string;
}

const NewBudgetPage: React.FC = () => {
  const { toast } = useToast();
  const [_, navigate] = useLocation();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch clients for select dropdown (apenas ativos/não excluídos)
  const { data: clients, isLoading: isLoadingClients } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
    queryFn: async () => {
      const response = await fetch('/api/clients?filterMode=active');
      if (!response.ok) {
        throw new Error('Erro ao carregar clientes');
      }
      return response.json();
    },
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
    },
  });


  // Handle form submission
  const onSubmit = async (data: BudgetFormValues) => {
    setIsSubmitting(true);
    
    try {
      // Converter client_id para número (já que forms sempre passam string)
      const formattedData = {
        ...data,
        client_id: parseInt(data.client_id),
        damaged_parts: typeof data.damaged_parts === 'string' 
          ? data.damaged_parts 
          : JSON.stringify(data.damaged_parts)
      };
      
      // Verificar estado da conexão
      if (!navigator.onLine) {
        try {
          
          // Salvar localmente no IndexedDB para sincronização silenciosa posterior
          const timestamp = new Date().getTime();
          const pendingRequest = {
            id: `budget_${timestamp}`,
            timestamp,
            url: '/api/budgets',
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: formattedData,
            tableName: 'budgets',
            operationType: 'create' as const
          };
          
          // Salvar a requisição pendente para sincronização posterior
          await storeOfflineRequest(pendingRequest);
          
          // Feedback genérico sem mencionar o modo offline
          toast({
            title: "Orçamento criado",
            description: "O orçamento foi criado com sucesso.",
          });
          
          // Criar um item temporário para atualizar o cache
          const tempItem = {
            id: -(new Date().getTime()),
            ...formattedData,
            _isOffline: true,
            created_at: new Date().toISOString(),
            status: 'pending'
          };
          
          // Obter dados atuais e adicionar novo item
          const currentItems = queryClient.getQueryData(["/api/budgets"]) || [];
          // Garante que currentItems seja tratado como array
          const itemsArray = Array.isArray(currentItems) ? currentItems : [];
          queryClient.setQueryData(["/api/budgets"], [...itemsArray, tempItem]);
          
          // Redirecionar após o cadastro
          navigate("/budgets");
        } catch (offlineError) {
          console.error('Erro ao processar orçamento:', offlineError);
          toast({
            title: "Erro",
            description: "Ocorreu um erro ao criar o orçamento. Tente novamente.",
            variant: "destructive",
          });
        }
      } else {
        // Enviar para a API se online
        const response = await fetch("/api/budgets", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(formattedData),
        });
        
        if (!response.ok) {
          throw new Error("Falha ao criar orçamento");
        }
        
        const result = await response.json();
        
        toast({
          title: "Orçamento criado",
          description: "O orçamento foi criado com sucesso.",
        });
        
        // Redirecionar para a página de orçamentos
        queryClient.invalidateQueries({ queryKey: ["/api/budgets"] });
        navigate("/budgets");
      }
    } catch (error) {
      console.error("Erro ao criar orçamento:", error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao criar o orçamento. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

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
            <CardTitle className="text-2xl">Novo Orçamento</CardTitle>
          </div>
          <CardDescription>
            Crie um novo orçamento para o cliente
          </CardDescription>
        </CardHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="space-y-4">
              {/* Seção Cliente e Veículo */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="client_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cliente</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
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
              
              <FormDescription className="text-sm text-muted-foreground">
                Observação: O mapa de danos será preenchido na tela de edição do orçamento.
              </FormDescription>
            </CardContent>
            
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

export default NewBudgetPage;