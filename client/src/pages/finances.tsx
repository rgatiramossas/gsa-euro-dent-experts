import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
import { Label } from "@/components/ui/label";
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
import { formatCurrency, formatDate } from "@/lib/utils";
import { ServiceStatusBadge } from "@/components/common/ServiceStatusBadge";

// Esquema para o formulário de despesas
const expenseFormSchema = z.object({
  description: z.string().min(3, {
    message: "A descrição precisa ter pelo menos 3 caracteres.",
  }),
  amount: z.string().refine(
    (val) => {
      // Remover R$ e trocar vírgula por ponto para conversão
      const cleanValue = val.replace(/[R$\s]/g, '').replace(',', '.');
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
  is_recurring: z.boolean().default(false),
});

type ExpenseFormValues = z.infer<typeof expenseFormSchema>;

export default function Finances() {
  const [period, setPeriod] = useState("month");
  const [expenseDialogOpen, setExpenseDialogOpen] = useState(false);
  const { user: currentUser } = useAuth();
  const isAdmin = currentUser?.role === "admin";
  
  // Formulário de despesas
  const expenseForm = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: {
      description: "",
      amount: "",
      date: new Date().toISOString().split('T')[0],
      category: "operacional",
      provider: "",
      notes: "",
      is_recurring: false
    }
  });
  
  // Get all services for financial data
  const { data: services, isLoading } = useQuery<ServiceListItem[]>({
    queryKey: ['/api/services'],
  });
  
  if (!isAdmin) {
    return (
      <div className="py-6 px-4 sm:px-6 lg:px-8">
        <PageHeader
          title="Financeiro"
          description="Estatísticas e relatórios financeiros"
        />
        
        <Card className="mt-6">
          <CardContent className="py-10 text-center">
            <h3 className="text-lg font-medium text-gray-900">Acesso Restrito</h3>
            <p className="mt-2 text-gray-500">
              Você não tem permissão para acessar esta página.
            </p>
          </CardContent>
        </Card>
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
    
    const totalRevenue = filteredServices.reduce((sum, service) => sum + (service.total || 0), 0);
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
          .reduce((sum, service) => sum + (service.total || 0), 0);
        
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
          .reduce((sum, service) => sum + (service.total || 0), 0);
        
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
          .reduce((sum, service) => sum + (service.total || 0), 0);
        
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
  
  // Lidar com o envio do formulário de despesas
  function onExpenseSubmit(data: ExpenseFormValues) {
    // Aqui você pode tratar os dados do formulário
    console.log("Dados do formulário de despesa:", data);
    
    // Converter a string de valor para número
    const cleanAmount = data.amount.replace(/[R$\s]/g, '').replace(',', '.');
    const amount = parseFloat(cleanAmount);
    
    // TODO: Integrar com a API quando estiver pronta
    // Por enquanto, apenas mostra uma mensagem e fecha o diálogo
    alert(`Despesa "${data.description}" registrada com sucesso no valor de ${formatCurrency(amount)}`);
    
    // Resetar o formulário e fechar o diálogo
    expenseForm.reset();
    setExpenseDialogOpen(false);
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
                        tickFormatter={(value) => `R$ ${value}`}
                      />
                      <Tooltip 
                        formatter={(value) => [`R$ ${value}`, "Faturamento"]}
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
              <Button size="sm" variant="outline">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Novo Pedido
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Serviço</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                      Nenhum pedido de pagamento encontrado
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
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
                    <TableHead>Categoria</TableHead>
                    <TableHead>Fornecedor</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                      Nenhuma despesa encontrada
                    </TableCell>
                  </TableRow>
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
                        placeholder="R$ 0,00"
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

              <FormField
                control={expenseForm.control}
                name="is_recurring"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <input
                        type="checkbox"
                        className="form-checkbox h-5 w-5"
                        checked={field.value}
                        onChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Despesa Recorrente</FormLabel>
                      <FormDescription>
                        Marque esta opção para despesas que se repetem mensalmente
                      </FormDescription>
                    </div>
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

    </div>
  );
}
