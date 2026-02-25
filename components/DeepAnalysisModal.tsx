import React, { useRef } from 'react';
import { ExternalAnalysisResult } from '../types';
import { X, TrendingUp, TrendingDown, Eye, AlertTriangle, Scale, Skull } from 'lucide-react';

interface DeepAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  loading: boolean;
  result: ExternalAnalysisResult | null;
  query: string;
}

export const DeepAnalysisModal: React.FC<DeepAnalysisModalProps> = ({ isOpen, onClose, loading, result, query }) => {
  const overlayRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (overlayRef.current === e.target) {
        onClose();
    }
  };

  return (
    <div 
        ref={overlayRef}
        onClick={handleBackdropClick}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-md"
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto relative flex flex-col">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-200 bg-slate-50 flex justify-between items-start sticky top-0 z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
                <span className="bg-red-600 text-white text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider animate-pulse">Modo Investigativo</span>
                <span className="text-slate-500 text-xs font-mono uppercase">Auditoria de Narrativa</span>
            </div>
            <h2 className="text-2xl font-black text-slate-800 leading-tight">
                {loading ? 'Rastreando Conexões Ocultas...' : 'Dossiê de Verdade'}
            </h2>
            <p className="text-sm text-slate-500 mt-1 font-mono">
                Alvo: "{query}"
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition">
            <X size={24} className="text-slate-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 md:p-8 flex-1">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-6">
                <div className="relative">
                    <div className="w-20 h-20 border-4 border-slate-200 border-t-red-600 rounded-full animate-spin"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <Skull className="text-red-600 animate-pulse" size={24} />
                    </div>
                </div>
                <div className="text-center space-y-2">
                    <p className="font-bold text-slate-700 animate-pulse">COMPARANDO PADRÕES DITATORIAIS...</p>
                    <p className="text-xs text-slate-400 font-mono">Verificando "Cui Bono" • Cruzando dados J&F/China/STF</p>
                </div>
            </div>
          ) : result ? (
            <div className="space-y-8">
                
                {/* 1. Hidden Truth */}
                <div className="bg-slate-900 text-slate-200 p-6 rounded-xl border-l-4 border-blue-500 shadow-lg">
                    <h3 className="flex items-center gap-2 text-blue-400 font-black uppercase tracking-widest text-sm mb-3">
                        <Eye size={18} /> A Realidade Oculta
                    </h3>
                    <p className="text-lg leading-relaxed font-light">{result.hiddenTruth}</p>
                </div>

                {/* 2. Corruption & Authoritarianism Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Corruption Trace */}
                    <div className="bg-amber-50 p-6 rounded-xl border border-amber-200">
                         <h3 className="flex items-center gap-2 text-amber-700 font-black uppercase tracking-widest text-sm mb-4">
                            <Scale size={18} /> Rastreio de Capital (Estilo J&F)
                        </h3>
                        <p className="text-sm text-slate-800 italic leading-relaxed">
                            "{result.corruptionTrace}"
                        </p>
                    </div>

                    {/* Authoritarian Meter */}
                    <div className="bg-red-50 p-6 rounded-xl border border-red-200">
                         <h3 className="flex items-center gap-2 text-red-700 font-black uppercase tracking-widest text-sm mb-4">
                            <Skull size={18} /> Paralelo Ditatorial
                        </h3>
                        {result.authoritarianSimilarity ? (
                        <>
                            <div className="flex items-center justify-between mb-3 bg-white p-2 rounded shadow-sm">
                                <span className="text-xs font-bold text-slate-500 uppercase">País Similar</span>
                                <span className="text-sm font-black text-red-800">{result.authoritarianSimilarity?.country || 'N/A'}</span>
                            </div>
                            <div className="flex items-center justify-between mb-3 bg-white p-2 rounded shadow-sm">
                                <span className="text-xs font-bold text-slate-500 uppercase">Risco de Liberdade</span>
                                <span className={`text-sm font-black px-2 py-0.5 rounded ${result.authoritarianSimilarity?.riskLevel === 'Crítico' ? 'bg-red-600 text-white' : 'text-red-800'}`}>
                                    {result.authoritarianSimilarity?.riskLevel || 'Desc.'}
                                </span>
                            </div>
                            <p className="text-xs text-slate-700 mt-2">
                                <span className="font-bold">Mecanismo Copiado:</span> {result.authoritarianSimilarity?.mechanism || 'N/A'}
                            </p>
                        </>
                        ) : (
                            <div className="flex items-center justify-center h-20">
                                <p className="text-xs text-slate-500 italic text-center">Dados insuficientes para análise comparativa de risco ditatorial.</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Winners */}
                    <div className="bg-green-50 p-6 rounded-xl border border-green-100">
                        <h3 className="flex items-center gap-2 text-green-700 font-black uppercase tracking-widest text-sm mb-4">
                            <TrendingUp size={18} /> Quem Ganha (Cui Bono)
                        </h3>
                        <ul className="space-y-4">
                            {result.winners?.map((w, i) => (
                                <li key={i} className="bg-white p-3 rounded shadow-sm">
                                    <div className="font-bold text-green-800 text-sm">{w.name}</div>
                                    <div className="text-slate-600 text-xs mt-1">{w.gain}</div>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Losers */}
                    <div className="bg-red-50 p-6 rounded-xl border border-red-100">
                        <h3 className="flex items-center gap-2 text-red-700 font-black uppercase tracking-widest text-sm mb-4">
                            <TrendingDown size={18} /> Quem Perde
                        </h3>
                        <ul className="space-y-4">
                            {result.losers?.map((l, i) => (
                                <li key={i} className="bg-white p-3 rounded shadow-sm">
                                    <div className="font-bold text-red-800 text-sm">{l.name}</div>
                                    <div className="text-slate-600 text-xs mt-1">{l.loss}</div>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                {/* Manipulators */}
                <div className="bg-slate-100 p-6 rounded-xl border border-slate-200">
                    <h3 className="flex items-center gap-2 text-slate-700 font-black uppercase tracking-widest text-sm mb-4">
                        <AlertTriangle size={18} /> Agentes de Manipulação
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {result.manipulators?.map((m, i) => (
                            <div key={i} className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-slate-400">
                                <div className="font-bold text-slate-800">{m.agent}</div>
                                <div className="text-xs text-slate-500 uppercase font-bold mt-1 mb-2">Método: {m.method}</div>
                                <p className="text-sm text-slate-700 italic">"{m.motive}"</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Conclusion */}
                <div className="border-t border-slate-200 pt-6">
                    <h3 className="text-slate-400 font-bold uppercase text-xs mb-2">Conclusão Estratégica</h3>
                    <p className="text-slate-700 text-sm md:text-base leading-relaxed">{result.conclusion}</p>
                </div>

            </div>
          ) : (
            <div className="text-center text-slate-400 py-10">
                Sem dados para exibir.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};