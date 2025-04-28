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
  damaged_parts?: any;
}

// Interface para uma unidade de dano
interface DamageUnit {
  size20?: number;
  size30?: number;
  size40?: number;
  isAluminum?: boolean;
  isGlue?: boolean;
  isPaint?: boolean;
}

// Interface para os danos do veículo
interface VehicleDamage {
  [key: string]: DamageUnit;
}

// Lista de todas as peças do veículo
const vehicleParts = [
  "para_lama_esquerdo", "capo", "para_lama_direito",
  "coluna_esquerda", "teto", "coluna_direita",
  "porta_dianteira_esquerda", "imagem_central", "porta_dianteira_direita",
  "porta_traseira_esquerda", "porta_malas_superior", "porta_traseira_direita",
  "lateral_esquerda", "porta_malas_inferior", "lateral_direita"
];

// Nomes de exibição das peças
const partDisplayNames: Record<string, string> = {
  para_lama_esquerdo: "Para-lama Esquerdo",
  capo: "Capô",
  para_lama_direito: "Para-lama Direito",
  coluna_esquerda: "Coluna Esquerda",
  teto: "Teto",
  coluna_direita: "Coluna Direita",
  porta_dianteira_esquerda: "Porta Dianteira Esquerda",
  imagem_central: "", // Espaço vazio para a imagem
  porta_dianteira_direita: "Porta Dianteira Direita",
  porta_traseira_esquerda: "Porta Traseira Esquerda",
  porta_malas_superior: "Porta Malas Superior",
  porta_traseira_direita: "Porta Traseira Direita",
  lateral_esquerda: "Lateral Esquerda",
  porta_malas_inferior: "Porta Malas Inferior",
  lateral_direita: "Lateral Direita"
};

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

    // Processar os dados de danos
    let damageData: VehicleDamage = {};
    
    if (budget.damaged_parts) {
      try {
        // Tentar fazer parse se for string
        damageData = typeof budget.damaged_parts === 'string' 
          ? JSON.parse(budget.damaged_parts) 
          : budget.damaged_parts;
      } catch (error) {
        console.error("Erro ao processar dados de danos:", error);
        damageData = {};
      }
    }
    
    // Preencher peças faltantes
    vehicleParts.forEach(part => {
      if (!damageData[part]) {
        damageData[part] = {
          size20: 0,
          size30: 0,
          size40: 0,
          isAluminum: false,
          isGlue: false,
          isPaint: false
        };
      }
    });

    // Renderizar o grid de danos
    const renderDamageGrid = () => {
      let damageParts = '';
      
      // Função para renderizar uma parte dos danos
      const renderDamagePart = (part: string) => {
        // Se for o espaço para imagem, retornar um div vazio
        if (part === "imagem_central") {
          return `<div style="border: 1px solid #ddd; border-radius: 5px; padding: 10px; height: 80px; display: flex; align-items: center; justify-content: center;">
            <div style="color: #888; font-size: 10px;">Imagem do veículo</div>
          </div>`;
        }
        
        const damage = damageData[part] || {};
        
        return `
          <div style="border: 1px solid #ddd; border-radius: 5px; padding: 8px;">
            <h4 style="font-size: 11px; font-weight: bold; margin-bottom: 5px; text-align: center;">${partDisplayNames[part]}</h4>
            <div>
              <!-- Tamanho 20mm -->
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                <span style="font-size: 10px; width: 30px; text-align: right; margin-right: -8px;">20mm:</span>
                <span style="width: 30px; height: 18px; font-size: 10px; text-align: center; border: 1px solid #ddd; border-radius: 3px; padding: 2px;">${damage.size20 || 0}</span>
              </div>
              
              <!-- Tamanho 30mm -->
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                <span style="font-size: 10px; width: 30px; text-align: right; margin-right: -8px;">30mm:</span>
                <span style="width: 30px; height: 18px; font-size: 10px; text-align: center; border: 1px solid #ddd; border-radius: 3px; padding: 2px;">${damage.size30 || 0}</span>
              </div>
              
              <!-- Tamanho 40mm -->
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                <span style="font-size: 10px; width: 30px; text-align: right; margin-right: -8px;">40mm:</span>
                <span style="width: 30px; height: 18px; font-size: 10px; text-align: center; border: 1px solid #ddd; border-radius: 3px; padding: 2px;">${damage.size40 || 0}</span>
              </div>
              
              <!-- Checkboxes -->
              <div style="display: flex; justify-content: space-between; margin-top: 6px;">
                <div style="display: flex; flex-direction: column; align-items: center; width: 20px;">
                  <div style="width: 10px; height: 10px; border: 1px solid #ddd; border-radius: 2px; ${damage.isAluminum ? 'background-color: #2563EB;' : ''}" title="Alumínio"></div>
                  <label style="font-size: 9px; font-weight: bold; color: #DC2626; margin-top: 2px;">A</label>
                </div>
                <div style="display: flex; flex-direction: column; align-items: center; width: 20px;">
                  <div style="width: 10px; height: 10px; border: 1px solid #ddd; border-radius: 2px; ${damage.isGlue ? 'background-color: #2563EB;' : ''}" title="Cola"></div>
                  <label style="font-size: 9px; font-weight: bold; color: #2563EB; margin-top: 2px;">K</label>
                </div>
                <div style="display: flex; flex-direction: column; align-items: center; width: 20px;">
                  <div style="width: 10px; height: 10px; border: 1px solid #ddd; border-radius: 2px; ${damage.isPaint ? 'background-color: #2563EB;' : ''}" title="Pintura"></div>
                  <label style="font-size: 9px; font-weight: bold; color: #16A34A; margin-top: 2px;">P</label>
                </div>
              </div>
            </div>
          </div>
        `;
      };
      
      // Construir o grid
      damageParts += `
        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; margin-top: 15px;">
          <!-- Primeira linha: Para-lama Esquerdo - Capô - Para-lama Direito -->
          ${renderDamagePart("para_lama_esquerdo")}
          ${renderDamagePart("capo")}
          ${renderDamagePart("para_lama_direito")}
    
          <!-- Segunda linha: Coluna Esquerda - Teto - Coluna Direita -->
          ${renderDamagePart("coluna_esquerda")}
          ${renderDamagePart("teto")}
          ${renderDamagePart("coluna_direita")}
    
          <!-- Terceira linha: Porta Dianteira Esquerda - Espaço para Imagem - Porta Dianteira Direita -->
          ${renderDamagePart("porta_dianteira_esquerda")}
          ${renderDamagePart("imagem_central")}
          ${renderDamagePart("porta_dianteira_direita")}
    
          <!-- Quarta linha: Porta Traseira Esquerda - Porta Malas Superior - Porta Traseira Direita -->
          ${renderDamagePart("porta_traseira_esquerda")}
          ${renderDamagePart("porta_malas_superior")}
          ${renderDamagePart("porta_traseira_direita")}
    
          <!-- Quinta linha: Lateral Esquerda - Porta Malas Inferior - Lateral Direita -->
          ${renderDamagePart("lateral_esquerda")}
          ${renderDamagePart("porta_malas_inferior")}
          ${renderDamagePart("lateral_direita")}
        </div>
      `;
      
      return damageParts;
    };

    // Conteúdo do PDF com cabeçalho e grid de danos
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
        
        <!-- Seção de Danos do Veículo -->
        <div style="margin-top: 30px; margin-bottom: 20px;">
          <div style="background-color: #2563EB; color: white; padding: 10px; border-radius: 6px; margin-bottom: 15px;">
            <div style="font-size: 16px; font-weight: bold;">DANOS DO VEÍCULO</div>
          </div>
          
          ${renderDamageGrid()}
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