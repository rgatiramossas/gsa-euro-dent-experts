import React, { useState, useEffect } from "react";
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
  const { login, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const [_, setLocation] = useLocation();
  
  // Redirect if already authenticated
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      setLocation("/dashboard");
    }
  }, [isAuthenticated, isLoading, setLocation]);

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
      await login(username, password, rememberMe);
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-900 to-gray-800 px-4 py-8">
      <Card className="w-full max-w-md mx-auto shadow-2xl border-0">
        <CardContent className="pt-8 px-8">
          <div className="text-center mb-8">
            <div className="mx-auto mb-4 flex items-center justify-center">
              <img 
                src="/eurodent-logo.png" 
                alt="Euro Dent Experts Logo" 
                className="h-40 w-auto"
              />
            </div>
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
              className="w-full py-6 bg-red-600 hover:bg-red-700 text-white font-bold text-lg" 
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
