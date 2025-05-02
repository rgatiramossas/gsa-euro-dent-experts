import React, { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useTranslation } from "react-i18next";

// Interface simplificada - apenas endereço manual
interface LocationSelectorProps {
  onLocationChange: (address: string, latitude: number | null, longitude: number | null) => void;
  initialAddress?: string;
}

export function LocationSelector({ 
  onLocationChange, 
  initialAddress = ""
}: LocationSelectorProps) {
  const { t } = useTranslation();
  const [address, setAddress] = useState(initialAddress);

  // Handler para alterações no endereço
  const handleAddressChange = (newAddress: string) => {
    setAddress(newAddress);
    onLocationChange(newAddress, null, null);
  };

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="address">{t("services.address", "Endereço")}</Label>
        <Input
          id="address"
          value={address}
          onChange={(e) => handleAddressChange(e.target.value)}
          placeholder={t("location.addressPlaceholder", "Digite o endereço completo")}
          className="mt-1"
        />
      </div>
    </div>
  );
}