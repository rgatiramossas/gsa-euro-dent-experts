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
    vehicle_image?: string;
    total_aw?: number;
    total_value?: number;
    note?: string;
    created_at: string;
  };
}

export const generatePdf = async (budgetData: PdfGeneratorProps['budgetData']) => {
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
        <!-- Cabeçalho com logo (sem informações da empresa) -->
        <div style="display: flex; justify-content: space-between; border-bottom: 2px solid #2563eb; padding-bottom: 10px; margin-bottom: 10px;">
          <div style="display: flex; align-items: center;">
            <div style="font-size: 24px; font-weight: bold; color: #2563eb;">EURO</div>
            <div style="font-size: 24px; font-weight: bold; color: #000; margin-left: 3px;">DENT</div>
            <div style="font-size: 10px; margin-left: 3px; margin-top: 3px; color: #000;">EXPERTS</div>
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
        
        <!-- Grid de danos do veículo -->
        <div>
          <!-- Grid de peças danificadas -->
          <div id="damage-grid">
            ${generateDamagedPartsGrid(budgetData.damaged_parts, budgetData.vehicle_image)}
          </div>
        </div>
        
        <!-- Legenda -->
        <div style="margin-bottom: 20px; padding: 10px; border: 1px solid #ddd; border-radius: 5px; background-color: #f9fafb;">
          <div style="font-weight: bold; margin-bottom: 10px; color: #2563eb; font-size: 14px;">LEGENDA</div>
          <div style="display: flex; gap: 25px; font-size: 12px;">
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
        
        <!-- Removido a seção de resumo financeiro conforme solicitado -->
        
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
    throw error;
  }
};

// Função para gerar o grid de peças danificadas de forma elegante
export function generateDamagedPartsGrid(damagedParts: any, vehicleImage?: string): string {
  // Criar o grid completo de layout do carro
  // Definir o layout fixo do grid para representar o carro
  const gridLayout = [
    // Primeira linha: Para-lama Esquerdo - Capô - Para-lama Direito
    { id: 'paraLamaEsquerdo', name: 'Para-lama Esquerdo', isHorizontal: false },
    { id: 'capo', name: 'Capô', isHorizontal: true },
    { id: 'paraLamaDireito', name: 'Para-lama Direito', isHorizontal: false },
    
    // Segunda linha: Coluna Esquerda - Teto - Coluna Direita
    { id: 'colunaEsquerda', name: 'Coluna Esquerda', isHorizontal: false },
    { id: 'teto', name: 'Teto', isHorizontal: true },
    { id: 'colunaDireita', name: 'Coluna Direita', isHorizontal: false },
    
    // Terceira linha: Porta Dianteira Esquerda - Espaço Imagem - Porta Dianteira Direita
    { id: 'portaDianteiraEsquerda', name: 'Porta Dianteira Esq.', isHorizontal: false },
    { id: 'PHOTO_PLACEHOLDER', name: 'FOTO', isHorizontal: false },
    { id: 'portaDianteiraDireita', name: 'Porta Dianteira Dir.', isHorizontal: false },
    
    // Quarta linha: Porta Traseira Esquerda - Porta Malas Superior - Porta Traseira Direita
    { id: 'portaTraseiraEsquerda', name: 'Porta Traseira Esq.', isHorizontal: false },
    { id: 'portaMalasSuperior', name: 'Porta Malas Superior', isHorizontal: true },
    { id: 'portaTraseiraDireita', name: 'Porta Traseira Dir.', isHorizontal: false },
    
    // Quinta linha: Lateral Esquerda - Porta Malas Inferior - Lateral Direita
    { id: 'lateralEsquerda', name: 'Lateral Esquerda', isHorizontal: false },
    { id: 'portaMalasInferior', name: 'Porta Malas Inferior', isHorizontal: true },
    { id: 'lateralDireita', name: 'Lateral Direita', isHorizontal: false },
  ];
  
  let partsObject: Record<string, any> = {};
  
  // Processar o objeto de peças danificadas
  try {
    if (typeof damagedParts === 'string') {
      partsObject = JSON.parse(damagedParts);
    } else {
      partsObject = damagedParts;
    }
    
    // Mapear os IDs do formulário para os IDs do PDF
    const formToPdfMap: Record<string, string> = {
      'para_lama_esquerdo': 'paraLamaEsquerdo',
      'capo': 'capo',
      'para_lama_direito': 'paraLamaDireito',
      'coluna_esquerda': 'colunaEsquerda',
      'teto': 'teto',
      'coluna_direita': 'colunaDireita',
      'porta_dianteira_esquerda': 'portaDianteiraEsquerda',
      'porta_dianteira_direita': 'portaDianteiraDireita',
      'porta_traseira_esquerda': 'portaTraseiraEsquerda',
      'porta_malas_superior': 'portaMalasSuperior',
      'porta_traseira_direita': 'portaTraseiraDireita',
      'lateral_esquerda': 'lateralEsquerda',
      'porta_malas_inferior': 'portaMalasInferior',
      'lateral_direita': 'lateralDireita'
    };
    
    // Criar um novo objeto com as chaves mapeadas
    const mappedObject: Record<string, any> = {};
    
    // Converter os dados do formulário para o formato do PDF
    for (const [formKey, formData] of Object.entries(partsObject)) {
      if (formToPdfMap[formKey]) {
        mappedObject[formToPdfMap[formKey]] = {
          selected: formData.size20 > 0 || formData.size30 > 0 || formData.size40 > 0,
          diameter20: formData.size20 || 0,
          diameter30: formData.size30 || 0,
          diameter40: formData.size40 || 0,
          optionA: formData.isAluminum || false,
          optionK: formData.isGlue || false,
          optionP: formData.isPaint || false
        };
      }
    }
    
    // Substituir o objeto original pelo mapeado
    partsObject = mappedObject;
    
  } catch (error) {
    console.error("Erro ao processar peças danificadas:", error);
    partsObject = {};
  }
  
  // Gerar o HTML para o grid completo de 3x5
  let gridHtml = `
    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; width: 100%; margin-bottom: 20px;">
  `;
  
  // Para cada posição no layout
  gridLayout.forEach(partLayout => {
    // Espaço vazio
    if (partLayout.id === 'EMPTY') {
      gridHtml += `<div style="min-height: 105px;"></div>`;
      return;
    }
    
    // Foto do veículo - inserida diretamente no HTML
    if (partLayout.id === 'PHOTO_PLACEHOLDER') {
      if (vehicleImage) {
        gridHtml += `<div style="height: 110px; border: 1px solid #ddd; border-radius: 5px; overflow: hidden; padding: 0; width: 100%;">
          <img src="${vehicleImage}" style="width: 100%; height: 110px; object-fit: contain; border-radius: 4px;" alt="Foto do veículo" />
        </div>`;
      } else {
        gridHtml += `<div style="height: 110px; border: 1px dashed #ccc; border-radius: 5px; display: flex; align-items: center; justify-content: center; width: 100%;">
          <div style="color: #999; font-size: 12px; text-align: center;">Foto do veículo</div>
        </div>`;
      }
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
      <div style="padding: 10px; border: ${borderStyle}; border-radius: 5px; background-color: ${backgroundStyle}; box-shadow: ${shadowStyle}; height: 110px; width: 100%;">
        <div style="font-weight: bold; font-size: 11px; margin-bottom: 5px; color: ${titleColor}; text-align: center; height: 25px; display: flex; align-items: center; justify-content: center;">
          ${partLayout.name}
          ${partLayout.isHorizontal ? '<span style="margin-left: 5px; color: #666; font-size: 9px;">(H)</span>' : ''}
        </div>
        
        <div style="display: flex; flex-direction: column; gap: 2px;">
          <!-- Sempre mostrar todos os diâmetros com larguras fixas para melhor alinhamento -->
          <div style="display: flex; flex-direction: column; gap: 2px; margin-bottom: 3px;">
            <!-- 20mm (sempre visível) - com padding negativo para o label e positivo para o valor -->
            <div style="display: flex; align-items: center; justify-content: space-between; height: 16px;">
              <span style="font-size: 10px; width: 25px; text-align: right; margin-right: -2px;">20mm:</span>
              <span style="font-size: 10px; width: 32px; height: 14px; border: 1px solid #ddd; display: flex; align-items: center; justify-content: center; background-color: ${part.diameter20 > 0 ? '#f4f4f4' : 'white'}; border-radius: 2px; padding: 0 2px;">${part.diameter20 > 0 ? part.diameter20 : ''}</span>
            </div>
            
            <!-- 30mm (sempre visível) - com padding negativo para o label e positivo para o valor -->
            <div style="display: flex; align-items: center; justify-content: space-between; height: 16px;">
              <span style="font-size: 10px; width: 25px; text-align: right; margin-right: -2px;">30mm:</span>
              <span style="font-size: 10px; width: 32px; height: 14px; border: 1px solid #ddd; display: flex; align-items: center; justify-content: center; background-color: ${part.diameter30 > 0 ? '#f4f4f4' : 'white'}; border-radius: 2px; padding: 0 2px;">${part.diameter30 > 0 ? part.diameter30 : ''}</span>
            </div>
            
            <!-- 40mm (sempre visível) - com padding negativo para o label e positivo para o valor -->
            <div style="display: flex; align-items: center; justify-content: space-between; height: 16px;">
              <span style="font-size: 10px; width: 25px; text-align: right; margin-right: -2px;">40mm:</span>
              <span style="font-size: 10px; width: 32px; height: 14px; border: 1px solid #ddd; display: flex; align-items: center; justify-content: center; background-color: ${part.diameter40 > 0 ? '#f4f4f4' : 'white'}; border-radius: 2px; padding: 0 2px;">${part.diameter40 > 0 ? part.diameter40 : ''}</span>
            </div>
          </div>
          
          <!-- Opções A, K, P (sempre visíveis) com margem negativa para melhor alinhamento -->
          <div style="display: flex; justify-content: space-around; padding-top: 2px; border-top: 1px solid #eee; margin: 0 -5px;">
            <div style="display: flex; flex-direction: column; align-items: center; width: 12px; justify-content: center;">
              <div style="width: 9px; height: 9px; border: 1px solid #ccc; display: inline-block; position: relative; border-radius: 2px; background-color: ${part.optionA ? '#f8f8f8' : 'white'}; margin-bottom: 1px;">
                ${part.optionA ? '<div style="position: absolute; top: -2px; left: 1px; font-size: 7px; color: #333;">✓</div>' : ''}
              </div>
              <span style="color: red; font-weight: bold; font-size: 9px;">A</span>
            </div>
            
            <div style="display: flex; flex-direction: column; align-items: center; width: 12px; justify-content: center;">
              <div style="width: 9px; height: 9px; border: 1px solid #ccc; display: inline-block; position: relative; border-radius: 2px; background-color: ${part.optionK ? '#f8f8f8' : 'white'}; margin-bottom: 1px;">
                ${part.optionK ? '<div style="position: absolute; top: -2px; left: 1px; font-size: 7px; color: #333;">✓</div>' : ''}
              </div>
              <span style="color: blue; font-weight: bold; font-size: 9px;">K</span>
            </div>
            
            <div style="display: flex; flex-direction: column; align-items: center; width: 12px; justify-content: center;">
              <div style="width: 9px; height: 9px; border: 1px solid #ccc; display: inline-block; position: relative; border-radius: 2px; background-color: ${part.optionP ? '#f8f8f8' : 'white'}; margin-bottom: 1px;">
                ${part.optionP ? '<div style="position: absolute; top: -2px; left: 1px; font-size: 7px; color: #333;">✓</div>' : ''}
              </div>
              <span style="color: green; font-weight: bold; font-size: 9px;">P</span>
            </div>
          </div>
        </div>
      </div>
    `;
  });
  
  gridHtml += `</div>`;
  
  return gridHtml;
}