
import React, { useEffect, useRef } from 'react';
import { NewsAnalysis } from '../types';
import { X, TrendingUp, Target, Brain, ShieldAlert, Sparkles, Clock, AlertTriangle, Calendar, User, Globe } from 'lucide-react';

interface NewsModalProps {
  item: NewsAnalysis | null;
  onClose: () => void;
}

export const NewsModal: React.FC<NewsModalProps> = ({ item, onClose }) => {
  const overlayRef = useRef<HTMLDivElement>(null);

  // Fecha ao pressionar ESC
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  if (!item) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (overlayRef.current === e.target) {
      onClose();
    }
  };

  const isCritical = (item.relevanceScore || 0) > 80;

  return (
    <div 
      ref={overlayRef}
      onClick={handleBackdropClick}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6 bg-slate-900/80 backdrop-blur-sm transition-opacity duration-300 animate-in fade-in"
    >
      <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden relative animate-in zoom-in-95 duration-200">
        
        {/* Header Fixo */}
        <div className={`p-6 border-b border-slate-100 flex justify-between items-start shrink-0 ${isCritical ? 'bg-red-50/50' : 'bg-white'}`}>
            <div className="pr-10">
                <div className="flex flex-wrap items-center gap-2 mb-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-slate-100 text-slate-600 rounded flex items-center gap-1">
                        <Globe size={10} /> {item.category || 'Geral'}
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-blue-50 text-blue-600 rounded flex items-center gap-1">
                        <Clock size={10} /> {item.timeframe || 'Recente'}
                    </span>
                    <span className="text-[10px] text-slate-400 flex items-center gap-1">
                        <Calendar size={10} /> {item.dateAdded ? new Date(item.dateAdded).toLocaleDateString() : 'Hoje'}
                    </span>
                    {isCritical && (
                        <span className="text-[10px] font-bold flex items-center gap-1 text-red-600 bg-red-100 px-2 py-0.5 rounded animate-pulse">
                            <AlertTriangle size={10} /> CRÍTICO
                        </span>
                    )}
                </div>
                <h2 className="text-xl md:text-2xl font-black text-slate-900 leading-tight">
                    {item.title}
                </h2>
            </div>
            <button 
                onClick={onClose}
                className="absolute top-4 right-4 p-2 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-500 transition-colors"
            >
                <X size={20} />
            </button>
        </div>

        {/* Conteúdo Rolável */}
        <div className="overflow-y-auto p-6 space-y-6 bg-slate-50/50 custom-scrollbar">
            
            {/* GRID DE ANÁLISE (4 QUADRANTES) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                    <h4 className="flex items-center gap-2 text-xs font-bold text-blue-600 uppercase mb-3 border-b border-slate-100 pb-2">
                        <TrendingUp size={14} /> Narrativa da Mídia
                    </h4>
                    <p className="text-sm text-slate-600 leading-relaxed">{item.narrative || "Sem dados."}</p>
                </div>
                
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                    <h4 className="flex items-center gap-2 text-xs font-bold text-amber-600 uppercase mb-3 border-b border-slate-100 pb-2">
                        <Target size={14} /> Intenção Oculta
                    </h4>
                    <p className="text-sm text-slate-600 leading-relaxed">{item.intent || "Análise indisponível."}</p>
                </div>

                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                    <h4 className="flex items-center gap-2 text-xs font-bold text-purple-600 uppercase mb-3 border-b border-slate-100 pb-2">
                        <Brain size={14} /> Movimentação Real
                    </h4>
                    <p className="text-sm text-slate-600 leading-relaxed">{item.action || "Dados insuficientes."}</p>
                </div>

                <div className="bg-green-50 p-5 rounded-xl border border-green-200 shadow-sm">
                    <h4 className="flex items-center gap-2 text-xs font-bold text-green-700 uppercase mb-3 border-b border-green-200 pb-2">
                        <ShieldAlert size={14} /> A Verdade (Fatos)
                    </h4>
                    <p className="text-sm text-slate-800 font-medium leading-relaxed">{item.truth || "Fatos não verificados."}</p>
                </div>
            </div>

            {/* IMPACTO PESSOAL */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                <h4 className="text-slate-800 text-sm font-bold mb-3 flex items-center gap-2 border-b border-slate-100 pb-2">
                    <User size={16} className="text-blue-500"/> IMPACTO PARA RODRIGO
                </h4>
                <p className="text-slate-700 text-sm leading-relaxed">{item.personalImpact || "Sem impacto direto detectado."}</p>
            </div>

            {/* CENÁRIOS */}
            {item.scenarios && (
                <div>
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 pl-1">Projeção de Cenários</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm border-t-4 border-t-yellow-400">
                            <div className="text-[10px] font-bold text-slate-400 uppercase mb-2">Curto Prazo</div>
                            <p className="text-xs font-medium text-slate-800 mb-3">{item.scenarios?.short?.prediction || 'N/A'}</p>
                            <div className="flex justify-between items-center text-[10px] text-slate-500 border-t border-slate-100 pt-2">
                                <span>Confiança: <b>{item.scenarios?.short?.confidence || 0}%</b></span>
                                <span className="uppercase font-bold">{item.scenarios?.short?.impact || 'N/A'}</span>
                            </div>
                        </div>
                        
                        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm border-t-4 border-t-orange-400">
                            <div className="text-[10px] font-bold text-slate-400 uppercase mb-2">Médio Prazo</div>
                            <p className="text-xs font-medium text-slate-800 mb-3">{item.scenarios?.medium?.prediction || 'N/A'}</p>
                            <div className="flex justify-between items-center text-[10px] text-slate-500 border-t border-slate-100 pt-2">
                                <span>Confiança: <b>{item.scenarios?.medium?.confidence || 0}%</b></span>
                                <span className="uppercase font-bold">{item.scenarios?.medium?.impact || 'N/A'}</span>
                            </div>
                        </div>

                        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm border-t-4 border-t-red-500">
                            <div className="text-[10px] font-bold text-slate-400 uppercase mb-2">Longo Prazo</div>
                            <p className="text-xs font-medium text-slate-800 mb-3">{item.scenarios?.long?.prediction || 'N/A'}</p>
                            <div className="flex justify-between items-center text-[10px] text-slate-500 border-t border-slate-100 pt-2">
                                <span>Confiança: <b>{item.scenarios?.long?.confidence || 0}%</b></span>
                                <span className="uppercase font-bold">{item.scenarios?.long?.impact || 'N/A'}</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* CONSELHO AI */}
            {item.muskAdvice && (
                <div className="p-5 bg-slate-900 text-white rounded-xl shadow-lg relative overflow-hidden group">
                    <div className="absolute -right-4 -top-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Sparkles size={100} />
                    </div>
                    <div className="relative z-10 flex gap-4">
                         <div className="shrink-0 w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700 shadow-inner">
                            <span className="font-mono text-xs font-bold text-blue-400">AI</span>
                         </div>
                         <div>
                            <h4 className="font-mono text-xs text-blue-400 mb-2 tracking-widest uppercase">Perspectiva Estratégica</h4>
                            <p className="font-light italic text-sm text-slate-300 leading-relaxed">"{item.muskAdvice}"</p>
                         </div>
                    </div>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};
