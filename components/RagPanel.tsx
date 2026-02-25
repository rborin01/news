import React, { useState, useEffect } from 'react';
import { Database, Search, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import { RagSearchResult, RagIndexStatus, AIConfig } from '../types';

interface RagPanelProps {
  status: RagIndexStatus;
  onIndex: () => void;
  onSearch: (query: string) => Promise<RagSearchResult[]>;
  aiConfig: AIConfig;
}

export const RagPanel: React.FC<RagPanelProps> = ({ status, onIndex, onSearch, aiConfig }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<RagSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setIsSearching(true);
    try {
      const res = await onSearch(query);
      setResults(res);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSearching(false);
    }
  };

  const progress = status.totalNews > 0 ? Math.round((status.indexedDocs / status.totalNews) * 100) : 0;

  return (
    <div className="mb-6 p-3 bg-slate-900 rounded-xl border border-slate-700 text-slate-300">
      <div 
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setIsOpen(!isOpen)}
      >
        <h3 className="font-black uppercase tracking-widest text-xs flex items-center gap-2 text-blue-400">
          <Database size={14} /> Memória RAG
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono bg-slate-800 px-2 py-1 rounded">
            {status.indexedDocs}/{status.totalNews} ({progress}%)
          </span>
          {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </div>
      </div>

      {isOpen && (
        <div className="mt-4 space-y-4">
          <div className="flex items-center justify-between bg-slate-800 p-2 rounded-lg border border-slate-700">
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-bold text-slate-400">Status do Índice</span>
              <span className="text-xs font-mono text-emerald-400">
                {status.isIndexing ? 'Indexando...' : 'Pronto'}
              </span>
            </div>
            <button 
              onClick={onIndex}
              disabled={status.isIndexing || status.indexedDocs >= status.totalNews}
              className="flex items-center gap-1 px-2 py-1 bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded text-[10px] font-bold hover:bg-blue-600/40 disabled:opacity-50 transition"
            >
              <RefreshCw size={10} className={status.isIndexing ? 'animate-spin' : ''} />
              Sincronizar
            </button>
          </div>

          <div className="relative">
            <input 
              type="text" 
              placeholder="Busca semântica profunda..." 
              className="w-full pl-8 pr-2 py-2 text-xs rounded border border-slate-700 bg-slate-800 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
            <Search size={12} className="absolute left-2.5 top-2.5 text-slate-400" />
            <button 
              onClick={handleSearch} 
              disabled={isSearching || !query.trim()}
              className="absolute right-1 top-1 bottom-1 px-2 bg-blue-600 text-white text-[9px] font-bold rounded uppercase hover:bg-blue-700 transition disabled:opacity-50"
            >
              {isSearching ? '...' : 'BUSCAR'}
            </button>
          </div>

          {results.length > 0 && (
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
              {results.map((res, idx) => (
                <div key={idx} className="p-2 bg-slate-800 rounded border border-slate-700">
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-[10px] font-bold text-blue-300 truncate pr-2">{res.title}</span>
                    <span className="text-[9px] font-mono bg-slate-900 px-1 rounded text-emerald-400 shrink-0">
                      {(res.score * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-900 h-1 rounded-full mb-1 overflow-hidden">
                    <div 
                      className="bg-emerald-500 h-full" 
                      style={{ width: `${Math.max(0, Math.min(100, res.score * 100))}%` }}
                    ></div>
                  </div>
                  <div className="text-[9px] text-slate-400 flex justify-between">
                    <span>{res.category}</span>
                    <span>{new Date(res.date).toLocaleDateString('pt-BR')}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
