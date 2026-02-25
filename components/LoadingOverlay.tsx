import React, { useEffect, useState } from 'react';
import { Cpu, Database, Timer } from 'lucide-react';

interface LoadingOverlayProps {
  isVisible: boolean;
  progress: number; // 0 to 100
  taskName: string;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ isVisible, progress, taskName }) => {
  const [log, setLog] = useState<string>("Iniciando conexão segura...");
  const [elapsed, setElapsed] = useState(0);

  // Reset timer when visibility changes
  useEffect(() => {
    if (isVisible) {
      setElapsed(0);
      const timer = setInterval(() => {
        setElapsed(prev => prev + 0.1);
      }, 100);
      return () => clearInterval(timer);
    }
  }, [isVisible]);

  // Simulate technical logs based on progress percentage
  useEffect(() => {
    if (progress < 10) setLog("Estabelecendo handshake criptografado...");
    else if (progress < 25) setLog("Conectando à rede neural (Gemini 2.5)...");
    else if (progress < 40) setLog("Minerando fontes de dados primárias...");
    else if (progress < 60) setLog("Cruzando narrativas vs fatos (Grounding)...");
    else if (progress < 80) setLog("Calculando impacto financeiro e projeções...");
    else if (progress < 95) setLog("Formatando relatório de inteligência...");
    else setLog("Finalizando processamento...");
  }, [progress]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/95 backdrop-blur-sm transition-opacity duration-300">
      <div className="w-full max-w-md p-8 relative overflow-hidden">
        
        {/* Background glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-blue-600/20 blur-[100px] rounded-full pointer-events-none"></div>

        {/* Icon Animation */}
        <div className="flex justify-center mb-8 relative">
           <div className="relative z-10 bg-slate-800 p-5 rounded-2xl border border-slate-700 shadow-2xl ring-1 ring-white/10">
             <Cpu size={48} className="text-blue-500 animate-spin-slow" />
           </div>
        </div>

        {/* Text Info */}
        <div className="text-center mb-8">
            <h2 className="text-2xl font-black text-white tracking-widest uppercase mb-2 font-mono">
                PROCESSANDO
            </h2>
            <p className="text-sm text-blue-400 font-mono font-bold animate-pulse">
                {taskName}
            </p>
        </div>

        {/* Progress Bar Container */}
        <div className="relative h-4 bg-slate-800 rounded-full overflow-hidden mb-2 shadow-inner border border-slate-700">
            {/* Striped Background */}
            <div className="absolute inset-0 opacity-20 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.1)_25%,rgba(255,255,255,0.1)_50%,transparent_50%,transparent_75%,rgba(255,255,255,0.1)_75%,rgba(255,255,255,0.1)_100%)] bg-[length:20px_20px] animate-[spin_3s_linear_infinite]"></div>
            
            <div 
                className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-600 via-cyan-500 to-blue-400 transition-all duration-300 ease-out shadow-[0_0_15px_rgba(59,130,246,0.6)]"
                style={{ width: `${progress}%` }}
            ></div>
        </div>

        {/* Stats Row */}
        <div className="flex justify-between items-end text-xs font-mono mb-8">
            <div className="text-slate-400 flex flex-col gap-1">
                <span className="flex items-center gap-1.5 text-slate-500">
                    <Database size={10} /> STATUS
                </span>
                <span className="text-blue-300">{log}</span>
            </div>
            <div className="text-right flex flex-col gap-1 items-end">
                 <span className="flex items-center gap-1.5 text-slate-500">
                    <Timer size={10} /> TEMPO
                </span>
                <span className="text-white font-bold text-lg leading-none">
                    {elapsed.toFixed(1)}s
                </span>
            </div>
        </div>

        {/* Tech Decor */}
        <div className="flex justify-between opacity-30">
            <div className="flex gap-1">
                <div className="w-1 h-1 bg-slate-500 rounded-full"></div>
                <div className="w-1 h-1 bg-slate-500 rounded-full"></div>
                <div className="w-1 h-1 bg-slate-500 rounded-full"></div>
            </div>
            <div className="text-[9px] text-slate-600 font-mono">
                TRUE PRESS AI // v1.4.3
            </div>
        </div>
      </div>
    </div>
  );
};