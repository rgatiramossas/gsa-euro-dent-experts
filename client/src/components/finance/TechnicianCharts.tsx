import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Legend, 
  Tooltip, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid 
} from 'recharts';
import { formatCurrency } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

interface TechnicianFinancialStats {
  pendingValue: number;
  invoicedValue: number;
  receivedValue: number;
  unpaidCompletedValue: number;
  monthlyData: Array<{
    month: string;
    value: number;
  }>;
  [key: string]: any;
}

type PieChartDataItem = {
  name: string;
  value: number;
  color: string;
};

// Componente para o gráfico de pizza dos pagamentos de técnico
export function TechnicianPaymentsPieChart({ financialStats }: { financialStats: TechnicianFinancialStats | undefined | null }) {
  const { t } = useTranslation();
  
  if (!financialStats) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        {t("common.loading")}
      </div>
    );
  }

  // Garantir que todos os valores são números
  const receivedValue = typeof financialStats.receivedValue === 'number' ? financialStats.receivedValue : 0;
  const invoicedValue = typeof financialStats.invoicedValue === 'number' ? financialStats.invoicedValue : 0;
  const pendingValue = typeof financialStats.pendingValue === 'number' ? financialStats.pendingValue : 0;
  const unpaidCompletedValue = typeof financialStats.unpaidCompletedValue === 'number' ? financialStats.unpaidCompletedValue : 0;

  const data: PieChartDataItem[] = [
    { 
      name: t("finances.valoresRecebidos"), 
      value: receivedValue,
      color: '#10B981' // verde
    },
    { 
      name: t("finances.valoresFaturados"), 
      value: invoicedValue,
      color: '#3B82F6' // azul
    },
    { 
      name: t("finances.emAprovacao"), 
      value: pendingValue,
      color: '#F59E0B' // amarelo
    },
    { 
      name: t("finances.naoSolicitados"), 
      value: unpaidCompletedValue,
      color: '#6B7280' // cinza
    }
  ].filter(item => item.value > 0); // Filtrar valores zerados

  if (data.length === 0) {
    return <div className="flex items-center justify-center h-full text-gray-500">{t("finances.noValuesToShow")}</div>;
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
          outerRadius={80}
          fill="#8884d8"
          dataKey="value"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip 
          formatter={(value: number) => formatCurrency(value)}
          labelFormatter={(label) => ''}
        />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}

// Componente para o gráfico de barras dos pagamentos mensais
export function MonthlyPaymentsChart({ monthlyData }: { monthlyData: TechnicianFinancialStats['monthlyData'] | undefined | null }) {
  const { t } = useTranslation();

  if (!monthlyData) {
    return <div className="flex items-center justify-center h-full text-gray-500">{t("common.loading")}</div>;
  }
  
  // Garantir que os dados mensais são válidos
  const validData = Array.isArray(monthlyData) ? monthlyData : [];
  
  if (validData.length === 0) {
    return <div className="flex items-center justify-center h-full text-gray-500">{t("finances.noMonthlyData")}</div>;
  }
  
  // Verificar se todos os valores são números
  const cleanData = validData.map(item => ({
    month: item.month || '',
    value: typeof item.value === 'number' ? item.value : 0
  }));

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={cleanData}
        margin={{
          top: 5,
          right: 30,
          left: 20,
          bottom: 5,
        }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="month" />
        <YAxis tickFormatter={(value) => `${value} €`} />
        <Tooltip 
          formatter={(value: number) => formatCurrency(value)}
          labelFormatter={(label) => label}
        />
        <Bar dataKey="value" fill="#3B82F6" name={t("finances.valoresRecebidos")} />
      </BarChart>
    </ResponsiveContainer>
  );
}