import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

export default function NotFound() {
  const [_, setLocation] = useLocation();
  
  const goToHome = () => {
    setLocation("/dashboard");
  };
  
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md mx-4">
        <CardContent className="pt-6">
          <div className="flex mb-4 gap-2 items-center">
            <AlertCircle className="h-8 w-8 text-red-500" />
            <h1 className="text-2xl font-bold text-gray-900">404 - Página não encontrada</h1>
          </div>

          <p className="mt-4 text-sm text-gray-600">
            A página que você está procurando não existe ou foi movida.
          </p>
          
          <div className="mt-6">
            <Button onClick={goToHome} className="w-full">
              Voltar para o Dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
