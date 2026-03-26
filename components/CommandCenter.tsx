import React, { useState } from 'react';
import { AIConfig, OllamaModel, CommodityForecast } from '../types';
import { CommodityItem } from './CommodityItem';
import { RagPanel } from './RagPanel';
import { NewsChart } from './NewsChart';
import { NewsAnalysis, IntelligenceReport } from '../types';
import {
  Cloud, Terminal, Zap, Cpu, WifiOff, Lock, ChevronDown, HelpCircle,
  Database, HardDrive, Radar, RefreshCw, Activity, Rocket, X, Command, AlertTriangle, Search
} from 'lucide-react';
import { LayoutDashboard } from 'lucide-react';

interface CommandCenterProps {
  viewMode: 'media' | 'ai' | 'data' | 'ownpress';
  aiConfig: AIConfig;
  setAiConfig: (c: AIConfig) => void;
  loading: boolean;
  isCloudMode: boolean;
  isScraperOnline: boolean;
  isOllamaOnline: boolean | null;
  isHttpsBlock: boolean;
  localModels: OllamaModel[];
  memoryStatus: string | null;
  autoRadar: boolean;
  autoPilotStatus: string;
  toggleAutoRadar: () => void;
  onDeepScan?: () => void;
  onRefreshCommodities: (c: AIConfig) => void;
  commodities: CommodityForecast[];
  ragStatus: any;
  onRagIndex: () => void;
  onRagSearch: (q: string) => Promise<any[]>;
  allNews: NewsAnalysis[];
  externalQuery: string;
  setExternalQuery: (q: string) => void;
  handleDeepAnalysis: () => void;
  handleManualRefresh: () => void;
  setIsNeuralBridgeOpen: (v: boolean) => void;
  queueStats: { pending: number; processing: number; done: number; error: number } | null;
}

export const CommandCenter: React.FC<CommandCenterProps> = ({
  viewMode, aiConfig, setAiConfig, loading, isCloudMode, isScraperOnline,
  isOllamaOnline, isHttpsBlock, localModels, memoryStatus, autoRadar,
  autoPilotStatus, toggleAutoRadar, onDeepScan, onRefreshCommodities, commodities,
  ragStatus, onRagIndex, onRagSearch, allNews, externalQuery, setExternalQuery,
  handleDeepAnalysis, handleManualRefresh, setIsNeuralBridgeOpen, queueStats,
}) => {
  const [showModelMenu, setShowModelMenu] = useState(false);
  const [showOllamaHelp, setShowOllamaHelp] = useState(false);

  const isDark = viewMode === 'ai' || viewMode === 'data';

  const toggleProvider = () => {
    if (aiConfig.provider === 'CLOUD') {
      setAiConfig({ provider: 'LOCAL', modelName: 'llama3:latest' });
    } else {
      setAiConfig({ provider: 'CLOUD', modelName: 'gemini-3-pro-preview' });
    }
  };

  return (
    <aside className={`hidden lg:flex flex-col w-80 border-l h-full overflow-y-auto p-4 shrink-0 ${isDark ? 'bg-slate-900 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-200'}`}>

      {/* HEADER & STATUS */}
      <div className="mb-6">
        <h1 className="font-black text-2xl tracking-tighter text-slate-800 flex items-center gap-2">
          <LayoutDashboard size={24} className="text-blue-600" /> DASHBOARD
        </h1>
        <p className="text-[10px] font-mono uppercase text-slate-500 mb-3 pl-8">Inteligência Privada v4.0</p>

        <div className="flex flex-col gap-2">
          <div className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-bold border transition-all ${isScraperOnline ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-white text-slate-400 border-slate-200 opacity-70'}`}>
            <div className="flex items-center gap-2">
              {isCloudMode ? <Cloud size={14} /> : <Terminal size={14} />}
              <span>{isCloudMode ? 'CLOUD SCRAPER' : 'LOCAL SCRAPER'}</span>
            </div>
            <div className={`w-2 h-2 rounded-full ${isScraperOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`}></div>
          </div>

          <button onClick={toggleProvider} className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-bold transition-all border ${aiConfig.provider === 'CLOUD' ? 'bg-blue-50 text-blue-600 border-blue-200' : 'bg-purple-50 text-purple-600 border-purple-200'}`}>
            <div className="flex items-center gap-2">
              {aiConfig.provider === 'CLOUD' ? <Zap size={14} fill="currentColor" /> : <Cpu size={14} />}
              <span>{aiConfig.provider === 'CLOUD' ? 'GEMINI 3 PRO' : 'LOCAL LLAMA3'}</span>
            </div>
          </button>

          {aiConfig.provider === 'LOCAL' && (
            <div className="relative">
              <div className="flex gap-1">
                <button
                  onClick={() => !isHttpsBlock && setShowModelMenu(!showModelMenu)}
                  className={`flex-1 flex items-center justify-between px-3 py-2 rounded-lg text-xs font-bold transition-all border ${isOllamaOnline === false ? 'bg-white text-slate-400 border-slate-200' : 'bg-white text-slate-700 hover:bg-slate-50 border-slate-300'}`}
                >
                  <div className="flex items-center gap-2">
                    {isOllamaOnline === false && <WifiOff size={12} />}
                    {isHttpsBlock && <Lock size={12} />}
                    <span className="truncate max-w-[140px]">{isOllamaOnline ? aiConfig.modelName : 'Ollama Offline'}</span>
                  </div>
                  <ChevronDown size={12} />
                </button>
                {(isOllamaOnline === false || isHttpsBlock) && (
                  <button onClick={() => setShowOllamaHelp(true)} className="px-2 rounded-lg bg-slate-100 border border-slate-200 text-slate-400 hover:text-slate-600"><HelpCircle size={14} /></button>
                )}
              </div>
              {showModelMenu && !isHttpsBlock && (
                <div className="absolute left-0 right-0 top-full mt-2 bg-white border border-slate-200 shadow-xl rounded-lg py-1 z-30">
                  {localModels.length > 0 ? localModels.map(m => (
                    <button key={m.digest} onClick={() => { setAiConfig({ ...aiConfig, modelName: m.name }); setShowModelMenu(false); }} className="w-full text-left px-4 py-2 text-xs text-slate-700 hover:bg-blue-50 hover:text-blue-600 truncate">
                      {m.name}
                    </button>
                  )) : <div className="px-4 py-2 text-xs text-slate-400 italic">Nenhum modelo detectado.</div>}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* QUEUE STATS */}
      {queueStats && (
        <div className="mb-4 p-3 bg-slate-200/50 rounded-xl border border-slate-200">
          <h3 className="font-black uppercase tracking-widest text-xs text-slate-500 mb-2">Fila RSS</h3>
          <div className="grid grid-cols-3 gap-1 text-center text-[10px] font-bold">
            <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 rounded p-1">
              <div className="text-base font-black">{queueStats.pending}</div>
              <div>Pendente</div>
            </div>
            <div className="bg-green-50 border border-green-200 text-green-700 rounded p-1">
              <div className="text-base font-black">{queueStats.done}</div>
              <div>Prontos</div>
            </div>
            <div className="bg-red-50 border border-red-200 text-red-700 rounded p-1">
              <div className="text-base font-black">{queueStats.error}</div>
              <div>Erros</div>
            </div>
          </div>
        </div>
      )}

      {/* PAINEL TÁTICO */}
      <div className="mb-6 p-3 bg-slate-200/50 rounded-xl border border-slate-200">
        <h3 className="font-black uppercase tracking-widest text-xs text-slate-500 mb-3 flex items-center gap-2">
          <Radar size={12} /> Painel Tático
        </h3>
        <div className="relative mb-2">
          <input
            type="text"
            placeholder="Investigativo (Ex: 'STF')"
            className="w-full pl-8 pr-2 py-2 text-xs rounded border border-red-200 focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none"
            value={externalQuery}
            onChange={(e) => setExternalQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleDeepAnalysis()}
          />
          <Search size={12} className="absolute left-2.5 top-2.5 text-red-400" />
          {externalQuery && (
            <button onClick={handleDeepAnalysis} className="absolute right-1 top-1 bottom-1 px-2 bg-red-500 text-white text-[9px] font-bold rounded uppercase hover:bg-red-600 transition">GO</button>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => setIsNeuralBridgeOpen(true)} className="flex items-center justify-center gap-1 py-2 bg-slate-800 text-blue-400 rounded text-[10px] font-bold hover:bg-slate-700 transition">
            <Cpu size={12} /> EA BRIDGE
          </button>
          <button onClick={handleManualRefresh} disabled={loading} className="flex items-center justify-center gap-1 py-2 bg-blue-600 text-white rounded text-[10px] font-bold hover:bg-blue-700 transition disabled:opacity-50">
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            {loading ? '...' : 'ATUALIZAR'}
          </button>
        </div>
      </div>

      {/* SYSTEM CORE */}
      <div className="mb-4 space-y-2">
        <h3 className="font-black uppercase tracking-widest text-xs text-slate-400 mb-3 flex items-center gap-2">
          <Terminal size={12} /> System Core
        </h3>
        <div className={`p-2 rounded-lg border flex items-center gap-2 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
          <Database size={14} className={memoryStatus?.includes('Vazia') ? 'text-red-500' : 'text-green-500'} />
          <span className="text-[10px] font-bold uppercase truncate max-w-[180px]">{memoryStatus || 'Inicializando...'}</span>
        </div>
        <div className={`p-2 rounded-lg border flex items-center justify-between ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
          <div className="flex items-center gap-2">
            <HardDrive size={14} className="text-blue-500" />
            <span className="text-[10px] font-bold uppercase">Memória L4 (Ativa)</span>
          </div>
          <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"></div>
        </div>
      </div>

      {/* COMMODITIES */}
      <div className="mb-6">
        <h3 className="font-black uppercase tracking-widest text-xs mb-3 flex items-center gap-2 justify-between text-slate-400">
          <span className="flex items-center gap-2"><div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div> Cotações</span>
          <button onClick={() => onRefreshCommodities(aiConfig)} className="p-1 hover:bg-slate-200 rounded transition"><RefreshCw size={12} className={loading ? 'animate-spin' : ''} /></button>
        </h3>
        {commodities && commodities.length > 0 ? (
          <div className={`rounded-xl border p-2 shadow-sm ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
            <div className="space-y-1">
              {commodities.map((c, idx) => <CommodityItem key={idx} c={c} compact={true} />)}
            </div>
          </div>
        ) : (
          <div className="border border-dashed border-slate-300 rounded-xl p-4 text-center cursor-pointer hover:bg-slate-100 transition" onClick={() => onRefreshCommodities(aiConfig)}>
            <AlertTriangle size={24} className="mx-auto text-yellow-500 mb-2" />
            <p className="text-[10px] font-bold text-slate-500">Cotações desatualizadas.</p>
          </div>
        )}
      </div>

      {/* AUTO PILOT */}
      <div className="mb-6">
        <button onClick={toggleAutoRadar} className={`w-full flex flex-col items-start px-3 py-3 rounded-lg border transition-all mb-2 ${autoRadar ? (isDark ? 'bg-green-900/20 border-green-700 text-green-400' : 'bg-green-50 border-green-200 text-green-700') : (isDark ? 'bg-slate-800 border-slate-700 text-slate-500' : 'bg-slate-50 border-slate-200 text-slate-500')}`}>
          <div className="w-full flex items-center justify-between mb-1">
            <span className="text-xs font-bold flex items-center gap-2"><Activity size={14} className={autoRadar ? 'animate-pulse' : ''} /> Piloto Automático</span>
            <div className={`w-8 h-4 rounded-full p-0.5 transition-colors ${autoRadar ? 'bg-green-500' : 'bg-slate-300'}`}>
              <div className={`w-3 h-3 bg-white rounded-full transition-transform ${autoRadar ? 'translate-x-4' : 'translate-x-0'}`}></div>
            </div>
          </div>
          {autoRadar && <span className="text-[9px] font-mono opacity-80">{autoPilotStatus}</span>}
        </button>
        {onDeepScan && (
          <button onClick={onDeepScan} className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-lg shadow-md hover:shadow-lg transition-all hover:scale-[1.02] active:scale-95 group">
            <Rocket size={16} className="group-hover:animate-bounce" />
            <span className="text-xs font-bold">DEEP SCAN (Forçar)</span>
          </button>
        )}
      </div>

      {/* RAG + CHART */}
      <div className="mt-auto">
        <RagPanel status={ragStatus} onIndex={onRagIndex} onSearch={onRagSearch} aiConfig={aiConfig} />
        <NewsChart news={allNews} />
      </div>

      {/* OLLAMA HELP MODAL */}
      {showOllamaHelp && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden border-2 border-red-100">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-red-50">
              <h3 className="font-black text-red-600 flex items-center gap-2">
                {isHttpsBlock ? <Lock size={18} /> : <AlertTriangle size={18} />}
                {isHttpsBlock ? 'BLOQUEIO DE SEGURANÇA (HTTPS)' : 'CONFIGURAÇÃO OLLAMA'}
              </h3>
              <button onClick={() => setShowOllamaHelp(false)} className="p-1 text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>
            <div className="p-6">
              {isHttpsBlock ? (
                <div className="mb-6 bg-red-50 p-4 rounded-lg border border-red-100 text-sm text-slate-700">
                  <p className="font-bold text-red-700 mb-2">Site rodando na Nuvem (HTTPS).</p>
                  <p className="font-bold underline">Para usar Ollama Local, baixe e rode localmente (npm run dev).</p>
                </div>
              ) : (
                <p className="text-sm text-slate-600 mb-4">Reinicie o Ollama com permissões CORS:</p>
              )}
              <div className="bg-slate-900 rounded-lg p-3">
                <div className="text-[10px] text-slate-400 font-bold uppercase mb-2 flex items-center gap-1"><Command size={10} /> Windows (CMD)</div>
                <code className="block text-xs font-mono text-green-400 bg-black/50 p-2 rounded border border-slate-700 select-all">
                  taskkill /F /IM ollama.exe 2&gt;NUL &amp; set OLLAMA_ORIGINS=* &amp; ollama serve
                </code>
              </div>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};
