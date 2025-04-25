import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login } = useAuth();
  const { toast } = useToast();
  const [_, setLocation] = useLocation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username || !password) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha o e-mail e a senha",
        variant: "destructive",
      });
      return;
    }
    
    try {
      setIsSubmitting(true);
      await login(username, password);
      toast({
        title: "Login bem-sucedido",
        description: "Bem-vindo de volta!",
      });
      setLocation("/dashboard");
    } catch (error) {
      console.error("Login error:", error);
      toast({
        title: "Erro de autenticação",
        description: "Usuário ou senha inválidos. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-8">
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="pt-6">
          <div className="text-center mb-8">
            <div className="h-16 w-16 bg-primary rounded-full mx-auto mb-4 flex items-center justify-center">
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                className="h-10 w-10 text-white" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              >
                <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-primary">Euro Dent Experts</h1>
            <p className="text-gray-500 mt-1">Sistema de Gestão</p>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="username">Usuário</Label>
              <Input 
                id="username"
                type="text"
                placeholder="Digite seu usuário"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="mt-1"
                autoComplete="username"
              />
            </div>
            
            <div>
              <Label htmlFor="password">Senha</Label>
              <Input 
                id="password"
                type="password"
                placeholder="Digite sua senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1"
                autoComplete="current-password"
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="remember-me" 
                  checked={rememberMe} 
                  onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                />
                <Label htmlFor="remember-me" className="text-sm cursor-pointer">
                  Lembrar-me
                </Label>
              </div>
              
              <a 
                href="#" 
                className="text-sm font-medium text-primary hover:text-primary/80"
                onClick={(e) => {
                  e.preventDefault();
                  toast({
                    title: "Recuperação de senha",
                    description: "Contate o administrador do sistema para redefinir sua senha.",
                  });
                }}
              >
                Esqueceu a senha?
              </a>
            </div>
            
            <Button 
              type="submit" 
              className="w-full py-6" 
              disabled={isSubmitting}
            >
              {isSubmitting ? "Entrando..." : "Entrar"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
