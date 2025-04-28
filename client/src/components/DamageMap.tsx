import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { CheckedState } from "@radix-ui/react-checkbox";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";

interface DamageUnit {
  size20?: number;
  size30?: number;
  size40?: number;
  isAluminum?: boolean;
  isGlue?: boolean;
  isPaint?: boolean;
}

interface VehicleDamage {
  [key: string]: DamageUnit;
}

interface DamageMapProps {
  damagedParts: string | VehicleDamage;
  readOnly?: boolean;
}

interface PartCellProps {
  title: string;
  damages: {
    size20?: number;
    size30?: number;
    size40?: number;
    isAluminum?: boolean;
    isGlue?: boolean;
    isPaint?: boolean;
  };
  readOnly?: boolean;
}

const PartCell: React.FC<PartCellProps> = ({ title, damages, readOnly = true }) => {
  const hasDamages = 
    (damages.size20 && damages.size20 > 0) || 
    (damages.size30 && damages.size30 > 0) || 
    (damages.size40 && damages.size40 > 0);

  if (!hasDamages && readOnly) {
    return (
      <div className="border rounded p-3 bg-slate-50 flex items-center justify-center h-32">
        <div className="text-center">
          <div className="font-medium text-sm mb-2">{title}</div>
          <div className="text-gray-500 text-xs">Sem danos</div>
        </div>
      </div>
    );
  }

  return (
    <div className="border rounded p-3 h-32">
      <div className="font-medium text-sm mb-2 text-center text-blue-600">{title}</div>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-2">
          {(damages.size20 && damages.size20 > 0) && (
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium">20mm:</span>
              <span className="text-xs text-right">{damages.size20}</span>
            </div>
          )}
          {(damages.size30 && damages.size30 > 0) && (
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium">30mm:</span>
              <span className="text-xs text-right">{damages.size30}</span>
            </div>
          )}
          {(damages.size40 && damages.size40 > 0) && (
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium">40mm:</span>
              <span className="text-xs text-right">{damages.size40}</span>
            </div>
          )}
        </div>
        <div className="space-y-1">
          {damages.isAluminum && (
            <div className="flex items-center">
              <Checkbox checked={true} disabled className="h-3 w-3" />
              <span className="ml-1 text-xs">A</span>
            </div>
          )}
          {damages.isGlue && (
            <div className="flex items-center">
              <Checkbox checked={true} disabled className="h-3 w-3" />
              <span className="ml-1 text-xs">K</span>
            </div>
          )}
          {damages.isPaint && (
            <div className="flex items-center">
              <Checkbox checked={true} disabled className="h-3 w-3" />
              <span className="ml-1 text-xs">P</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const DamageMap: React.FC<DamageMapProps> = ({ damagedParts, readOnly = true }) => {
  // Parse damaged parts if it's a string
  let parsedParts: VehicleDamage = {};
  try {
    if (typeof damagedParts === 'string') {
      parsedParts = JSON.parse(damagedParts) as VehicleDamage;
    } else {
      parsedParts = damagedParts as VehicleDamage || {};
    }
  } catch (error) {
    console.error("Error parsing damaged parts:", error);
    parsedParts = {};
  }

  // Map part IDs to display names
  const partMapping = {
    para_lama_esquerdo: "Para-lama Esquerdo",
    capo: "Capô",
    para_lama_direito: "Para-lama Direito",
    coluna_esquerda: "Coluna Esquerda",
    teto: "Teto",
    coluna_direita: "Coluna Direita",
    porta_dianteira_esquerda: "Porta Dianteira Esq.",
    porta_dianteira_direita: "Porta Dianteira Dir.",
    porta_traseira_esquerda: "Porta Traseira Esq.",
    porta_malas_superior: "Lateral",
    porta_traseira_direita: "Porta Traseira Dir.",
    lateral_esquerda: "Lateral Esquerda",
    porta_malas_inferior: "Porta-malas Inferior",
    lateral_direita: "Lateral Direita"
  };

  return (
    <Card>
      <CardContent className="p-4">
        <h2 className="text-xl font-semibold mb-4">Mapa de Danos</h2>
        <div className="grid grid-cols-3 gap-4">
          {/* Primeira linha */}
          <PartCell 
            title={partMapping.para_lama_esquerdo} 
            damages={parsedParts.para_lama_esquerdo || {}} 
            readOnly={readOnly} 
          />
          <PartCell 
            title={partMapping.capo} 
            damages={parsedParts.capo || {}} 
            readOnly={readOnly} 
          />
          <PartCell 
            title={partMapping.para_lama_direito} 
            damages={parsedParts.para_lama_direito || {}} 
            readOnly={readOnly} 
          />

          {/* Segunda linha */}
          <PartCell 
            title={partMapping.coluna_esquerda} 
            damages={parsedParts.coluna_esquerda || {}} 
            readOnly={readOnly} 
          />
          <PartCell 
            title={partMapping.teto} 
            damages={parsedParts.teto || {}} 
            readOnly={readOnly} 
          />
          <PartCell 
            title={partMapping.coluna_direita} 
            damages={parsedParts.coluna_direita || {}} 
            readOnly={readOnly} 
          />

          {/* Terceira linha */}
          <PartCell 
            title={partMapping.porta_dianteira_esquerda} 
            damages={parsedParts.porta_dianteira_esquerda || {}} 
            readOnly={readOnly} 
          />
          <div className="border rounded p-3 bg-gray-50 flex items-center justify-center h-32">
            <div className="text-center text-gray-400 text-sm">Foto do veículo</div>
          </div>
          <PartCell 
            title={partMapping.porta_dianteira_direita} 
            damages={parsedParts.porta_dianteira_direita || {}} 
            readOnly={readOnly} 
          />

          {/* Quarta linha */}
          <PartCell 
            title={partMapping.porta_traseira_esquerda} 
            damages={parsedParts.porta_traseira_esquerda || {}} 
            readOnly={readOnly} 
          />
          <PartCell 
            title={partMapping.porta_malas_superior} 
            damages={parsedParts.porta_malas_superior || {}} 
            readOnly={readOnly} 
          />
          <PartCell 
            title={partMapping.porta_traseira_direita} 
            damages={parsedParts.porta_traseira_direita || {}} 
            readOnly={readOnly} 
          />

          {/* Quinta linha */}
          <PartCell 
            title={partMapping.lateral_esquerda} 
            damages={parsedParts.lateral_esquerda || {}} 
            readOnly={readOnly} 
          />
          <PartCell 
            title={partMapping.porta_malas_inferior} 
            damages={parsedParts.porta_malas_inferior || {}} 
            readOnly={readOnly} 
          />
          <PartCell 
            title={partMapping.lateral_direita} 
            damages={parsedParts.lateral_direita || {}} 
            readOnly={readOnly} 
          />
        </div>

        {/* Legenda */}
        <div className="mt-4 p-3 bg-gray-50 rounded text-sm">
          <div className="font-medium mb-1">Materiais Especiais</div>
          <div className="text-xs text-gray-600">
            A = Alumínio (+25%) | K = Cola (+30%) | P = Pintura (sem adicional)
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default DamageMap;