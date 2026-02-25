import React, { useState } from 'react';
import { MarketSentiment } from '../types';
import { X, Cpu, Copy, Check, ShieldAlert, Activity, BarChart3, Terminal } from 'lucide-react';

interface NeuralBridgeModalProps {
  isOpen: boolean;
  onClose: () => void;
  sentiment: MarketSentiment | null;
  loading: boolean;
  onGenerate: () => void;
}

export const NeuralBridgeModal: React.FC<NeuralBridgeModalProps> = ({ isOpen, onClose, sentiment, loading, onGenerate }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
      if (sentiment) {
          navigator.clipboard.writeText(JSON.stringify(sentiment, null, 2));
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
      }
  };

  const getRiskColor = (risk: number) => {
      if (risk < 30) return 'text-green-500';
      if (risk < 60) return 'text-yellow-500';
      return 'text-red-500 animate-pulse';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/95 backdrop-blur-md">
      <div className="bg-slate-900 border border-blue-500/30 w-full max-w-3xl rounded-2xl shadow-[0_0_50px_rgba(59,130,246,0.2)] flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-800/50 rounded-t-2xl">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-600/20 rounded-lg border border-blue-500/50">
                    <Cpu size={24} className="text-blue-400" />
                </div>
                <div>
                    <h2 className="text-xl font-black text-white tracking-widest uppercase font-mono">Neural Bridge</h2>
                    <p className="text-xs text-blue-400 font-mono">Conexão TruePress v1.4 -&gt; MetaTrader EA</p>
                </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full text-slate-500 transition">
                <X size={24} />
            </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 text-slate-300">
            {!sentiment && !loading && (
                <div className="text-center py-10 space-y-4">
                    <Activity size={64} className="mx-auto text-slate-700" />
                    <p className="text-slate-400">Nenhum sinal gerado recentemente.</p>
                    <button 
                        onClick={onGenerate}
                        className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg shadow-lg transition-all active:scale-95"
                    >
                        GERAR SINAL DE MERCADO
                    </button>
                </div>
            )}

            {loading && (
                <div className="text-center py-20 space-y-4">
                    <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                    <p className="text-blue-400 font-mono animate-pulse">CALCULANDO SENTIMENTO GLOBAL...</p>
                </div>
            )}

            {sentiment && !loading && (
                <div className="space-y-6">
                    {/* Dashboard Metrics */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 text-center">
                            <span className="text-xs font-bold text-slate-500 uppercase">Risco Global</span>
                            <div className={`text-3xl font-black ${getRiskColor(sentiment.globalRisk)}`}>{sentiment.globalRisk}/100</div>
                        </div>
                        <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 text-center">
                            <span className="text-xs font-bold text-slate-500 uppercase">Foco Principal</span>
                            <div className="text-sm font-bold text-white mt-2 leading-tight">{sentiment.primaryFocus}</div>
                        </div>
                        <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 text-center">
                            <span className="text-xs font-bold text-slate-500 uppercase">Modo EA Sugerido</span>
                            <div className="text-lg font-black text-purple-400 mt-1">{sentiment.suggestedEAMode}</div>
                        </div>
                    </div>

                    {/* Signals List */}
                    <div className="space-y-3">
                        <h3 className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                            <BarChart3 size={14} /> Sinais Ativos
                        </h3>
                        {sentiment.signals.map((sig, idx) => (
                            <div key={idx} className="bg-slate-800/50 p-4 rounded-lg border border-slate-700 flex justify-between items-center">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-white">{sig.asset}</span>
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${sig.sentiment === 'BULLISH' ? 'bg-green-900 text-green-400' : sig.sentiment === 'BEARISH' ? 'bg-red-900 text-red-400' : 'bg-slate-700 text-slate-400'}`}>
                                            {sig.sentiment}
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-500 mt-1">{sig.reason}</p>
                                </div>
                                <div className="text-right">
                                    <div className={`text-xl font-mono font-bold ${sig.score > 0 ? 'text-green-500' : sig.score < 0 ? 'text-red-500' : 'text-slate-500'}`}>
                                        {sig.score > 0 ? '+' : ''}{sig.score}
                                    </div>
                                    <span className="text-[10px] text-slate-600 uppercase">Força</span>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* JSON Export Area */}
                    <div className="relative">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                                <Terminal size={14} /> Payload JSON (Para MQL5)
                            </h3>
                            <button 
                                onClick={handleCopy}
                                className="flex items-center gap-1 text-xs font-bold text-blue-400 hover:text-blue-300 transition"
                            >
                                {copied ? <Check size={14} /> : <Copy size={14} />}
                                {copied ? 'COPIADO' : 'COPIAR CÓDIGO'}
                            </button>
                        </div>
                        <div className="bg-black/50 p-4 rounded-xl border border-slate-800 font-mono text-xs text-green-500 overflow-x-auto">
                            <pre>{JSON.stringify(sentiment, null, 2)}</pre>
                        </div>
                        <p className="text-[10px] text-slate-600 mt-2 text-center">
                            Salve este conteúdo como "sentiment.json" na pasta Files do seu MetaTrader ou envie via WebRequest.
                        </p>
                    </div>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};
