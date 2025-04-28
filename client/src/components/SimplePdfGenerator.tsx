import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

// Interface para dados do orçamento
interface Budget {
  id: number;
  client_name: string;
  vehicle_info: string;
  date: string;
  plate?: string;
  chassis_number?: string;
  note?: string;
  total_value?: number;
}

/**
 * Gera um PDF básico de orçamento
 * Implementação totalmente nova e simplificada
 */
export const generateSimplePdf = async (budget: Budget): Promise<void> => {
  try {
    // Criar o elemento temporário para renderizar o conteúdo
    const tempElement = document.createElement('div');
    tempElement.style.position = 'fixed';
    tempElement.style.left = '-9999px';
    tempElement.style.fontFamily = 'Arial, sans-serif';
    tempElement.style.width = '794px'; // Largura A4
    tempElement.style.padding = '40px';
    document.body.appendChild(tempElement);

    // Função para formatar moeda
    const formatCurrency = (value?: number) => {
      if (value === undefined || value === null) return 'R$ 0,00';
      return `R$ ${value.toFixed(2).replace('.', ',')}`;
    };

    // Função para formatar data
    const formatDate = (dateString: string) => {
      if (!dateString) return 'N/A';
      const date = new Date(dateString);
      return date.toLocaleDateString('pt-BR');
    };

    // Conteúdo do PDF com design simples
    tempElement.innerHTML = `
      <div style="font-family: Arial, sans-serif; color: #333;">
        <!-- Cabeçalho -->
        <div style="text-align: center; margin-bottom: 30px;">
          <div style="font-size: 24px; font-weight: bold; color: #1a5fb4; margin-bottom: 5px;">ORÇAMENTO</div>
          <div style="font-size: 14px; color: #666;">#${budget.id}</div>
        </div>

        <!-- Informações do cliente e veículo -->
        <div style="display: flex; margin-bottom: 30px;">
          <div style="flex: 1; padding: 15px; border: 1px solid #ddd; background-color: #f9f9f9; border-radius: 5px; margin-right: 10px;">
            <div style="font-weight: bold; margin-bottom: 10px; font-size: 16px;">Informações do Cliente</div>
            <div style="margin-bottom: 5px;"><strong>Nome:</strong> ${budget.client_name}</div>
            <div style="margin-bottom: 5px;"><strong>Data:</strong> ${formatDate(budget.date)}</div>
          </div>

          <div style="flex: 1; padding: 15px; border: 1px solid #ddd; background-color: #f9f9f9; border-radius: 5px;">
            <div style="font-weight: bold; margin-bottom: 10px; font-size: 16px;">Informações do Veículo</div>
            <div style="margin-bottom: 5px;"><strong>Veículo:</strong> ${budget.vehicle_info}</div>
            <div style="margin-bottom: 5px;"><strong>Placa:</strong> ${budget.plate || '---'}</div>
            <div style="margin-bottom: 5px;"><strong>Chassi:</strong> ${budget.chassis_number || '---'}</div>
          </div>
        </div>

        <!-- Valor total -->
        <div style="padding: 15px; border: 1px solid #ddd; background-color: #f9f9f9; border-radius: 5px; margin-bottom: 30px;">
          <div style="font-weight: bold; margin-bottom: 10px; font-size: 16px;">Valor do Orçamento</div>
          <div style="font-size: 20px; font-weight: bold; color: #1a5fb4;">${formatCurrency(budget.total_value)}</div>
        </div>

        <!-- Observações, se houver -->
        ${budget.note ? `
        <div style="padding: 15px; border: 1px solid #ddd; background-color: #f9f9f9; border-radius: 5px; margin-bottom: 30px;">
          <div style="font-weight: bold; margin-bottom: 10px; font-size: 16px;">Observações</div>
          <div style="white-space: pre-wrap;">${budget.note}</div>
        </div>
        ` : ''}
      </div>
    `;

    // Gerar o PDF
    try {
      // Capturar o conteúdo como imagem
      const canvas = await html2canvas(tempElement, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff'
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.95);

      // Criar o PDF
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      // Dimensões da página
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      // Calcular a altura proporcional
      const canvasRatio = canvas.height / canvas.width;
      const imgWidth = pdfWidth;
      const imgHeight = imgWidth * canvasRatio;

      // Adicionar a imagem ao PDF
      pdf.addImage(imgData, 'JPEG', 0, 0, imgWidth, imgHeight);

      // Se o conteúdo for maior que uma página, adicionar novas páginas
      let heightLeft = imgHeight;
      let position = 0;

      while (heightLeft > pdfHeight) {
        position = pdfHeight - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
        heightLeft -= pdfHeight;
      }

      // Fazer o download do PDF
      const fileName = `Orcamento_${budget.id}_${budget.client_name.replace(/[^\w\s]/gi, '')}.pdf`;
      pdf.save(fileName);

      // Limpar o elemento temporário
      document.body.removeChild(tempElement);
    } catch (error) {
      console.error('Erro ao gerar o PDF:', error);
      document.body.removeChild(tempElement);
      throw error;
    }
  } catch (error) {
    console.error('Erro geral na geração do PDF:', error);
    throw error;
  }
};