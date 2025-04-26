import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/common/PageHeader";
import { 
  Card, 
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { 
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { ServiceListItem } from "@/types";
import { useAuth } from "@/contexts/AuthContext";
import { formatCurrency, formatDate, formatRelativeDate } from "@/lib/utils";
import { ServiceStatusBadge } from "@/components/common/ServiceStatusBadge";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

// Esquema para o formulário de despesas
const expenseFormSchema = z.object({
  description: z.string().min(3, {
    message: "A descrição precisa ter pelo menos 3 caracteres.",
  }),
  amount: z.string().refine(
    (val) => {
      // Remover € e trocar vírgula por ponto para conversão
      const cleanValue = val.replace(/[€\s]/g, '').replace(',', '.');
      return !isNaN(parseFloat(cleanValue)) && parseFloat(cleanValue) > 0;
    },
    {
      message: "O valor deve ser um número positivo",
    }
  ),
  date: z.string().refine(val => !isNaN(Date.parse(val)), {
    message: "Data inválida",
  }),
  category: z.string().min(1, {
    message: "Categoria é obrigatória",
  }),
  provider: z.string().optional(),
  notes: z.string().optional(),
});

// Esquema para o formulário de pagamento
const paymentFormSchema = z.object({
  payment_method: z.string().min(1, {
    message: "Método de pagamento é obrigatório",
  }),
  payment_date: z.string().refine(val => !isNaN(Date.parse(val)), {
    message: "Data inválida",
  }),
  transaction_id: z.string().optional(),
  payment_notes: z.string().optional(),
});

type ExpenseFormValues = z.infer<typeof expenseFormSchema>;
type PaymentFormValues = z.infer<typeof paymentFormSchema>;

export default function Finances() {
  const [period, setPeriod] = useState("month");
  const [expenseDialogOpen, setExpenseDialogOpen] = useState(false);
  const [paymentRequestDialogOpen, setPaymentRequestDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedPaymentRequest, setSelectedPaymentRequest] = useState<PaymentRequest | null>(null);
  const [selectedServices, setSelectedServices] = useState<number[]>([]);
  const { user: currentUser } = useAuth();
  const isAdmin = currentUser?.role === "admin";
  const { toast } = useToast();
  
  // Formulário de despesas
  const expenseForm = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: {
      description: "",
      amount: "",
      date: new Date().toISOString().split('T')[0],
      category: "operacional",
      provider: "",
      notes: ""
    }
  });
  
  // Formulário de pagamento
  const paymentForm = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentFormSchema),
    defaultValues: {
      payment_method: "",
      payment_date: new Date().toISOString().split('T')[0],
      transaction_id: "",
      payment_notes: ""
    }
  });
  
  // Get all services for financial data
  const { data: services, isLoading } = useQuery<ServiceListItem[]>({
    queryKey: ['/api/services'],
  });
  
  // Get all expenses
  const { data: expenses, isLoading: loadingExpenses } = useQuery<Expense[]>({
    queryKey: ['/api/expenses'],
  });
  
  interface Expense {
    id: number;
    type: string;
    amount: number;
    date: string;
    description: string;
    payment_method: string;
    provider?: string;
    notes?: string;
    created_at: string;
  }
  
  interface PaymentRequest {
    id: number;
    created_at: string;
    status: string;
    payment_date?: string;
    payment_details?: string;
    technician_id: number;
    technician?: {
      id: number;
      name: string;
    } | null;
    services?: ServiceListItem[];
  }

  // Get payment requests data
  const { data: paymentRequests, isLoading: loadingPaymentRequests } = useQuery<PaymentRequest[]>({
    queryKey: ['/api/payment-requests'],
  });
  
  // Get all technicians for admin payment request selection
  const { data: technicians } = useQuery<{id: number, name: string}[]>({
    queryKey: ['/api/users', 'technician'],
    queryFn: async () => {
      return await apiRequest('/api/users', 'GET', null, { params: { role: 'technician' } });
    },
    enabled: isAdmin,
  });
  
  // State for technician selection in admin payment request form
  const [selectedTechnician, setSelectedTechnician] = useState<number | undefined>();
  
  // All services that can be added to a payment request (completed but not in a payment request)
  const completableServices = services?.filter(service => 
    (service.status === "completed" && 
    (!selectedTechnician || service.technician?.id === selectedTechnician))
  );
  
  // Serviços do técnico logado com status "completed" (para pedidos de pagamento)
  const completedTechnicianServices = services?.filter(service => 
    service.status === "completed" && service.technician?.id === currentUser?.id
  );
  
  // Mutation para criar pedido de pagamento
  const createPaymentRequestMutation = useMutation({
    mutationFn: async (serviceIds: number[]) => {
      // Se for admin, inclui o técnico selecionado (ou null se não houver)
      if (isAdmin) {
        return await apiRequest('/api/payment-requests', 'POST', { 
          service_ids: serviceIds,
          technician_id: selectedTechnician
        });
      } else {
        // Para técnicos, usa apenas os IDs de serviço
        return await apiRequest('/api/payment-requests', 'POST', { 
          service_ids: serviceIds
        });
      }
    },
    onSuccess: () => {
      // Invalidar cache para atualizar dados de serviços e pedidos
      queryClient.invalidateQueries({ queryKey: ['/api/services'] });
      queryClient.invalidateQueries({ queryKey: ['/api/payment-requests'] });
      
      setSelectedServices([]);
      setPaymentRequestDialogOpen(false);
      toast({
        title: "Pedido de pagamento criado",
        description: "Seu pedido foi enviado para aprovação.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao criar pedido",
        description: `Ocorreu um erro: ${error.message}`,
        variant: "destructive",
      });
    }
  });
  
  // Mutation para atualizar status de pedido de pagamento (aprovar/rejeitar)
  const updatePaymentRequestMutation = useMutation({
    mutationFn: async ({ requestId, status }: { requestId: number, status: string }) => {
      return await apiRequest(`/api/payment-requests/${requestId}`, 'PATCH', { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/services'] });
      queryClient.invalidateQueries({ queryKey: ['/api/payment-requests'] });
      toast({
        title: "Pedido atualizado",
        description: "O status do pedido foi atualizado com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao atualizar pedido",
        description: `Ocorreu um erro: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  // Mutation para registrar pagamento de um pedido
  const registerPaymentMutation = useMutation({
    mutationFn: async ({ requestId, paymentData }: { requestId: number, paymentData: PaymentFormValues }) => {
      return await apiRequest(`/api/payment-requests/${requestId}/pay`, 'PATCH', { 
        payment_date: paymentData.payment_date,
        payment_details: {
          payment_method: paymentData.payment_method,
          transaction_id: paymentData.transaction_id,
          payment_notes: paymentData.payment_notes
        }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/services'] });
      queryClient.invalidateQueries({ queryKey: ['/api/payment-requests'] });
      setPaymentDialogOpen(false);
      setSelectedPaymentRequest(null);
      paymentForm.reset({
        payment_method: "",
        payment_date: new Date().toISOString().split('T')[0],
        transaction_id: "",
        payment_notes: ""
      });
      toast({
        title: "Pagamento registrado",
        description: "O pagamento foi registrado com sucesso e uma despesa foi criada.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao registrar pagamento",
        description: `Ocorreu um erro: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  const handleApprovePaymentRequest = (requestId: number) => {
    updatePaymentRequestMutation.mutate({ requestId, status: "aprovado" });
  };

  const handleRejectPaymentRequest = (requestId: number) => {
    updatePaymentRequestMutation.mutate({ requestId, status: "rejeitado" });
  };
  
  const handleOpenPaymentDialog = (paymentRequest: PaymentRequest) => {
    setSelectedPaymentRequest(paymentRequest);
    setPaymentDialogOpen(true);
  };
  
  const handleSubmitPayment = (data: PaymentFormValues) => {
    if (!selectedPaymentRequest) return;
    
    registerPaymentMutation.mutate({ 
      requestId: selectedPaymentRequest.id, 
      paymentData: data 
    });
  };

  const handleCreatePaymentRequest = () => {
    if (selectedServices.length === 0) {
      toast({
        title: "Nenhum serviço selecionado",
        description: "Selecione pelo menos um serviço para solicitar pagamento.",
        variant: "destructive",
      });
      return;
    }
    
    createPaymentRequestMutation.mutate(selectedServices);
  };
  
  // Toggle seleção de serviço para pagamento
  const toggleServiceSelection = (serviceId: number) => {
    setSelectedServices(prev => 
      prev.includes(serviceId) 
        ? prev.filter(id => id !== serviceId) 
        : [...prev, serviceId]
    );
  };
  
  if (!isAdmin && !completedTechnicianServices?.length) {
    return (
      <div className="py-6 px-4 sm:px-6 lg:px-8">
        <PageHeader
          title="Financeiro"
          description="Estatísticas e relatórios financeiros"
        />
        
        <Tabs defaultValue="payment_requests" className="space-y-6">
          <TabsList className="mb-4">
            <TabsTrigger value="payment_requests">Pedidos de Pagamento</TabsTrigger>
          </TabsList>
          
          <TabsContent value="payment_requests">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Pedidos de Pagamento</CardTitle>
                <div className="text-sm text-muted-foreground">
                  Você não tem serviços concluídos para solicitar pagamento.
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="flex justify-center items-center py-10 text-gray-500">
                  Nenhum serviço disponível para solicitar pagamento.
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    );
  }
  
  // Interface para técnicos (apenas Pedidos de Pagamento)
  if (!isAdmin) {
    return (
      <div className="py-6 px-4 sm:px-6 lg:px-8">
        <PageHeader
          title="Financeiro"
          description="Solicite pagamentos para serviços concluídos"
        />
        
        <Tabs defaultValue="payment_requests" className="space-y-6">
          <TabsList className="mb-4">
            <TabsTrigger value="payment_requests">Pedidos de Pagamento</TabsTrigger>
          </TabsList>
          
          <TabsContent value="payment_requests">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Pedidos de Pagamento</CardTitle>
                <Button 
                  size="sm" 
                  onClick={() => setPaymentRequestDialogOpen(true)}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Novo Pedido
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                {loadingPaymentRequests ? (
                  <div className="flex justify-center items-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
                  </div>
                ) : !paymentRequests || !Array.isArray(paymentRequests) || paymentRequests.length === 0 ? (
                  <div className="flex justify-center items-center py-8 text-gray-500">
                    Nenhum pedido de pagamento encontrado
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Valor Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paymentRequests
                        .filter(req => req.technician_id === currentUser?.id)
                        .map((request) => (
                          <TableRow key={request.id}>
                            <TableCell>#{request.id}</TableCell>
                            <TableCell>{formatDate(request.created_at)}</TableCell>
                            <TableCell>
                              <Badge className={
                                request.status === "aguardando_aprovacao" ? "bg-amber-600" :
                                request.status === "aprovado" ? "bg-green-600" :
                                request.status === "rejeitado" ? "bg-red-600" :
                                "bg-gray-600"
                              }>
                                {request.status === "aguardando_aprovacao" ? "Aguardando Aprovação" :
                                 request.status === "aprovado" ? "Aprovado" :
                                 request.status === "rejeitado" ? "Rejeitado" : request.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {formatCurrency(
                                request.services?.reduce((sum: number, s: any) => {
                                  // Para técnicos, mostrar apenas a soma dos valores do serviço (sem taxas administrativas)
                                  // Para admin, mostrar a soma dos valores totais
                                  const valueToAdd = isAdmin ? (s.total || 0) : (s.price || 0);
                                  return sum + valueToAdd;
                                }, 0) || 0
                              )}
                            </TableCell>
                          </TableRow>
                        ))
                      }
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        
        {/* Modal para criar pedido de pagamento */}
        <Dialog open={paymentRequestDialogOpen} onOpenChange={setPaymentRequestDialogOpen}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Novo Pedido de Pagamento</DialogTitle>
              <DialogDescription>
                Selecione os serviços concluídos para os quais deseja solicitar pagamento.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {isLoading ? (
                <div className="flex justify-center items-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
                </div>
              ) : completedTechnicianServices?.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  Você não tem serviços concluídos para solicitar pagamento.
                </div>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {completedTechnicianServices?.map(service => (
                    <div 
                      key={service.id} 
                      className="flex items-center space-x-2 p-3 border rounded-md hover:bg-gray-50 cursor-pointer"
                      onClick={() => toggleServiceSelection(service.id)}
                    >
                      <input 
                        type="checkbox" 
                        className="h-5 w-5 rounded" 
                        checked={selectedServices.includes(service.id)}
                        onChange={() => toggleServiceSelection(service.id)}
                      />
                      <div className="flex-1">
                        <div className="font-medium">
                          {service.client.name} - {service.serviceType?.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {formatDate(service.completion_date || service.created_at)} - OS #{service.id}
                        </div>
                      </div>
                      <div className="font-semibold">
                        {formatCurrency(isAdmin ? (service.total || 0) : (service.price || 0))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="flex justify-between items-center border-t pt-4 mt-4">
              <div>
                <span className="font-medium">Total selecionado: </span>
                {formatCurrency(
                  completedTechnicianServices
                    ?.filter(service => selectedServices.includes(service.id))
                    .reduce((sum, service) => {
                      // Para técnicos, mostrar apenas a soma dos valores do serviço (sem taxas administrativas)
                      // Para admin, mostrar a soma dos valores totais
                      const valueToAdd = isAdmin ? (service.total || 0) : (service.price || 0);
                      return sum + valueToAdd;
                    }, 0) || 0
                )}
              </div>
              <div className="space-x-2">
                <Button 
                  variant="outline" 
                  onClick={() => setPaymentRequestDialogOpen(false)}
                >
                  Cancelar
                </Button>
                <Button 
                  onClick={handleCreatePaymentRequest}
                  disabled={selectedServices.length === 0 || createPaymentRequestMutation.isPending}
                >
                  {createPaymentRequestMutation.isPending ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                      Enviando...
                    </div>
                  ) : "Enviar Pedido"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }
  
  // Filter financially relevant services (completed, awaiting approval, invoiced, paid)
  const financiallyRelevantServices = services?.filter(service => 
    ["completed", "aguardando_aprovacao", "faturado", "pago"].includes(service.status)
  );
  
  // Calculate stats
  const calculateStats = () => {
    if (!financiallyRelevantServices || financiallyRelevantServices.length === 0) {
      return {
        totalRevenue: 0,
        servicesCount: 0,
        averageTicket: 0,
      };
    }
    
    const now = new Date();
    const filteredServices = financiallyRelevantServices.filter(service => {
      const serviceDate = new Date(service.created_at || "");
      if (period === "week") {
        // Last 7 days
        const weekAgo = new Date(now);
        weekAgo.setDate(now.getDate() - 7);
        return serviceDate >= weekAgo;
      } else if (period === "month") {
        // Last 30 days
        const monthAgo = new Date(now);
        monthAgo.setDate(now.getDate() - 30);
        return serviceDate >= monthAgo;
      } else if (period === "year") {
        // This year
        return serviceDate.getFullYear() === now.getFullYear();
      }
      return true; // All time
    });
    
    const totalRevenue = filteredServices.reduce((sum, service) => {
      // Para técnicos, mostrar apenas a soma dos valores do serviço (sem taxas administrativas)
      // Para admin, mostrar a soma dos valores totais
      const valueToAdd = isAdmin ? (service.total || 0) : (service.price || 0);
      return sum + valueToAdd;
    }, 0);
    const servicesCount = filteredServices.length;
    const averageTicket = servicesCount > 0 ? totalRevenue / servicesCount : 0;
    
    return {
      totalRevenue,
      servicesCount,
      averageTicket,
    };
  };
  
  // Prepare chart data
  const prepareChartData = () => {
    if (!financiallyRelevantServices || financiallyRelevantServices.length === 0) {
      return [];
    }
    
    const now = new Date();
    const chartData: { name: string; value: number }[] = [];
    
    if (period === "week") {
      // Last 7 days
      for (let i = 6; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(now.getDate() - i);
        date.setHours(0, 0, 0, 0);
        
        const nextDate = new Date(date);
        nextDate.setDate(date.getDate() + 1);
        
        const dayTotal = financiallyRelevantServices
          .filter(service => {
            const serviceDate = new Date(service.created_at || "");
            return serviceDate >= date && serviceDate < nextDate;
          })
          .reduce((sum, service) => {
            // Para técnicos, mostrar apenas a soma dos valores do serviço (sem taxas administrativas)
            // Para admin, mostrar a soma dos valores totais
            const valueToAdd = isAdmin ? (service.total || 0) : (service.price || 0);
            return sum + valueToAdd;
          }, 0);
        
        chartData.push({
          name: date.toLocaleDateString('pt-BR', { weekday: 'short' }),
          value: dayTotal,
        });
      }
    } else if (period === "month") {
      // Last 4 weeks
      for (let i = 3; i >= 0; i--) {
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - (i * 7) - 6);
        weekStart.setHours(0, 0, 0, 0);
        
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 7);
        
        const weekTotal = financiallyRelevantServices
          .filter(service => {
            const serviceDate = new Date(service.created_at || "");
            return serviceDate >= weekStart && serviceDate < weekEnd;
          })
          .reduce((sum, service) => {
            // Para técnicos, mostrar apenas a soma dos valores do serviço (sem taxas administrativas)
            // Para admin, mostrar a soma dos valores totais
            const valueToAdd = isAdmin ? (service.total || 0) : (service.price || 0);
            return sum + valueToAdd;
          }, 0);
        
        chartData.push({
          name: `Semana ${4-i}`,
          value: weekTotal,
        });
      }
    } else if (period === "year") {
      // Months in this year
      const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
      
      for (let i = 0; i < 12; i++) {
        const monthStart = new Date(now.getFullYear(), i, 1);
        const monthEnd = new Date(now.getFullYear(), i + 1, 0);
        
        const monthTotal = financiallyRelevantServices
          .filter(service => {
            const serviceDate = new Date(service.created_at || "");
            return serviceDate >= monthStart && serviceDate <= monthEnd;
          })
          .reduce((sum, service) => {
            // Para técnicos, mostrar apenas a soma dos valores do serviço (sem taxas administrativas)
            // Para admin, mostrar a soma dos valores totais
            const valueToAdd = isAdmin ? (service.total || 0) : (service.price || 0);
            return sum + valueToAdd;
          }, 0);
        
        chartData.push({
          name: monthNames[i],
          value: monthTotal,
        });
      }
    }
    
    return chartData;
  };
  
  // Prepare service type distribution
  const prepareServiceTypeData = () => {
    if (!financiallyRelevantServices || financiallyRelevantServices.length === 0) {
      return [];
    }
    
    const serviceTypes: {[key: string]: number} = {};
    
    financiallyRelevantServices.forEach(service => {
      const typeName = service.serviceType?.name || "Desconhecido";
      if (serviceTypes[typeName]) {
        serviceTypes[typeName]++;
      } else {
        serviceTypes[typeName] = 1;
      }
    });
    
    return Object.entries(serviceTypes).map(([name, value]) => ({
      name,
      value,
    }));
  };
  
  const stats = calculateStats();
  const chartData = prepareChartData();
  const serviceTypeData = prepareServiceTypeData();
  
  // Chart colors
  const COLORS = ['#1a5276', '#2e86c1', '#f39c12', '#27ae60', '#e74c3c'];
  
  // Mutation para criar nova despesa
  const createExpenseMutation = useMutation({
    mutationFn: async (data: ExpenseFormValues) => {
      // Converter a string de valor para número
      const cleanAmount = data.amount.replace(/[€\s]/g, '').replace(',', '.');
      const amount = parseFloat(cleanAmount);
      
      return await apiRequest('/api/expenses', 'POST', {
        type: data.category,
        amount,
        date: data.date,
        description: data.description,
        payment_method: 'manual', // Valor padrão
        notes: data.notes,
        provider: data.provider
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/expenses'] });
      toast({
        title: "Despesa registrada",
        description: "A despesa foi registrada com sucesso.",
      });
      expenseForm.reset();
      setExpenseDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Erro ao registrar despesa",
        description: `Ocorreu um erro: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  // Lidar com o envio do formulário de despesas
  function onExpenseSubmit(data: ExpenseFormValues) {
    createExpenseMutation.mutate(data);
  }
  
  return (
    <div className="py-6 px-4 sm:px-6 lg:px-8">
      <PageHeader
        title="Financeiro"
        description="Estatísticas e relatórios financeiros"
      />
      
      <div className="mt-6 mb-6">
        <div className="w-full max-w-xs">
          <Select
            value={period}
            onValueChange={setPeriod}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione o período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Últimos 7 dias</SelectItem>
              <SelectItem value="month">Último mês</SelectItem>
              <SelectItem value="year">Este ano</SelectItem>
              <SelectItem value="all">Todo o período</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Faturamento Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalRevenue)}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Serviços Concluídos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.servicesCount}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Ticket Médio</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.averageTicket)}</div>
          </CardContent>
        </Card>
      </div>
      
      <Tabs defaultValue="revenue" className="space-y-6">
        <TabsList className="mb-4">
          <TabsTrigger value="revenue">Faturamento</TabsTrigger>
          <TabsTrigger value="services">Serviços</TabsTrigger>
          <TabsTrigger value="transactions">Transações</TabsTrigger>
          <TabsTrigger value="payment_requests">Pedidos de Pagamento</TabsTrigger>
          <TabsTrigger value="expenses">Despesas</TabsTrigger>
        </TabsList>
        
        <TabsContent value="revenue" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Faturamento por {period === "week" ? "Dia" : period === "month" ? "Semana" : "Mês"}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                {isLoading ? (
                  <div className="flex justify-center items-center h-full">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={chartData}
                      margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis 
                        tickFormatter={(value) => `€ ${value}`}
                      />
                      <Tooltip 
                        formatter={(value) => [`€ ${value}`, "Faturamento"]}
                      />
                      <Bar dataKey="value" fill="#1a5276" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Distribuição por Tipo de Serviço</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  {isLoading ? (
                    <div className="flex justify-center items-center h-full">
                      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={serviceTypeData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="value"
                          label={false}
                        >
                          {serviceTypeData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend layout="horizontal" verticalAlign="bottom" wrapperStyle={{ paddingTop: 20 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Comparação Mensal</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Mês Atual</span>
                    <span className="font-medium">{formatCurrency(stats.totalRevenue)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Mês Anterior</span>
                    <span className="font-medium">{formatCurrency(stats.totalRevenue * 0.85)}</span>
                  </div>
                  <div className="pt-2 border-t">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Variação</span>
                      <div className="flex items-center text-success">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                        </svg>
                        <span className="font-medium">+15%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="services">
          <Card>
            <CardHeader>
              <CardTitle>Serviços por Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                {isLoading ? (
                  <div className="flex justify-center items-center h-full">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: "Pendentes", value: services?.filter(s => s.status === "pending").length || 0 },
                          { name: "Concluídos", value: services?.filter(s => s.status === "completed").length || 0 },
                          { name: "Aguardando Aprovação", value: services?.filter(s => s.status === "aguardando_aprovacao").length || 0 },
                          { name: "Faturados", value: services?.filter(s => s.status === "faturado").length || 0 },
                          { name: "Pagos", value: services?.filter(s => s.status === "pago").length || 0 },
                        ]}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                        label={false}
                      >
                        <Cell fill="#1E40AF" /> {/* Pendentes - azul escuro */}
                        <Cell fill="#15803D" /> {/* Concluídos - verde */}
                        <Cell fill="#9A3412" /> {/* Aguardando Aprovação - amarelo/laranja */}
                        <Cell fill="#6D28D9" /> {/* Faturados - roxo */}
                        <Cell fill="#0E7490" /> {/* Pagos - verde-agua */}
                      </Pie>
                      <Tooltip />
                      <Legend layout="horizontal" verticalAlign="bottom" wrapperStyle={{ paddingTop: 20 }} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="transactions">
          <Card>
            <CardHeader>
              <CardTitle>Últimas Transações</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Serviço</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8">
                        <div className="flex justify-center">
                          <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary"></div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : financiallyRelevantServices?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                        Nenhuma transação encontrada
                      </TableCell>
                    </TableRow>
                  ) : (
                    financiallyRelevantServices?.slice(0, 10).map((service) => (
                      <TableRow key={service.id} className="hover:bg-gray-50">
                        <TableCell>{formatDate(service.completion_date || service.created_at)}</TableCell>
                        <TableCell>{service.client.name}</TableCell>
                        <TableCell>{service.serviceType?.name || "Serviço não especificado"}</TableCell>
                        <TableCell>
                          <ServiceStatusBadge status={service.status} />
                        </TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(service.total || 0)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="payment_requests">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Pedidos de Pagamento</CardTitle>
              <Button 
                size="sm" 
                onClick={() => setPaymentRequestDialogOpen(true)}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Novo Pedido
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {loadingPaymentRequests ? (
                <div className="flex justify-center items-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
                </div>
              ) : !paymentRequests || !Array.isArray(paymentRequests) || paymentRequests.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-4">
                  <p className="text-gray-500 mb-2">Nenhum pedido de pagamento encontrado</p>
                </div>
              ) : (
                <div className="space-y-4 p-4">
                  {paymentRequests.map((request: PaymentRequest) => (
                    <div key={request.id} className="border rounded-lg overflow-hidden">
                      <div className="bg-gray-50 p-4 flex items-center justify-between">
                        <div>
                          <span className="font-medium">Pedido #{request.id}</span>
                          <span className="text-sm text-gray-500 ml-4">
                            {formatRelativeDate(request.created_at)}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge className={
                            request.status === "aguardando_aprovacao" ? "bg-amber-600" :
                            request.status === "aprovado" ? "bg-green-600" :
                            request.status === "rejeitado" ? "bg-red-600" :
                            "bg-gray-600"
                          }>
                            {request.status === "aguardando_aprovacao" ? "Aguardando Aprovação" :
                             request.status === "aprovado" ? "Aprovado" :
                             request.status === "rejeitado" ? "Rejeitado" : request.status}
                          </Badge>
                          {request.status === "aguardando_aprovacao" && (
                            <div className="flex space-x-2">
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="outline" size="sm" className="text-green-600 hover:text-green-700 border-green-600 hover:border-green-700 hover:bg-green-50">
                                    Aprovar
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Aprovar Pedido de Pagamento</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Tem certeza que deseja aprovar este pedido de pagamento? Esta ação irá marcar os serviços relacionados como "faturado".
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleApprovePaymentRequest(request.id)}>
                                      Confirmar
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                              
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700 border-red-600 hover:border-red-700 hover:bg-red-50">
                                    Rejeitar
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Rejeitar Pedido de Pagamento</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Tem certeza que deseja rejeitar este pedido de pagamento? Esta ação irá marcar os serviços relacionados como "completed" novamente.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleRejectPaymentRequest(request.id)}>
                                      Confirmar
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          )}
                          
                          {/* Botão de Pagar para pedidos aprovados */}
                          {request.status === "aprovado" && (
                            <div className="flex space-x-2">
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="text-blue-600 hover:text-blue-700 border-blue-600 hover:border-blue-700 hover:bg-blue-50"
                                onClick={() => handleOpenPaymentDialog(request)}
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Pagar
                              </Button>
                            </div>
                          )}
                          
                          {/* Mostrar data de pagamento para pedidos pagos */}
                          {request.status === "pago" && request.payment_date && (
                            <div className="text-sm text-gray-500">
                              Pago em: {formatDate(request.payment_date)}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="p-4">
                        <div className="mb-2">
                          <span className="font-medium">Técnico: </span>
                          <span>{request.technician?.name || 'N/A'}</span>
                        </div>
                        
                        <div className="border rounded-md mt-4">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>OS</TableHead>
                                <TableHead>Cliente</TableHead>
                                <TableHead>Serviço</TableHead>
                                <TableHead className="text-right">Valor</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {request.services?.map((service: any) => (
                                <TableRow key={service.id}>
                                  <TableCell>#{service.id}</TableCell>
                                  <TableCell>{service.client?.name}</TableCell>
                                  <TableCell>{service.serviceType?.name}</TableCell>
                                  <TableCell className="text-right">{formatCurrency(service.price || 0)}</TableCell>
                                </TableRow>
                              ))}
                              <TableRow>
                                <TableCell colSpan={3} className="text-right font-medium">Total:</TableCell>
                                <TableCell className="text-right font-semibold">
                                  {formatCurrency(
                                    request.services?.reduce((sum: number, s: any) => sum + (s.price || 0), 0) || 0
                                  )}
                                </TableCell>
                              </TableRow>
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="expenses">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Despesas</CardTitle>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => setExpenseDialogOpen(true)}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Nova Despesa
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Fornecedor</TableHead>
                    <TableHead>Método de Pagamento</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingExpenses ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        <div className="flex justify-center">
                          <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary"></div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : !expenses || expenses.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                        Nenhuma despesa encontrada
                      </TableCell>
                    </TableRow>
                  ) : (
                    expenses.map((expense) => (
                      <TableRow key={expense.id} className="hover:bg-gray-50">
                        <TableCell>{formatDate(expense.date)}</TableCell>
                        <TableCell>{expense.description}</TableCell>
                        <TableCell>
                          <Badge className={
                            expense.type === "salario" ? "bg-blue-600" : 
                            expense.type === "operacional" ? "bg-green-600" :
                            expense.type === "material" ? "bg-amber-600" : 
                            "bg-slate-600"
                          }>
                            {expense.type === "salario" ? "Salário" :
                             expense.type === "operacional" ? "Operacional" :
                             expense.type === "material" ? "Material" :
                             expense.type === "aluguel" ? "Aluguel" :
                             expense.type === "alimentacao" ? "Alimentação" :
                             expense.type === "transporte" ? "Transporte" : 
                             expense.type}
                          </Badge>
                        </TableCell>
                        <TableCell>{expense.provider}</TableCell>
                        <TableCell>{expense.payment_method}</TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(expense.amount)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Despesas por Categoria</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80 flex items-center justify-center">
                  <p className="text-gray-500">Nenhum dado disponível</p>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Despesas Mensais</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80 flex items-center justify-center">
                  <p className="text-gray-500">Nenhum dado disponível</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Modal de Nova Despesa */}
      {/* Modal de Novo Pedido de Pagamento para Admin */}
      {isAdmin && (
        <Dialog open={paymentRequestDialogOpen} onOpenChange={setPaymentRequestDialogOpen}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Novo Pedido de Pagamento</DialogTitle>
              <DialogDescription>
                Selecione os serviços concluídos para os quais deseja criar um pedido de pagamento.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {isLoading ? (
                <div className="flex justify-center items-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
                </div>
              ) : (
                <>
                  <div className="flex items-center space-x-2 mb-4">
                    <Label>Técnico:</Label>
                    <Select
                      value={selectedTechnician?.toString() || ""}
                      onValueChange={(value) => setSelectedTechnician(value ? parseInt(value) : undefined)}
                    >
                      <SelectTrigger className="w-60">
                        <SelectValue placeholder="Selecione um técnico (opcional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Sem técnico</SelectItem>
                        {technicians?.map(tech => (
                          <SelectItem key={tech.id} value={tech.id.toString()}>
                            {tech.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {completableServices?.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      Nenhum serviço disponível para solicitar pagamento.
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {completableServices?.map(service => (
                        <div 
                          key={service.id} 
                          className="flex items-center space-x-2 p-3 border rounded-md hover:bg-gray-50 cursor-pointer"
                          onClick={() => toggleServiceSelection(service.id)}
                        >
                          <input 
                            type="checkbox" 
                            className="h-5 w-5 rounded" 
                            checked={selectedServices.includes(service.id)}
                            onChange={() => toggleServiceSelection(service.id)}
                          />
                          <div className="flex-1">
                            <div className="font-medium">
                              {service.client?.name} - {service.serviceType?.name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {formatDate(service.completion_date || service.created_at)} - OS #{service.id}
                              {service.technician ? ` - Técnico: ${service.technician.name}` : ' - Sem técnico'}
                            </div>
                          </div>
                          <div className="font-semibold">
                            {formatCurrency(service.price || 0)} {/* Sempre mostrar o valor do técnico, independente do perfil */}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
            <div className="flex justify-between items-center border-t pt-4 mt-4">
              <div>
                <span className="font-medium">Total selecionado: </span>
                {formatCurrency(
                  completableServices
                    ?.filter(service => selectedServices.includes(service.id))
                    .reduce((sum, service) => {
                      // Sempre usar o valor do técnico (price) para o cálculo do pedido de pagamento
                      // Este é o valor que será pago ao técnico
                      const valueToAdd = service.price || 0;
                      return sum + valueToAdd;
                    }, 0) || 0
                )}
              </div>
              <div className="space-x-2">
                <Button 
                  variant="outline" 
                  onClick={() => setPaymentRequestDialogOpen(false)}
                >
                  Cancelar
                </Button>
                <Button 
                  onClick={handleCreatePaymentRequest}
                  disabled={selectedServices.length === 0 || createPaymentRequestMutation.isPending}
                >
                  {createPaymentRequestMutation.isPending ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                      Enviando...
                    </div>
                  ) : "Criar Pedido"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
      
      {/* Modal de Nova Despesa */}
      <Dialog open={expenseDialogOpen} onOpenChange={setExpenseDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Registrar Nova Despesa</DialogTitle>
            <DialogDescription>
              Preencha o formulário para registrar uma nova despesa.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...expenseForm}>
            <form onSubmit={expenseForm.handleSubmit(onExpenseSubmit)} className="space-y-4">
              <FormField
                control={expenseForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição</FormLabel>
                    <FormControl>
                      <Input placeholder="Digite a descrição da despesa" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={expenseForm.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="€ 0,00"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={expenseForm.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={expenseForm.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Categoria</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione uma categoria" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="operacional">Operacional</SelectItem>
                          <SelectItem value="salario">Salário</SelectItem>
                          <SelectItem value="material">Material</SelectItem>
                          <SelectItem value="aluguel">Aluguel</SelectItem>
                          <SelectItem value="alimentacao">Alimentação</SelectItem>
                          <SelectItem value="transporte">Transporte</SelectItem>
                          <SelectItem value="outras">Outras</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={expenseForm.control}
                name="provider"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fornecedor/Destinatário</FormLabel>
                    <FormControl>
                      <Input placeholder="Digite o nome do fornecedor ou funcionário" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={expenseForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Observações</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Informações adicionais sobre a despesa"
                        className="min-h-[80px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />



              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setExpenseDialogOpen(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit">Salvar</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Modal de pagamento */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Registrar Pagamento</DialogTitle>
            <DialogDescription>
              Registre os detalhes do pagamento ao técnico {selectedPaymentRequest?.technician?.name}.
            </DialogDescription>
          </DialogHeader>
          <Form {...paymentForm}>
            <form onSubmit={paymentForm.handleSubmit(handleSubmitPayment)} className="space-y-4">
              <FormField
                control={paymentForm.control}
                name="payment_method"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Método de Pagamento</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o método de pagamento" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="pix">PIX</SelectItem>
                        <SelectItem value="transferencia">Transferência Bancária</SelectItem>
                        <SelectItem value="dinheiro">Dinheiro</SelectItem>
                        <SelectItem value="cheque">Cheque</SelectItem>
                        <SelectItem value="outro">Outro</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={paymentForm.control}
                name="payment_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data do Pagamento</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={paymentForm.control}
                name="transaction_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ID da Transação (opcional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Exemplo: código PIX, número de referência" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={paymentForm.control}
                name="payment_notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Observações (opcional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Informações adicionais sobre o pagamento"
                        className="min-h-[80px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="pt-4 border-t">
                <div className="mb-4 flex justify-between">
                  <span className="font-semibold">Valor a pagar:</span>
                  <span className="font-bold">
                    {formatCurrency(
                      selectedPaymentRequest?.services?.reduce((sum: number, s: any) => {
                        return sum + (s.price || 0);
                      }, 0) || 0
                    )}
                  </span>
                </div>
              </div>

              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setPaymentDialogOpen(false)}
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit"
                  disabled={registerPaymentMutation.isPending}
                >
                  {registerPaymentMutation.isPending ? (
                    <div className="flex items-center">
                      <div className="animate-spin mr-2 h-4 w-4 border-t-2 border-b-2 border-white rounded-full"></div>
                      Processando...
                    </div>
                  ) : "Confirmar Pagamento"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

    </div>
  );
}
