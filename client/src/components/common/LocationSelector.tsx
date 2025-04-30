import React, { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Button } from "@/components/ui/button";
import { LocationType } from "@/types";
import { checkNetworkStatus } from "@/lib/pwaManager";

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
  const [networkOnline, setNetworkOnline] = useState<boolean>(true);
  
  // Verifica o status da rede ao carregar o componente e monitorar alterações
  useEffect(() => {
    const checkNetwork = async () => {
      const online = await checkNetworkStatus();
      setNetworkOnline(online);
    };
    
    // Verificar status inicial
    checkNetwork();
    
    // Monitorar eventos de alteração de status de rede
    const handleOnline = () => setNetworkOnline(true);
    const handleOffline = () => setNetworkOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleLocationTypeChange = (locationType: LocationType) => {
    onChange({
      ...value,
      locationType,
    });
  };

  const handleAddressChange = (address: string) => {
    // Preserva as coordenadas existentes ao alterar manualmente o endereço
    // Para modo offline, se não tiver coordenadas, insere coordenadas 0,0
    if (!networkOnline && (!value.latitude || !value.longitude)) {
      onChange({
        ...value,
        address,
        latitude: 0,
        longitude: 0
      });
      console.log("Offline: Preenchendo coordenadas 0,0 para endereço manual");
    } else {
      onChange({
        ...value,
        address,
        // Mantém latitude e longitude existentes se já foram definidos
      });
    }
  };

  const getCurrentLocation = () => {
    setIsGettingLocation(true);
    setLocationError(null);

    // Verificar se está online antes de tentar obter a localização
    if (!networkOnline) {
      setLocationError("Você está offline. Por favor, insira o endereço manualmente.");
      setIsGettingLocation(false);
      return;
    }
    
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
          
          // Tentar obter o endereço usando a API Nominatim (OpenStreetMap)
          let endereco = "";
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
          
          onChange({
            ...value,
            address: endereco,
            latitude: latitude,     // Usa as coordenadas reais
            longitude: longitude,   // Usa as coordenadas reais
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
      {!networkOnline && (
        <div className="bg-amber-50 border-l-4 border-amber-400 p-4 mb-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-amber-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-amber-700">
                Você está offline. A localização automática não está disponível. Por favor, digite o endereço manualmente.
              </p>
            </div>
          </div>
        </div>
      )}

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
        <Label htmlFor="address">
          Endereço
          {!networkOnline && (
            <span className="ml-2 text-amber-600 text-xs font-normal">
              (Digite manualmente)
            </span>
          )}
        </Label>
        <Input
          id="address"
          value={value.address || ""}
          onChange={(e) => handleAddressChange(e.target.value)}
          placeholder={!networkOnline ? "Digite o endereço manualmente (Offline)" : "Digite o endereço completo"}
          className="mt-1"
          // Certifique-se de que o campo não esteja desabilitado
          disabled={false}
        />
        {value.latitude && value.longitude && (
          <p className="text-xs text-muted-foreground mt-1">
            Coordenadas detectadas: Você pode modificar o endereço mantendo as coordenadas
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
          disabled={isGettingLocation || !networkOnline}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          {isGettingLocation 
            ? "Obtendo Localização..." 
            : !networkOnline 
              ? "Indisponível Offline" 
              : "Obter Localização Atual"
          }
        </Button>
        {locationError && (
          <p className="text-sm text-red-500 mt-1">{locationError}</p>
        )}
      </div>
    </div>
  );
}
