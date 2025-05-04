import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import i18next from 'i18next';
import type { TFunction } from 'i18next';

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
  vehicle_image?: string; // Adicionando campo para a imagem do veículo
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

// Função para obter o nome traduzido da peça
const getPartDisplayName = (part: string, t: TFunction): string => {
  if (part === "imagem_central") return ""; // Espaço vazio para a imagem
  return t(`budget.damageMap.${part}`);
};

/**
 * Gera um PDF básico de orçamento
 * Implementação totalmente nova com base na imagem de exemplo
 */
export const generateSimplePdf = async (budget: Budget, isGestor = false): Promise<void> => {
  try {
    // Obter a função de tradução atual
    const t = i18next.t.bind(i18next);
    console.log("Gerando PDF no idioma:", i18next.language);
    
    // Criar o elemento temporário para renderizar o conteúdo
    const tempElement = document.createElement('div');
    tempElement.style.position = 'fixed';
    tempElement.style.left = '-9999px';
    tempElement.style.fontFamily = 'Arial, sans-serif';
    tempElement.style.width = '794px'; // Largura A4
    tempElement.style.padding = '20px 40px 40px 40px'; // Topo, Direita, Baixo, Esquerda
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
        // Se for o espaço para imagem, exibir a imagem do veículo se existir
        if (part === "imagem_central") {
          if (budget.vehicle_image) {
            return `<div style="border: 1px solid #ddd; border-radius: 5px; padding: 6px; height: 100px; display: flex; align-items: center; justify-content: center; overflow: hidden;">
              <img src="${budget.vehicle_image}" alt="Imagem do veículo" style="max-width: 100%; max-height: 100%; object-fit: contain;">
            </div>`;
          } else {
            return `<div style="border: 1px solid #ddd; border-radius: 5px; padding: 6px; height: 100px; display: flex; align-items: center; justify-content: center;">
              <div style="color: #888; font-size: 10px;">${t('budget.noImage')}</div>
            </div>`;
          }
        }
        
        const damage = damageData[part] || {};
        
        return `
          <div style="border: 1px solid #ddd; border-radius: 5px; padding: 6px;">
            <h4 style="font-size: 11px; font-weight: bold; margin-bottom: 4px; text-align: center;">${getPartDisplayName(part, t)}</h4>
            <div>
              <!-- Tamanho 20mm -->
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                <span style="font-size: 10px; width: 30px; text-align: right; margin-right: -8px;">20mm:</span>
                <span style="width: 40px; height: 18px; font-size: 10px; text-align: center; border: 1px solid #ddd; border-radius: 3px; padding: 2px;">
                  <span style="display: inline-block; position: relative; top: -4px;">${damage.size20 || 0}</span>
                </span>
              </div>
              
              <!-- Tamanho 30mm -->
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                <span style="font-size: 10px; width: 30px; text-align: right; margin-right: -8px;">30mm:</span>
                <span style="width: 40px; height: 18px; font-size: 10px; text-align: center; border: 1px solid #ddd; border-radius: 3px; padding: 2px;">
                  <span style="display: inline-block; position: relative; top: -4px;">${damage.size30 || 0}</span>
                </span>
              </div>
              
              <!-- Tamanho 40mm -->
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                <span style="font-size: 10px; width: 30px; text-align: right; margin-right: -8px;">40mm:</span>
                <span style="width: 40px; height: 18px; font-size: 10px; text-align: center; border: 1px solid #ddd; border-radius: 3px; padding: 2px;">
                  <span style="display: inline-block; position: relative; top: -4px;">${damage.size40 || 0}</span>
                </span>
              </div>
              
              <!-- Checkboxes -->
              <div style="display: flex; justify-content: space-between; margin-top: 8px;">
                <div style="display: flex; flex-direction: column; align-items: center; width: 20px;">
                  <div style="width: 10px; height: 10px; border: 1px solid #ddd; border-radius: 2px; ${damage.isAluminum ? 'background-color: #2563EB;' : ''}" title="${t('budget.aluminum')}"></div>
                  <label style="font-size: 9px; font-weight: bold; color: #DC2626; margin-top: 2px;">A</label>
                </div>
                <div style="display: flex; flex-direction: column; align-items: center; width: 20px;">
                  <div style="width: 10px; height: 10px; border: 1px solid #ddd; border-radius: 2px; ${damage.isGlue ? 'background-color: #2563EB;' : ''}" title="${t('budget.glue')}"></div>
                  <label style="font-size: 9px; font-weight: bold; color: #2563EB; margin-top: 2px;">K</label>
                </div>
                <div style="display: flex; flex-direction: column; align-items: center; width: 20px;">
                  <div style="width: 10px; height: 10px; border: 1px solid #ddd; border-radius: 2px; ${damage.isPaint ? 'background-color: #2563EB;' : ''}" title="${t('budget.paint')}"></div>
                  <label style="font-size: 9px; font-weight: bold; color: #16A34A; margin-top: 2px;">P</label>
                </div>
              </div>
            </div>
          </div>
        `;
      };
      
      // Construir o grid
      damageParts += `
        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 5px; margin-top: 10px;">
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
        
        <!-- Conteúdo principal -->
        <div style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 15px;">
          <!-- Barra azul com título ORÇAMENTO -->
          <div style="background-color: #2563EB; color: white; padding: 6px 10px; display: flex; justify-content: space-between; border-radius: 6px;">
            <div style="font-size: 15px; font-weight: bold;">${t('budget.budgetTitle').toUpperCase()}</div>
            <div style="font-size: 15px; font-weight: bold;">${formatDate(budget.date)}</div>
          </div>
          
          <!-- Informações do cliente e veículo -->
          <div style="display: flex; gap: 10px;">
            <!-- Bloco de informações do cliente -->
            <div style="flex: 1; padding: 12px; border: 1px solid #ddd; border-radius: 5px; background-color: #f9fafb;">
              <div style="font-weight: bold; margin-bottom: 12px; color: #2563EB; font-size: 14px;">${t('budget.clientInfoTitle').toUpperCase()}</div>
              <div style="margin-bottom: 6px; font-size: 13px;"><span style="font-weight: bold;">${t('budget.clientName')}:</span> ${budget.client_name}</div>
              <div style="margin-bottom: 6px; font-size: 13px;"><span style="font-weight: bold;">${t('budget.date')}:</span> ${formatDate(budget.date)}</div>
            </div>
            
            <!-- Bloco de informações do veículo -->
            <div style="flex: 1; padding: 12px; border: 1px solid #ddd; border-radius: 5px; background-color: #f9fafb;">
              <div style="font-weight: bold; margin-bottom: 12px; color: #2563EB; font-size: 14px;">${t('budget.vehicleInfoTitle').toUpperCase()}</div>
              <div style="margin-bottom: 6px; font-size: 13px;"><span style="font-weight: bold;">${t('budget.vehicle')}:</span> ${budget.vehicle_info}</div>
              <div style="margin-bottom: 6px; font-size: 13px;"><span style="font-weight: bold;">${t('budget.licensePlate')}:</span> ${budget.plate || '---'}</div>
              <div style="margin-bottom: 6px; font-size: 13px;"><span style="font-weight: bold;">${t('budget.chassisNumber')}:</span> ${budget.chassis_number || '---'}</div>
            </div>
          </div>
        </div>
        
        <!-- Seção de Danos do Veículo -->
        <div style="margin-top: 5px; margin-bottom: 15px;">
          <div style="background-color: #2563EB; color: white; padding: 6px 10px; border-radius: 6px; margin-bottom: 10px;">
            <div style="font-size: 15px; font-weight: bold;">${t('budget.vehicleDamages').toUpperCase()}</div>
          </div>
          
          ${renderDamageGrid()}
          
          <!-- Seção de Materiais Especiais -->
          <div style="margin-top: 15px; border: 2px solid #2563EB; padding: 10px; border-radius: 6px; background-color: #f0f7ff;">
            <h3 style="font-size: 14px; font-weight: bold; margin-bottom: 8px; color: #2563EB; text-align: center; text-transform: uppercase;">${t('budget.specialMaterials')}</h3>
            <div style="font-size: 12px; text-align: center; font-weight: bold;">
              <span style="color: #DC2626;">(A) = ${t('budget.aluminum')} (+25%)</span> | 
              <span style="color: #2563EB;">(K) = ${t('budget.glue')} (+30%)</span> | 
              <span style="color: #16A34A;">(P) = ${t('budget.paint')}</span>
            </div>
          </div>

          <!-- A seção de valor total foi removida conforme solicitado -->
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

      // Fazer o download do PDF com nome seguro (sem ID e com apenas parte do nome)
      const clientNameSafe = budget.client_name.split(' ')[0]; // Apenas o primeiro nome para maior privacidade
      const formattedDate = budget.date.split('T')[0].replace(/-/g, '');
      const fileName = `${t('budget.budgetTitle')}_${formattedDate}_${clientNameSafe}.pdf`;
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