import React from 'react';
import { AiInvestigation } from '../types';
import { Database, Cpu, Activity, TrendingUp, AlertOctagon, Target, Lock } from 'lucide-react';

interface AiInvestigationCardProps {
  item: AiInvestigation;
}

export const AiInvestigationCard: React.FC<AiInvestigationCardProps> = ({ item }) => {
  return (
    <div className="rounded-xl overflow-hidden border border-slate-700 bg-slate-900 shadow-2xl mb-6 relative group">
      {/* Background Matrix Effect (Simulated) */}
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 pointer-events-none"></div>
      <div className="absolute top-0 right-0 p-4 opacity-20 text-blue-500">
        <Cpu size={120} />
      </div>

      {/* Header */}
      <div className="relative p-5 border-b border-slate-700 flex flex-col md:flex-row justify-between items-start gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="bg-blue-600/20 text-blue-400 border border-blue-500/30 px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-widest flex items-center gap-1">
              <Database size={10} /> Data Driven
            </span>
            <span className="bg-purple-600/20 text-purple-400 border border-purple-500/30 px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-widest">
              {item.category}
            </span>
            <span className="text-slate-500 text-[10px] font-mono">{new Date(item.dateAdded).toLocaleDateString()}</span>
          </div>
          <h3 className="text-xl md:text-2xl font-black text-white leading-tight font-sans tracking-tight">
            {item.title}
          </h3>
        </div>
        <div className="flex flex-col items-end">
            <div className="text-[10px] uppercase text-slate-500 font-bold mb-1">Confiança do Modelo</div>
            <div className="text-2xl font-mono font-bold text-green-400">{item.prediction.confidence}%</div>
        </div>
      </div>

      {/* Content Grid */}
      <div className="relative p-5 grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Left: The Anomaly & Findings */}
        <div className="space-y-4">
            <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700/50">
                <h4 className="flex items-center gap-2 text-xs font-bold text-red-400 uppercase mb-2">
                    <AlertOctagon size={14} /> Anomalia Detectada
                </h4>
                <p className="text-sm text-slate-300 font-mono leading-relaxed">
                    "{item.anomalyDetected}"
                </p>
            </div>

            <div>
                <h4 className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase mb-2">
                    <Activity size={14} /> Fatos (Data Mining)
                </h4>
                <p className="text-sm text-slate-200 leading-relaxed">
                    {item.findings}
                </p>
            </div>
            
            <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono mt-2">
                <Database size={12} /> Fontes: {item.dataSources}
            </div>
        </div>

        {/* Right: Prediction & Action */}
        <div className="space-y-4">
             <div className="bg-blue-900/10 p-4 rounded-lg border border-blue-500/20">
                <h4 className="flex items-center gap-2 text-xs font-bold text-blue-400 uppercase mb-2">
                    <TrendingUp size={14} /> Previsão Algorítmica ({item.prediction.horizon})
                </h4>
                <p className="text-sm text-blue-100 font-medium">
                    {item.prediction.forecast}
                </p>
                <div className="mt-2 text-[10px] text-blue-400/60 font-mono">
                    Algoritmo: {item.algorithmUsed}
                </div>
            </div>

            <div className="bg-green-900/10 p-4 rounded-lg border border-green-500/20">
                <h4 className="flex items-center gap-2 text-xs font-bold text-green-400 uppercase mb-2">
                    <Target size={14} /> Ação Recomendada (Rodrigo)
                </h4>
                <p className="text-sm text-green-100">
                    {item.rodrigoAction}
                </p>
            </div>
        </div>
      </div>
      
      <div className="h-1 w-full bg-gradient-to-r from-blue-600 via-purple-600 to-red-600"></div>
    </div>
  );
};