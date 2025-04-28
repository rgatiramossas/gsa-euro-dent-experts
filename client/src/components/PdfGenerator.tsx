import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { useToast } from '@/hooks/use-toast';

interface PdfGeneratorProps {
  budgetData: {
    id: number;
    client_name: string;
    client_id: number;
    vehicle_info: string;
    date: string;
    plate?: string;
    chassis_number?: string;
    damaged_parts?: any;
    photo_url?: string;
    total_aw?: number;
    total_value?: number;
    note?: string;
    created_at: string;
  };
}

export const generatePdf = async (budgetData: PdfGeneratorProps['budgetData']) => {
  const toast = useToast();
  
  try {
    // Criar o elemento que será transformado em PDF
    const printDiv = document.createElement('div');
    printDiv.style.position = 'fixed';
    printDiv.style.left = '-9999px'; // Esconder o elemento
    printDiv.style.fontFamily = 'Arial, sans-serif';
    printDiv.style.width = '794px'; // Largura de uma página A4
    printDiv.style.padding = '40px';
    printDiv.style.boxSizing = 'border-box';
    document.body.appendChild(printDiv);
    
    // Adicionar o conteúdo elegante ao elemento
    printDiv.innerHTML = `
      <div style="width: 100%; background-color: white; position: relative;">
        <!-- Cabeçalho com logo e informações da empresa -->
        <div style="display: flex; justify-content: space-between; border-bottom: 2px solid #2563eb; padding-bottom: 15px; margin-bottom: 20px;">
          <div style="display: flex; align-items: center;">
            <div style="font-size: 28px; font-weight: bold; color: #2563eb;">EURO</div>
            <div style="font-size: 28px; font-weight: bold; margin-left: 5px;">DENT</div>
            <div style="font-size: 16px; margin-left: 5px; margin-top: 10px;">EXPERTS</div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 12px; color: #666;">R. Alemanha, 86 - Jardim Europa, Sorriso - MT</div>
            <div style="font-size: 12px; color: #666;">Tel: (66) 3544-0415 / (66) 99963-3169</div>
            <div style="font-size: 12px; color: #666;">eurodentmt@hotmail.com</div>
          </div>
        </div>
        
        <!-- Título e número do orçamento -->
        <div style="background-color: #2563eb; color: white; padding: 10px; display: flex; justify-content: space-between; margin-bottom: 20px; border-radius: 5px;">
          <div style="font-size: 18px; font-weight: bold;">ORÇAMENTO</div>
          <div style="font-size: 18px; font-weight: bold;">#${budgetData.id}</div>
        </div>
        
        <!-- Informações do cliente e veículo -->
        <div style="display: flex; gap: 20px; margin-bottom: 20px;">
          <div style="flex: 1; padding: 15px; border: 1px solid #ddd; border-radius: 5px; background-color: #f9fafb;">
            <div style="font-weight: bold; margin-bottom: 10px; color: #2563eb; font-size: 14px;">INFORMAÇÕES DO CLIENTE</div>
            <div style="margin-bottom: 5px; font-size: 13px;"><span style="font-weight: bold;">Nome:</span> ${budgetData.client_name}</div>
            <div style="margin-bottom: 5px; font-size: 13px;"><span style="font-weight: bold;">Data:</span> ${new Date(budgetData.date).toLocaleDateString('pt-BR')}</div>
          </div>
          
          <div style="flex: 1; padding: 15px; border: 1px solid #ddd; border-radius: 5px; background-color: #f9fafb;">
            <div style="font-weight: bold; margin-bottom: 10px; color: #2563eb; font-size: 14px;">INFORMAÇÕES DO VEÍCULO</div>
            <div style="margin-bottom: 5px; font-size: 13px;"><span style="font-weight: bold;">Veículo:</span> ${budgetData.vehicle_info}</div>
            <div style="margin-bottom: 5px; font-size: 13px;"><span style="font-weight: bold;">Placa:</span> ${budgetData.plate || '---'}</div>
            <div style="margin-bottom: 5px; font-size: 13px;"><span style="font-weight: bold;">Chassi:</span> ${budgetData.chassis_number || '---'}</div>
          </div>
        </div>
        
        <!-- Mapa de danos -->
        <div style="margin-bottom: 20px; padding: 15px; border: 1px solid #ddd; border-radius: 5px; background-color: #f9fafb;">
          <div style="font-weight: bold; margin-bottom: 15px; color: #2563eb; font-size: 14px;">MAPA DE DANOS</div>
          
          <!-- Grid de peças danificadas -->
          <div id="damage-grid">
            ${generateDamagedPartsGrid(budgetData.damaged_parts)}
          </div>
          
          <!-- Script para substituir o placeholder da foto -->
          ${budgetData.photo_url ? `
          <script>
            // Este script é executado durante a geração do PDF para inserir a foto no local correto
            (function() {
              var photoPlaceholder = document.getElementById('photo-placeholder');
              if (photoPlaceholder) {
                photoPlaceholder.innerHTML = '';
                photoPlaceholder.style.padding = '0';
                photoPlaceholder.style.overflow = 'hidden';
                photoPlaceholder.style.border = '1px solid #ddd';
                
                var img = document.createElement('img');
                img.src = "${budgetData.photo_url}";
                img.style.width = '100%';
                img.style.height = '105px';
                img.style.objectFit = 'cover';
                img.style.borderRadius = '4px';
                
                photoPlaceholder.appendChild(img);
              }
            })();
          </script>
          ` : ''}
        </div>
        
        <!-- Legenda -->
        <div style="margin-bottom: 20px;">
          <div style="font-weight: bold; margin-bottom: 10px; color: #2563eb; font-size: 14px;">LEGENDA</div>
          <div style="display: flex; gap: 15px; font-size: 12px;">
            <div style="display: flex; align-items: center;">
              <span style="color: red; font-weight: bold; margin-right: 5px;">A</span>
              <span>ALUMÍNIO</span>
            </div>
            <div style="display: flex; align-items: center;">
              <span style="color: blue; font-weight: bold; margin-right: 5px;">K</span>
              <span>PEÇA SUBSTITUÍDA</span>
            </div>
            <div style="display: flex; align-items: center;">
              <span style="color: green; font-weight: bold; margin-right: 5px;">P</span>
              <span>COM PINTURA</span>
            </div>
          </div>
        </div>
        
        <!-- Resumo financeiro -->
        <div style="display: flex; justify-content: space-between; margin-bottom: 20px;">
          <div style="flex: 1;"></div>
          <div style="flex: 1; padding: 15px; border: 1px solid #ddd; border-radius: 5px; background-color: #f9fafb;">
            <div style="font-weight: bold; margin-bottom: 10px; color: #2563eb; font-size: 14px;">RESUMO</div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
              <div style="font-size: 13px; font-weight: bold;">Total AW:</div>
              <div style="font-size: 13px;">${budgetData.total_aw || 0}</div>
            </div>
            <div style="display: flex; justify-content: space-between; border-top: 1px solid #ddd; padding-top: 10px; margin-top: 10px;">
              <div style="font-size: 16px; font-weight: bold;">VALOR TOTAL:</div>
              <div style="font-size: 16px; font-weight: bold;">R$ ${(budgetData.total_value || 0).toFixed(2).replace('.', ',')}</div>
            </div>
          </div>
        </div>
        
        <!-- Observações - apenas se existir -->
        ${budgetData.note ? `
        <div style="margin-bottom: 20px; padding: 15px; border: 1px solid #ddd; border-radius: 5px; background-color: #f9fafb;">
          <div style="font-weight: bold; margin-bottom: 10px; color: #2563eb; font-size: 14px;">OBSERVAÇÕES</div>
          <div style="font-size: 13px;">${budgetData.note}</div>
        </div>
        ` : ''}
        
        <!-- Rodapé -->
        <div style="margin-top: 40px; border-top: 1px solid #ddd; padding-top: 15px; font-size: 12px; color: #666; text-align: center;">
          <div>Este orçamento é válido por 15 dias. Após este período, os valores poderão sofrer alterações.</div>
          <div style="margin-top: 5px;">Emitido em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}</div>
        </div>
      </div>
    `;
    
    // Gerar o PDF
    try {
      console.log("Iniciando captura com html2canvas");
      const canvas = await html2canvas(printDiv, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff'
      });
      
      const imgData = canvas.toDataURL('image/png');
      
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const canvasRatio = canvas.height / canvas.width;
      const imgWidth = pdfWidth;
      const imgHeight = imgWidth * canvasRatio;
      
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      
      // Se for maior que uma página, adicionamos mais páginas
      let heightLeft = imgHeight;
      let position = 0;
      
      while (heightLeft > pdfHeight) {
        position = pdfHeight - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pdfHeight;
      }
      
      // Download direto
      try {
        console.log("Gerando PDF para download direto");
        
        const pdfBlob = pdf.output('blob');
        const blobUrl = URL.createObjectURL(pdfBlob);
        
        const downloadLink = document.createElement('a');
        downloadLink.href = blobUrl;
        const fileName = `Orcamento_${budgetData.id}_${budgetData.client_name.replace(/[^\w\s]/gi, '')}.pdf`;
        downloadLink.download = fileName;
        
        document.body.appendChild(downloadLink);
        downloadLink.click();
        
        setTimeout(() => {
          URL.revokeObjectURL(blobUrl);
          document.body.removeChild(downloadLink);
          document.body.removeChild(printDiv);
        }, 200);
        
        console.log(`Download do arquivo ${fileName} iniciado`);
        
        toast.toast({
          title: "PDF gerado com sucesso!",
          description: "O download do arquivo foi iniciado.",
        });
      } catch (error) {
        console.error("Erro ao gerar o PDF para download:", error);
        pdf.save(`Orcamento_${budgetData.id}_${budgetData.client_name.replace(/[^\w\s]/gi, '')}.pdf`);
        document.body.removeChild(printDiv);
      }
    } catch (err) {
      console.error("Erro na geração do PDF:", err);
      document.body.removeChild(printDiv);
      throw err;
    }
  } catch (error) {
    console.error("Erro geral na geração do PDF:", error);
    toast.toast({
      title: "Erro ao gerar PDF",
      description: "Ocorreu um erro ao gerar o documento. Tente novamente.",
      variant: "destructive",
    });
  }
};

// Função para gerar o grid de peças danificadas de forma elegante
function generateDamagedPartsGrid(damagedParts: any): string {
  // Criar o grid completo de layout do carro
  // Definir o layout fixo do grid para representar o carro
  const gridLayout = [
    // Primeira linha
    { id: 'paraLamaEsquerdo', name: 'Para-lama Esquerdo', isHorizontal: false },
    { id: 'capo', name: 'Capô', isHorizontal: true },
    { id: 'paraLamaDireito', name: 'Para-lama Direito', isHorizontal: false },
    
    // Segunda linha
    { id: 'colunaEsquerda', name: 'Coluna Esquerda', isHorizontal: false },
    { id: 'teto', name: 'Teto', isHorizontal: true },
    { id: 'colunaDireita', name: 'Coluna Direita', isHorizontal: false },
    
    // Terceira linha
    { id: 'portaDianteiraEsquerda', name: 'Porta Dianteira Esq.', isHorizontal: false },
    { id: 'PHOTO_PLACEHOLDER', name: 'FOTO', isHorizontal: false },
    { id: 'portaDianteiraDireita', name: 'Porta Dianteira Dir.', isHorizontal: false },
    
    // Quarta linha
    { id: 'portaTraseiraEsquerda', name: 'Porta Traseira Esq.', isHorizontal: false },
    { id: 'lateral', name: 'Lateral', isHorizontal: true },
    { id: 'portaTraseiraDireita', name: 'Porta Traseira Dir.', isHorizontal: false },
    
    // Quinta linha
    { id: 'EMPTY', name: '', isHorizontal: false },
    { id: 'portaMalasInferior', name: 'Porta-malas Inferior', isHorizontal: true },
    { id: 'EMPTY', name: '', isHorizontal: false },
  ];
  
  let partsObject: Record<string, any> = {};
  
  // Processar o objeto de peças danificadas
  try {
    if (typeof damagedParts === 'string') {
      partsObject = JSON.parse(damagedParts);
    } else {
      partsObject = damagedParts;
    }
  } catch (error) {
    console.error("Erro ao processar peças danificadas:", error);
    partsObject = {};
  }
  
  // Gerar o HTML para o grid completo
  let gridHtml = `
    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; width: 100%;">
  `;
  
  // Para cada posição no layout
  gridLayout.forEach(partLayout => {
    // Espaço vazio
    if (partLayout.id === 'EMPTY') {
      gridHtml += `<div style="min-height: 105px;"></div>`;
      return;
    }
    
    // Placeholder para a foto (será substituído pela foto real depois)
    if (partLayout.id === 'PHOTO_PLACEHOLDER') {
      gridHtml += `<div id="photo-placeholder" style="min-height: 105px; border: 1px dashed #ccc; border-radius: 5px; display: flex; align-items: center; justify-content: center;">
        <div style="color: #999; font-size: 12px; text-align: center;">Foto do veículo</div>
      </div>`;
      return;
    }
    
    // Obter os dados da peça, se existirem
    const part = partsObject[partLayout.id] || { 
      selected: false, 
      diameter20: 0, 
      diameter30: 0, 
      diameter40: 0,
      optionA: false,
      optionK: false,
      optionP: false
    };
    
    // Definir o estilo para peças selecionadas vs. não selecionadas
    const backgroundStyle = part.selected ? 'white' : '#f9fafb';
    const borderStyle = part.selected ? '1px solid #2563eb' : '1px solid #ddd';
    const titleColor = part.selected ? '#2563eb' : '#888';
    const shadowStyle = part.selected ? '0 2px 4px rgba(0,0,0,0.1)' : 'none';
    
    gridHtml += `
      <div style="padding: 12px; border: ${borderStyle}; border-radius: 5px; background-color: ${backgroundStyle}; box-shadow: ${shadowStyle}; min-height: 105px;">
        <div style="font-weight: bold; font-size: 11px; margin-bottom: 8px; color: ${titleColor}; text-align: center; min-height: 28px; display: flex; align-items: center; justify-content: center;">
          ${partLayout.name}
          ${partLayout.isHorizontal ? '<span style="margin-left: 5px; color: #666; font-size: 9px;">(H)</span>' : ''}
        </div>
        
        ${part.selected ? `
        <div style="display: flex; flex-direction: column; gap: 4px;">
          <!-- Diâmetros -->
          <div style="display: flex; flex-direction: column; gap: 4px; margin-bottom: 6px;">
            ${part.diameter20 > 0 ? `
            <div style="display: flex; justify-content: space-between; align-items: center; height: 16px;">
              <span style="font-size: 10px;">20mm:</span>
              <span style="font-size: 10px; width: 32px; height: 14px; border: 1px solid #ddd; display: flex; align-items: center; justify-content: center; background-color: #f4f4f4; border-radius: 2px;">${part.diameter20}</span>
            </div>
            ` : ''}
            
            ${part.diameter30 > 0 ? `
            <div style="display: flex; justify-content: space-between; align-items: center; height: 16px;">
              <span style="font-size: 10px;">30mm:</span>
              <span style="font-size: 10px; width: 32px; height: 14px; border: 1px solid #ddd; display: flex; align-items: center; justify-content: center; background-color: #f4f4f4; border-radius: 2px;">${part.diameter30}</span>
            </div>
            ` : ''}
            
            ${part.diameter40 > 0 ? `
            <div style="display: flex; justify-content: space-between; align-items: center; height: 16px;">
              <span style="font-size: 10px;">40mm:</span>
              <span style="font-size: 10px; width: 32px; height: 14px; border: 1px solid #ddd; display: flex; align-items: center; justify-content: center; background-color: #f4f4f4; border-radius: 2px;">${part.diameter40}</span>
            </div>
            ` : ''}
          </div>
          
          <!-- Opções A, K, P -->
          <div style="display: flex; justify-content: space-between; padding-top: 4px; border-top: 1px solid #eee;">
            <div style="display: flex; align-items: center;">
              <div style="width: 9px; height: 9px; border: 1px solid #ccc; margin-right: 2px; display: inline-block; position: relative; border-radius: 2px; background-color: ${part.optionA ? '#f8f8f8' : 'white'};">
                ${part.optionA ? '<div style="position: absolute; top: -2px; left: 1px; font-size: 7px; color: #333;">✓</div>' : ''}
              </div>
              <span style="color: red; font-weight: bold; font-size: 9px;">A</span>
            </div>
            
            <div style="display: flex; align-items: center;">
              <div style="width: 9px; height: 9px; border: 1px solid #ccc; margin-right: 2px; display: inline-block; position: relative; border-radius: 2px; background-color: ${part.optionK ? '#f8f8f8' : 'white'};">
                ${part.optionK ? '<div style="position: absolute; top: -2px; left: 1px; font-size: 7px; color: #333;">✓</div>' : ''}
              </div>
              <span style="color: blue; font-weight: bold; font-size: 9px;">K</span>
            </div>
            
            <div style="display: flex; align-items: center;">
              <div style="width: 9px; height: 9px; border: 1px solid #ccc; margin-right: 2px; display: inline-block; position: relative; border-radius: 2px; background-color: ${part.optionP ? '#f8f8f8' : 'white'};">
                ${part.optionP ? '<div style="position: absolute; top: -2px; left: 1px; font-size: 7px; color: #333;">✓</div>' : ''}
              </div>
              <span style="color: green; font-weight: bold; font-size: 9px;">P</span>
            </div>
          </div>
        </div>
        ` : `
        <div style="height: 65px; display: flex; align-items: center; justify-content: center; color: #999; font-size: 11px;">
          Sem danos
        </div>
        `}
      </div>
    `;
  });
  
  gridHtml += `</div>`;
  
  return gridHtml;
}