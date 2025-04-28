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
 * Implementação totalmente nova com base na imagem de exemplo
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

    // Função para formatar data
    const formatDate = (dateString: string) => {
      if (!dateString) return 'N/A';
      const date = new Date(dateString);
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    };

    // Conteúdo do PDF - Apenas o cabeçalho conforme a imagem
    tempElement.innerHTML = `
      <div style="font-family: Arial, sans-serif; color: #333; width: 100%;">
        <!-- Cabeçalho com Logo EURO DENT EXPERTS -->
        <div style="display: flex; align-items: center; margin-bottom: 6px;">
          <div style="font-size: 22px; font-weight: bold; color: #2563EB;">EURO</div>
          <div style="font-size: 22px; font-weight: bold; color: #000000; margin-left: 4px;">DENT</div>
          <div style="font-size: 10px; color: #000000; margin-left: 4px; margin-top: 3px;">EXPERTS</div>
        </div>
        
        <!-- Linha horizontal abaixo do logo -->
        <div style="height: 2px; background-color: #2563EB; width: 100%; margin-bottom: 15px;"></div>
        
        <!-- Barra azul com título ORÇAMENTO e número -->
        <div style="background-color: #2563EB; color: white; padding: 10px; display: flex; justify-content: space-between; border-radius: 6px; margin-bottom: 20px;">
          <div style="font-size: 18px; font-weight: bold;">ORÇAMENTO</div>
          <div style="font-size: 18px; font-weight: bold;">#${budget.id}</div>
        </div>
        
        <!-- Informações do cliente -->
        <div style="display: flex; gap: 20px; margin-bottom: 20px;">
          <!-- Bloco de informações do cliente -->
          <div style="flex: 1; padding: 15px; border: 1px solid #ddd; border-radius: 5px; background-color: #f9fafb;">
            <div style="font-weight: bold; margin-bottom: 15px; color: #2563EB; font-size: 14px;">INFORMAÇÕES DO CLIENTE</div>
            <div style="margin-bottom: 8px; font-size: 13px;"><span style="font-weight: bold;">Nome:</span> ${budget.client_name}</div>
            <div style="margin-bottom: 8px; font-size: 13px;"><span style="font-weight: bold;">Data:</span> ${formatDate(budget.date)}</div>
          </div>
          
          <!-- Bloco de informações do veículo -->
          <div style="flex: 1; padding: 15px; border: 1px solid #ddd; border-radius: 5px; background-color: #f9fafb;">
            <div style="font-weight: bold; margin-bottom: 15px; color: #2563EB; font-size: 14px;">INFORMAÇÕES DO VEÍCULO</div>
            <div style="margin-bottom: 8px; font-size: 13px;"><span style="font-weight: bold;">Veículo:</span> ${budget.vehicle_info}</div>
            <div style="margin-bottom: 8px; font-size: 13px;"><span style="font-weight: bold;">Placa:</span> ${budget.plate || '---'}</div>
            <div style="margin-bottom: 8px; font-size: 13px;"><span style="font-weight: bold;">Chassi:</span> ${budget.chassis_number || '---'}</div>
          </div>
        </div>
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