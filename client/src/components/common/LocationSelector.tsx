import React, { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Button } from "@/components/ui/button";
import { LocationType } from "@/types";

interface LocationSelectorProps {
  value: {
    locationType: LocationType;
    address?: string;
    latitude?: number;
    longitude?: number;
  };
  onChange: (value: {
    locationType: LocationType;
    address?: string;
    latitude?: number;
    longitude?: number;
  }) => void;
}

export function LocationSelector({ value, onChange }: LocationSelectorProps) {
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const handleLocationTypeChange = (locationType: LocationType) => {
    onChange({
      ...value,
      locationType,
    });
  };

  const handleAddressChange = (address: string) => {
    onChange({
      ...value,
      address,
    });
  };

  const getCurrentLocation = () => {
    setIsGettingLocation(true);
    setLocationError(null);

    if (!navigator.geolocation) {
      setLocationError("Geolocalização não é suportada pelo seu navegador");
      setIsGettingLocation(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        
        // Call reverse geocoding API (not implemented for this demo)
        // For a real implementation, use a geocoding service like Google Maps Geocoding API
        const mockAddress = "Localização atual (coordenadas obtidas)";
        
        onChange({
          ...value,
          address: mockAddress,
          latitude,
          longitude,
        });
        
        setIsGettingLocation(false);
      },
      (error) => {
        let errorMessage;
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = "Permissão para geolocalização negada pelo usuário";
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = "Informações de localização indisponíveis";
            break;
          case error.TIMEOUT:
            errorMessage = "Tempo esgotado para obter localização";
            break;
          default:
            errorMessage = "Erro desconhecido ao obter localização";
        }
        setLocationError(errorMessage);
        setIsGettingLocation(false);
      }
    );
  };

  return (
    <div className="space-y-4">
      <div>
        <Label>Tipo de Localização</Label>
        <RadioGroup
          value={value.locationType}
          onValueChange={(val) => handleLocationTypeChange(val as LocationType)}
          className="flex space-x-4 mt-1"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="client_location" id="client-location" />
            <Label htmlFor="client-location" className="cursor-pointer">Local do Cliente</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="workshop" id="workshop" />
            <Label htmlFor="workshop" className="cursor-pointer">Oficina</Label>
          </div>
        </RadioGroup>
      </div>
      
      <div>
        <Label htmlFor="address">Endereço</Label>
        <Input
          id="address"
          value={value.address || ""}
          onChange={(e) => handleAddressChange(e.target.value)}
          placeholder="Digite o endereço completo"
          className="mt-1"
        />
      </div>
      
      <div>
        <Label>Usar Localização Atual</Label>
        <Button
          type="button"
          variant="outline"
          className="w-full mt-1 bg-gray-50 hover:bg-gray-100"
          onClick={getCurrentLocation}
          disabled={isGettingLocation}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          {isGettingLocation ? "Obtendo Localização..." : "Obter Localização Atual"}
        </Button>
        {locationError && (
          <p className="text-sm text-red-500 mt-1">{locationError}</p>
        )}
      </div>
    </div>
  );
}
