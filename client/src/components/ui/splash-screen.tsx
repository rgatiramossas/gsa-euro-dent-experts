import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface SplashScreenProps {
  onFinish: () => void;
  minDisplayTime?: number;
}

const messages = [
  "Sincronizando dados...",
  "Preparando ambiente...",
  "Carregando suas informações...",
  "Verificando updates...",
  "Iniciando aplicativo..."
];

export const SplashScreen: React.FC<SplashScreenProps> = ({ 
  onFinish, 
  minDisplayTime = 2500 // Tempo mínimo de exibição em ms
}) => {
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isPreparing, setIsPreparing] = useState(true);
  
  useEffect(() => {
    // Timer para avançar mensagens e barra de progresso
    const messageDuration = minDisplayTime / (messages.length + 1);
    
    const messageInterval = setInterval(() => {
      setCurrentMessageIndex(prev => {
        if (prev >= messages.length - 1) {
          clearInterval(messageInterval);
          return prev;
        }
        return prev + 1;
      });
    }, messageDuration);
    
    // Animação suave da barra de progresso
    const interval = 50; // 50ms por incremento
    const increment = 100 / (minDisplayTime / interval);
    
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          // Quando atingir 100%, aguarde um pouco e finalize
          setTimeout(() => {
            setIsPreparing(false);
            setTimeout(onFinish, 500); // Pequeno atraso após a animação de saída
          }, 300);
          return 100;
        }
        return Math.min(prev + increment, 100);
      });
    }, interval);
    
    // Cleanup timers
    return () => {
      clearInterval(messageInterval);
      clearInterval(progressInterval);
    };
  }, [minDisplayTime, onFinish]);
  
  return (
    <AnimatePresence>
      {isPreparing && (
        <motion.div 
          className="fixed inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-gray-900 to-gray-800 z-50"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex flex-col items-center justify-center p-8 max-w-md">
            <motion.img 
              src="/eurodent-logo.png" 
              alt="Euro Dent Experts" 
              className="h-40 w-auto mb-8"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5 }}
            />
            
            <motion.div 
              className="w-full h-2 bg-gray-700 rounded-full mb-4 overflow-hidden"
              initial={{ width: 0 }}
              animate={{ width: "100%" }}
              transition={{ duration: 0.5 }}
            >
              <motion.div 
                className="h-full bg-red-600 rounded-full"
                initial={{ width: "0%" }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3 }}
              />
            </motion.div>
            
            <AnimatePresence mode="wait">
              <motion.p 
                key={currentMessageIndex}
                className="text-white text-lg text-center h-8"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
              >
                {messages[currentMessageIndex]}
              </motion.p>
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};