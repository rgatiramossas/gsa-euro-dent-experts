import React, { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Button } from "@/components/ui/button";
import { LocationType } from "@/types";
import { checkNetworkStatus } from "@/lib/pwaManager";
import { Alert, AlertDescription } from "@/components/ui/alert";

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
  const [isOnline, setIsOnline] = useState<boolean>(checkNetworkStatus());
  const [hasManuallyEnteredAddress, setHasManuallyEnteredAddress] = useState<boolean>(false);

  // Monitorar o estado da conexão
  useEffect(() => {
    const handleOnlineStatus = () => {
      setIsOnline(checkNetworkStatus());
    };

    // Adicionar event listeners para detectar mudanças de conectividade
    window.addEventListener("online", handleOnlineStatus);
    window.addEventListener("offline", handleOnlineStatus);

    // Verificar status inicial da rede
    handleOnlineStatus();

    // Cleanup event listeners
    return () => {
      window.removeEventListener("online", handleOnlineStatus);
      window.removeEventListener("offline", handleOnlineStatus);
    };
  }, []);

  const handleLocationTypeChange = (locationType: LocationType) => {
    onChange({
      ...value,
      locationType,
    });
  };

  const handleAddressChange = (address: string) => {
    // Marcar o endereço como manualmente editado
    setHasManuallyEnteredAddress(true);
    
    // Preserva as coordenadas existentes ao alterar manualmente o endereço
    onChange({
      ...value,
      address,
      // Se estiver offline e o usuário estiver digitando manualmente,
      // podemos manter as coordenadas antigas ou definir como nulas
      // dependendo do requisito de negócio
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
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          
          // Usar as coordenadas reais obtidas do dispositivo
          console.log(`Localização obtida: ${latitude}, ${longitude}`);
          
          let endereco = "";
          
          // Tentar obter o endereço apenas se estiver online
          if (isOnline) {
            try {
              const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
                { headers: { 'Accept-Language': 'pt-BR,pt;q=0.9' } }
              );
              const data = await response.json();
              
              if (data && data.display_name) {
                endereco = data.display_name;
                console.log("Endereço obtido:", endereco);
              } else {
                // Caso não conseguirmos obter o endereço, usar coordenadas
                endereco = `Localização: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
                console.log("Endereço não encontrado, usando coordenadas");
              }
            } catch (error) {
              console.error("Erro ao obter endereço:", error);
              endereco = `Localização: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
            }
          } else {
            // Se estiver offline, usar apenas as coordenadas
            endereco = `Localização: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
            console.log("Modo offline: usando coordenadas apenas");
          }
          
          // Desmarcar o endereço manual já que estamos usando localização automática
          setHasManuallyEnteredAddress(false);
          
          onChange({
            ...value,
            address: endereco,
            latitude: latitude,
            longitude: longitude,
          });
        } catch (error) {
          console.error("Erro ao processar localização:", error);
          setLocationError("Erro ao processar dados de localização");
        } finally {
          setIsGettingLocation(false);
        }
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
      
      {/* Alerta para modo offline */}
      {!isOnline && (
        <Alert variant="warning" className="bg-amber-50 border-amber-200">
          <AlertDescription>
            <div className="flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>Você está offline. Digite o endereço manualmente ou use as coordenadas do GPS.</span>
            </div>
          </AlertDescription>
        </Alert>
      )}
      
      <div>
        <Label htmlFor="address">Endereço</Label>
        <Input
          id="address"
          value={value.address || ""}
          onChange={(e) => handleAddressChange(e.target.value)}
          placeholder="Digite o endereço completo"
          className="mt-1"
        />
        {value.latitude && value.longitude && (
          <p className="text-xs text-muted-foreground mt-1">
            Coordenadas detectadas: {value.latitude.toFixed(6)}, {value.longitude.toFixed(6)}
            {hasManuallyEnteredAddress && (
              <span className="ml-1 text-amber-600">
                (Endereço editado manualmente)
              </span>
            )}
          </p>
        )}
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
        {!isOnline && !locationError && (
          <p className="text-xs text-muted-foreground mt-1">
            Mesmo offline, o GPS ainda pode obter suas coordenadas atuais.
          </p>
        )}
      </div>
    </div>
  );
}
