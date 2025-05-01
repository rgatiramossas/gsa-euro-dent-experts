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
    year: number;
  }>;
  [key: string]: any;
}

type PieChartDataItem = {
  name: string;
  value: number;
  color: string;
};

// Componente para o gráfico de pizza dos pagamentos de técnico
export function TechnicianPaymentsPieChart({ financialStats }: { financialStats: TechnicianFinancialStats }) {
  const { t } = useTranslation();
  
  if (!financialStats) return <div>{t("common.noData")}</div>;

  const data: PieChartDataItem[] = [
    { 
      name: t("finances.valoresRecebidos"), 
      value: financialStats.receivedValue,
      color: '#10B981' // verde
    },
    { 
      name: t("finances.valoresFaturados"), 
      value: financialStats.invoicedValue,
      color: '#3B82F6' // azul
    },
    { 
      name: t("finances.emAprovacao"), 
      value: financialStats.pendingValue,
      color: '#F59E0B' // amarelo
    },
    { 
      name: t("finances.naoSolicitados"), 
      value: financialStats.unpaidCompletedValue,
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
export function MonthlyPaymentsChart({ monthlyData }: { monthlyData: TechnicianFinancialStats['monthlyData'] }) {
  const { t } = useTranslation();

  if (!monthlyData || monthlyData.length === 0) {
    return <div className="flex items-center justify-center h-full text-gray-500">{t("finances.noMonthlyData")}</div>;
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={monthlyData}
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