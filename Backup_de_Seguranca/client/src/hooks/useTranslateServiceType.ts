import { useTranslation } from 'react-i18next';

/**
 * Hook personalizado para traduzir tipos de serviço com base no idioma atual.
 * Permite traduzir nomes de tipos de serviço que vêm diretamente do banco de dados.
 */
export function useTranslateServiceType() {
  const { t } = useTranslation();

  /**
   * Traduz o nome de um tipo de serviço para o idioma atual
   * @param serviceTypeName Nome original do tipo de serviço (ex: "Granizo")
   * @returns Nome traduzido do tipo de serviço (ex: "Hagel" em alemão)
   */
  const translateServiceType = (serviceTypeName: string) => {
    if (!serviceTypeName) return '';
    
    // Buscar a tradução na estrutura serviceTypeNames
    // Usando o defaultValue como fallback para o caso da tradução não existir
    return t(`serviceTypeNames.${serviceTypeName}`, { defaultValue: serviceTypeName });
  };

  return { translateServiceType };
}