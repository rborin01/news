
import React, { useState, useMemo, useEffect } from 'react';
import { IntelligenceReport, NewsAnalysis, ExternalAnalysisResult, AiInvestigation, MarketSentiment, RawDataResult, DEFAULT_CATEGORIES, AIConfig, OllamaModel } from '../types';
import { generateDeepAnalysis, generateMarketSentiment } from '../services/geminiService';
import { getAllRawData } from '../db';
import { NewsCard } from './NewsCard';
import { NewsModal } from './NewsModal'; 
import { AiInvestigationCard } from './AiInvestigationCard';
import { RawDataCard } from './RawDataCard';
import { CommodityItem } from './CommodityItem';
import { DeepAnalysisModal } from './DeepAnalysisModal';
import { NeuralBridgeModal } from './NeuralBridgeModal';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { NewsChart } from './NewsChart'; // NOVO COMPONENTE
import { RagPanel } from './RagPanel';
import { checkOllamaHealth, fetchLocalModels } from '../services/ollamaService';
import { checkPythonHealth } from '../services/pythonBridge';
import { Globe, Newspaper, Bot, RefreshCw, Filter, AlertCircle, Database, FileSpreadsheet, HardDrive, Activity, Rocket, Sparkles, Cloud, Terminal, AlertTriangle, Radar, Search, Cpu, Zap, WifiOff, ChevronDown, LayoutDashboard, HelpCircle, X, Command, Lock, Share2, Check } from 'lucide-react';

interface DashboardProps {
  data: IntelligenceReport | null;
  allNews: NewsAnalysis[]; 
  allInvestigations: AiInvestigation[];
  loading: boolean;
  error?: string | null;
  memoryStatus?: string | null;
  onRefreshNews: (topic: string, aiConfig: AIConfig) => void;
  onRefreshInvest: (topic: string, aiConfig: AIConfig) => void;
  onRefreshCommodities: (aiConfig: AIConfig) => void;
  onUpdateSummary: () => void;
  autoRadar: boolean;
  toggleAutoRadar: () => void;
  autoPilotStatus: string;
  onDeepScan?: () => void;
  onOpenSystemMonitor: () => void;
  onDataImported: (news: NewsAnalysis[], report?: IntelligenceReport) => void;
  aiConfig: AIConfig;
  setAiConfig: (c: AIConfig) => void;
  ragStatus: any;
  onRagIndex: () => void;
  onRagSearch: (query: string) => Promise<any[]>;
}

export const Dashboard: React.FC<DashboardProps> = ({ 
    data, allNews, allInvestigations, loading, error, memoryStatus,
    onRefreshNews, onRefreshInvest, onRefreshCommodities, onUpdateSummary,
    autoRadar, toggleAutoRadar, autoPilotStatus, onDeepScan, onOpenSystemMonitor,
    onDataImported,
    aiConfig, setAiConfig,
    ragStatus, onRagIndex, onRagSearch
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');
  const [viewMode, setViewMode] = useState<'media' | 'ai' | 'data'>('media');
  const [searchQuery, setSearchQuery] = useState(''); // Filtro Interno
  const [externalQuery, setExternalQuery] = useState(''); 
  const [topicFocus, setTopicFocus] = useState(''); 
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const [minPersonalRelevance, setMinPersonalRelevance] = useState(0);
  const [minNationalRelevance, setMinNationalRelevance] = useState(0);
  const [relevanceMode, setRelevanceMode] = useState<'personal' | 'national'>('personal');
  const [speaking, setSpeaking] = useState(false);
  const [selectedNews, setSelectedNews] = useState<NewsAnalysis | null>(null); 
  const [isAnalysisModalOpen, setIsAnalysisModalOpen] = useState(false);
  const [isNeuralBridgeOpen, setIsNeuralBridgeOpen] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGeneratingSignal, setIsGeneratingSignal] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<ExternalAnalysisResult | null>(null);
  const [marketSentiment, setMarketSentiment] = useState<MarketSentiment | null>(data?.lastSentiment || null);
  const [rawDataList, setRawDataList] = useState<RawDataResult[]>(data?.rawData || []);
  const [copiedShare, setCopiedShare] = useState(false);

  // System Status
  const [localModels, setLocalModels] = useState<OllamaModel[]>([]);
  const [isOllamaOnline, setIsOllamaOnline] = useState<boolean | null>(null);
  const [isScraperOnline, setIsScraperOnline] = useState<boolean>(false);
  const [isCloudMode, setIsCloudMode] = useState<boolean>(false);
  const [isHttpsBlock, setIsHttpsBlock] = useState<boolean>(false); // NOVO: Detecção de HTTPS
  const [showModelMenu, setShowModelMenu] = useState(false);
  const [showOllamaHelp, setShowOllamaHelp] = useState(false);

  useEffect(() => {
      getAllRawData().then(setRawDataList);
  }, []);

  useEffect(() => {
      // Detecção de ambiente
      const isHttps = window.location.protocol === 'https:';
      const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      setIsHttpsBlock(isHttps && !isLocalhost); 
      setIsCloudMode(!isLocalhost);

      // Verificações silenciosas em background
      const refreshSystems = async () => {
          const ollamaOk = await checkOllamaHealth();
          setIsOllamaOnline(ollamaOk);
          if (ollamaOk) {
              const models = await fetchLocalModels();
              setLocalModels(models);
          }
          const scraperOk = await checkPythonHealth();
          setIsScraperOnline(scraperOk);
      };
      refreshSystems();
      const interval = setInterval(refreshSystems, 30000); // Check menos frequente
      return () => clearInterval(interval);
  }, []);

  const toggleProvider = () => {
      // Force toggle (mesmo se falhar local, permite tentar)
      if (aiConfig.provider === 'CLOUD') {
          setAiConfig({ provider: 'LOCAL', modelName: 'llama3:latest' });
      } else {
          setAiConfig({ provider: 'CLOUD', modelName: 'gemini-3-pro-preview' });
      }
  };

  const categories = useMemo(() => {
    const loadedCats = new Set(allNews.filter(n => n && n.category).map(n => n.category));
    DEFAULT_CATEGORIES.forEach(c => loadedCats.add(c));
    return ['Todos', ...Array.from(loadedCats)];
  }, [allNews]);

  const filteredNews = useMemo(() => {
    let result = allNews;
    if (selectedCategory !== 'Todos') result = result.filter(item => item.category && (item.category.includes(selectedCategory) || selectedCategory.includes(item.category)));
    if (searchQuery) result = result.filter(item => (item.title && item.title.toLowerCase().includes(searchQuery.toLowerCase())) || (item.narrative && item.narrative.toLowerCase().includes(searchQuery.toLowerCase())));
    result = result.filter(item => (item.relevanceScore || 0) >= minPersonalRelevance && (item.nationalRelevance || 0) >= minNationalRelevance);
    return result.sort((a, b) => relevanceMode === 'personal' ? (b.relevanceScore || 0) - (a.relevanceScore || 0) : (b.nationalRelevance || 0) - (a.nationalRelevance || 0));
  }, [allNews, selectedCategory, searchQuery, minPersonalRelevance, minNationalRelevance, relevanceMode]);

  const filteredInvestigations = useMemo(() => {
      let result = allInvestigations;
      if (searchQuery) result = result.filter(item => item.title.toLowerCase().includes(searchQuery.toLowerCase()) || item.findings.toLowerCase().includes(searchQuery.toLowerCase()));
      return result.sort((a,b) => new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime());
  }, [allInvestigations, searchQuery]);

  const handleDeepAnalysis = async () => {
      if (!externalQuery) return;
      setIsAnalysisModalOpen(true);
      setIsAnalyzing(true);
      try {
        const result = await generateDeepAnalysis(externalQuery, aiConfig);
        setAnalysisResult(result);
      } catch (e) { console.error(e); alert("Erro ao realizar análise profunda."); setIsAnalysisModalOpen(false); } finally { setIsAnalyzing(false); }
  };

  const handleGenerateSignal = async () => {
      setIsGeneratingSignal(true);
      try {
          const context = allNews.slice(0, 15).map(n => `${n.title}: ${n.truth}`).join('\n');
          const sentiment = await generateMarketSentiment(context, aiConfig);
          setMarketSentiment(sentiment);
      } catch (e) { console.error(e); alert("Erro ao gerar sinais."); } finally { setIsGeneratingSignal(false); }
  };

  const handleManualRefresh = () => {
      if (viewMode === 'media') onRefreshNews(topicFocus || 'Geral', aiConfig);
      else if (viewMode === 'ai') onRefreshInvest(topicFocus || 'Anomalias', aiConfig);
      else handleDeepAnalysis();
  };

  const toggleSpeech = (text: string) => {
    if (speaking) { window.speechSynthesis.cancel(); setSpeaking(false); }
    else { const u = new SpeechSynthesisUtterance(text); u.lang = 'pt-BR'; u.rate = 1.1; window.speechSynthesis.speak(u); setSpeaking(true); }
  };

  const handleShare = () => {
    if (!data) return;
    const date = new Date().toLocaleDateString('pt-BR');
    const topNews = allNews.slice(0, 5).map(n => `🚨 *${n.title}*\n> ${n.truth}`).join('\n\n');
    const text = `*TRUE PRESS INTELLIGENCE* - ${date}\n\n*RESUMO EXECUTIVO:*\n${data.summary}\n\n*TOP DESTAQUES:*\n${topNews}\n\n_Gerado por IA Privada._`;
    
    navigator.clipboard.writeText(text);
    setCopiedShare(true);
    setTimeout(() => setCopiedShare(false), 3000);
  };

  return (
    <div className={`flex min-h-screen ${viewMode === 'ai' || viewMode === 'data' ? 'bg-slate-950' : 'bg-[#f8fafc]'} transition-colors duration-500`}>
      <Sidebar 
        categories={categories}
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
        onGenerateEmail={() => {}}
        totalNews={allNews.length}
        minPersonalRelevance={minPersonalRelevance}
        setMinPersonalRelevance={setMinPersonalRelevance}
        minNationalRelevance={minNationalRelevance}
        setMinNationalRelevance={setMinNationalRelevance}
        setRelevanceMode={setRelevanceMode}
        onOpenSystemMonitor={onOpenSystemMonitor}
        onDataImported={onDataImported}
      />

      <main className="flex-1 md:ml-64 flex flex-col lg:flex-row h-screen overflow-hidden">
        {/* ÁREA PRINCIPAL */}
        <div className="flex-1 flex flex-col h-full overflow-hidden relative">
            <Header 
                toggleMobileMenu={() => setMobileMenuOpen(!mobileMenuOpen)}
                aiConfig={aiConfig}
                setAiConfig={setAiConfig}
            />

            {error && <div className="bg-red-50 border-b border-red-200 p-3 flex items-center gap-2 text-red-700 text-sm font-bold"><AlertCircle size={18} /> {error}</div>}
            
            {/* TOP BAR: VIEW TOGGLES & SEARCH FILTER */}
            <div className={`px-6 py-4 border-b flex flex-wrap gap-4 items-center justify-between ${viewMode === 'ai' || viewMode === 'data' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                
                {/* View Toggles */}
                <div className="flex bg-slate-200/50 p-1 rounded-lg w-fit">
                    <button onClick={() => setViewMode('media')} className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-bold transition-all ${viewMode === 'media' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}><Newspaper size={16} /> PRESS WATCH</button>
                    <button onClick={() => setViewMode('ai')} className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-bold transition-all ${viewMode === 'ai' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}><Bot size={16} /> AI ORIGINALS</button>
                    <button onClick={() => setViewMode('data')} className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-bold transition-all ${viewMode === 'data' ? 'bg-slate-800 text-emerald-400 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}><FileSpreadsheet size={16} /> DATA ROOM</button>
                </div>

                {/* FILTRO BASE INTERNA (MOVED HERE) */}
                <div className="relative flex-1 max-w-md">
                    <input 
                        type="text" 
                        placeholder="Filtrar base interna..." 
                        className={`w-full pl-9 pr-4 py-2 text-sm rounded-lg border focus:ring-2 focus:ring-blue-500 outline-none transition-all ${
                            viewMode === 'ai' || viewMode === 'data' 
                            ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500 focus:border-blue-500' 
                            : 'bg-slate-50 border-slate-300 text-slate-800 placeholder-slate-400 focus:border-blue-500'
                        }`}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    <Filter size={16} className={`absolute left-3 top-2.5 ${viewMode === 'ai' || viewMode === 'data' ? 'text-slate-500' : 'text-slate-400'}`} />
                </div>

            </div>

            <div className={`flex-1 overflow-y-auto p-4 md:p-8 scroll-smooth ${viewMode === 'ai' || viewMode === 'data' ? 'bg-slate-950 text-slate-200' : ''}`}>
                <div className="w-full max-w-[1800px] mx-auto">
                    {viewMode === 'media' && (
                        <>
                            {/* Executive Summary */}
                            {data?.summary && (
                                <div className="mb-8 p-6 bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl shadow-xl text-white relative overflow-hidden group">
                                     <div className="absolute top-0 right-0 p-4 opacity-10"><Globe size={100} /></div>
                                     <div className="relative z-10">
                                        <div className="flex justify-between items-start mb-4">
                                            <h2 className="text-xl font-black uppercase tracking-widest text-blue-400">Resumo Executivo</h2>
                                            <div className="flex gap-2">
                                                <button 
                                                    onClick={handleShare}
                                                    className={`flex items-center gap-2 px-3 py-1 border rounded-full text-xs font-bold transition ${copiedShare ? 'bg-green-500 text-white border-green-500' : 'bg-white/10 hover:bg-white/20 border-white/20 text-white'}`}
                                                >
                                                    {copiedShare ? <Check size={12} /> : <Share2 size={12} />}
                                                    {copiedShare ? 'COPIADO!' : 'COMPARTILHAR'}
                                                </button>
                                                <button 
                                                    onClick={onUpdateSummary}
                                                    disabled={loading}
                                                    className="flex items-center gap-2 px-3 py-1 bg-blue-600/20 hover:bg-blue-600/40 border border-blue-500/50 rounded-full text-xs font-bold transition text-blue-300 disabled:opacity-50"
                                                >
                                                    <Sparkles size={12} />
                                                    ATUALIZAR
                                                </button>
                                                <button onClick={() => toggleSpeech(data.summary)} className="flex items-center gap-2 px-3 py-1 bg-white/10 hover:bg-white/20 rounded-full text-xs font-bold transition backdrop-blur-sm">
                                                    {speaking ? 'PARAR' : 'OUVIR'}
                                                </button>
                                            </div>
                                        </div>
                                        <p className="text-slate-300 leading-relaxed text-sm md:text-base font-light">{data.summary}</p>
                                     </div>
                                </div>
                            )}

                            <div className="space-y-6">
                                <div className="flex justify-between items-center mb-2"><h2 className="text-2xl font-bold text-slate-800">{selectedCategory}</h2><span className="text-xs text-slate-400 font-medium">{filteredNews.length} itens</span></div>
                                {filteredNews.length > 0 ? filteredNews.map(item => (
                                    <NewsCard key={item.id} item={item} onClick={() => setSelectedNews(item)} />
                                )) : <div className="text-center py-20 bg-white rounded-xl border border-dashed border-slate-300"><p className="text-slate-400">Sem dados.</p><button onClick={onDeepScan} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded font-bold text-sm">Forçar Varredura</button></div>}
                            </div>
                        </>
                    )}
                    {viewMode === 'ai' && (
                        <div className="space-y-6">
                            <div className="flex items-center gap-2 mb-6"><div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div><h2 className="text-lg font-mono font-bold text-slate-300 uppercase">Investigações (Data Driven)</h2></div>
                            {filteredInvestigations.length > 0 ? filteredInvestigations.map(item => <AiInvestigationCard key={item.id} item={item} />) : <div className="text-center py-20 bg-slate-900 rounded-xl border border-dashed border-slate-700"><Bot size={48} className="mx-auto mb-4 opacity-50 text-slate-500" /><p className="text-slate-400 font-mono">Sem investigações.</p></div>}
                        </div>
                    )}
                    {viewMode === 'data' && (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                                    <h2 className="text-lg font-mono font-bold text-slate-300 uppercase">Arquivos (Auditoria)</h2>
                                </div>
                                <div className="text-xs text-slate-500 font-mono">{rawDataList.length} Dossiês</div>
                            </div>
                            {rawDataList.map(item => <RawDataCard key={item.id} item={item} />)}
                        </div>
                    )}
                </div>
            </div>
        </div>

        {/* SIDEBAR DIREITA: COMMAND CENTER */}
        <aside className={`hidden lg:flex flex-col w-80 border-l h-full overflow-y-auto p-4 shrink-0 ${viewMode === 'ai' || viewMode === 'data' ? 'bg-slate-900 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-200'}`}>
            
            {/* 0. HEADER & STATUS */}
            <div className="mb-6">
                 <h1 className="font-black text-2xl tracking-tighter text-slate-800 flex items-center gap-2">
                    <LayoutDashboard size={24} className="text-blue-600" /> DASHBOARD
                 </h1>
                 <p className="text-[10px] font-mono uppercase text-slate-500 mb-3 pl-8">Inteligência Privada v3.5 (Secure)</p>
                 
                 <div className="flex flex-col gap-2">
                    <div 
                        className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-bold border transition-all ${isScraperOnline ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-white text-slate-400 border-slate-200 opacity-70'}`}
                    >
                        <div className="flex items-center gap-2">
                            {isCloudMode ? <Cloud size={14} /> : <Terminal size={14} />}
                            <span>{isCloudMode ? 'CLOUD SCRAPER' : 'LOCAL SCRAPER'}</span>
                        </div>
                        <div className={`w-2 h-2 rounded-full ${isScraperOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`}></div>
                    </div>

                    <button 
                        onClick={toggleProvider}
                        className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-bold transition-all border ${aiConfig.provider === 'CLOUD' ? 'bg-blue-50 text-blue-600 border-blue-200' : 'bg-purple-50 text-purple-600 border-purple-200'}`}
                    >
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
                                        <span className="truncate max-w-[140px]">{isOllamaOnline ? aiConfig.modelName : "Ollama Offline (Ignorado)"}</span>
                                    </div>
                                    <ChevronDown size={12} />
                                </button>
                                {(isOllamaOnline === false || isHttpsBlock) && (
                                    <button 
                                        onClick={() => setShowOllamaHelp(true)}
                                        className="px-2 rounded-lg bg-slate-100 border border-slate-200 text-slate-400 hover:text-slate-600"
                                        title="Ajuda de Conexão"
                                    >
                                        <HelpCircle size={14} />
                                    </button>
                                )}
                            </div>
                            
                            {showModelMenu && !isHttpsBlock && (
                                <div className="absolute left-0 right-0 top-full mt-2 bg-white border border-slate-200 shadow-xl rounded-lg py-1 z-30">
                                    {localModels.length > 0 ? localModels.map(m => (
                                        <button 
                                            key={m.digest}
                                            onClick={() => { setAiConfig({ ...aiConfig, modelName: m.name }); setShowModelMenu(false); }}
                                            className="w-full text-left px-4 py-2 text-xs text-slate-700 hover:bg-blue-50 hover:text-blue-600 truncate flex items-center justify-between"
                                        >
                                            <span>{m.name}</span>
                                        </button>
                                    )) : (
                                        <div className="px-4 py-2 text-xs text-slate-400 italic">Nenhum modelo detectado.</div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                 </div>
            </div>

            {/* 1. CONTROL CENTER (PAINEL TÁTICO) */}
            <div className="mb-6 p-3 bg-slate-200/50 rounded-xl border border-slate-200">
                <h3 className="font-black uppercase tracking-widest text-xs text-slate-500 mb-3 flex items-center gap-2">
                    <Radar size={12} /> Painel Tático
                </h3>
                
                {/* Busca Investigativa */}
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
                        <button onClick={handleDeepAnalysis} className="absolute right-1 top-1 bottom-1 px-2 bg-red-500 text-white text-[9px] font-bold rounded uppercase hover:bg-red-600 transition">
                            GO
                        </button>
                    )}
                </div>

                {/* Ações Rápidas */}
                <div className="grid grid-cols-2 gap-2">
                     <button 
                        onClick={() => setIsNeuralBridgeOpen(true)}
                        className="flex items-center justify-center gap-1 py-2 bg-slate-800 text-blue-400 rounded text-[10px] font-bold hover:bg-slate-700 transition"
                    >
                        <Cpu size={12} /> EA BRIDGE
                    </button>
                    <button 
                        onClick={handleManualRefresh}
                        disabled={loading}
                        className="flex items-center justify-center gap-1 py-2 bg-blue-600 text-white rounded text-[10px] font-bold hover:bg-blue-700 transition disabled:opacity-50"
                    >
                        <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
                        {loading ? '...' : 'ATUALIZAR'}
                    </button>
                </div>
            </div>

            {/* 2. SYSTEM CORE (L4 MEMORY LAYER) */}
            <div className="mb-4 space-y-2">
                <h3 className="font-black uppercase tracking-widest text-xs text-slate-400 mb-3 flex items-center gap-2">
                    <Terminal size={12} /> System Core
                </h3>
                
                <div className={`p-2 rounded-lg border flex items-center justify-between ${viewMode === 'ai' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                    <div className="flex items-center gap-2">
                        <Database size={14} className={memoryStatus?.includes('Vazia') ? 'text-red-500' : 'text-green-500'} />
                        <span className="text-[10px] font-bold uppercase truncate max-w-[150px]">{memoryStatus || 'Inicializando...'}</span>
                    </div>
                </div>

                <div className={`p-2 rounded-lg border flex items-center justify-between ${viewMode === 'ai' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                    <div className="flex items-center gap-2">
                        <HardDrive size={14} className="text-blue-500" />
                        <span className="text-[10px] font-bold uppercase">Memória L4 (Ativa)</span>
                    </div>
                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"></div>
                </div>
            </div>

            {/* 3. COMMODITIES */}
            <div className="mb-6">
                <h3 className="font-black uppercase tracking-widest text-xs mb-3 flex items-center gap-2 justify-between text-slate-400">
                    <span className="flex items-center gap-2"><div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div> Cotações (MS/SP)</span>
                    <button onClick={() => onRefreshCommodities(aiConfig)} className="p-1 hover:bg-slate-200 rounded transition" title="Forçar Atualização"><RefreshCw size={12} className={loading ? 'animate-spin' : ''} /></button>
                </h3>

                {data?.commodities && data.commodities.length > 0 ? (
                    <div className={`rounded-xl border p-2 shadow-sm ${viewMode === 'ai' || viewMode === 'data' ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                        <div className="space-y-1">
                            {data.commodities.map((c, idx) => (
                                <CommodityItem key={idx} c={c} compact={true} />
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="border border-dashed border-slate-300 rounded-xl p-4 text-center cursor-pointer hover:bg-slate-100 transition" onClick={() => onRefreshCommodities(aiConfig)}>
                        <AlertTriangle size={24} className="mx-auto text-yellow-500 mb-2" />
                        <p className="text-[10px] font-bold text-slate-500">Cotações desatualizadas.</p>
                        <p className="text-[9px] text-blue-500">Clique para buscar preços.</p>
                    </div>
                )}
            </div>

            {/* 4. AUTO PILOT */}
            <div className="mb-6">
                 <button 
                    onClick={toggleAutoRadar}
                    className={`w-full flex flex-col items-start px-3 py-3 rounded-lg border transition-all mb-2 ${
                        autoRadar 
                        ? (viewMode === 'ai' || viewMode === 'data' ? 'bg-green-900/20 border-green-700 text-green-400' : 'bg-green-50 border-green-200 text-green-700')
                        : (viewMode === 'ai' || viewMode === 'data' ? 'bg-slate-800 border-slate-700 text-slate-500' : 'bg-slate-50 border-slate-200 text-slate-500')
                    }`}
                >
                    <div className="w-full flex items-center justify-between mb-1">
                        <span className="text-xs font-bold flex items-center gap-2">
                            <Activity size={14} className={autoRadar ? 'animate-pulse' : ''}/> 
                            Piloto Automático
                        </span>
                         <div className={`w-8 h-4 rounded-full p-0.5 transition-colors ${autoRadar ? 'bg-green-500' : 'bg-slate-300'}`}>
                            <div className={`w-3 h-3 bg-white rounded-full transition-transform ${autoRadar ? 'translate-x-4' : 'translate-x-0'}`}></div>
                        </div>
                    </div>
                    {autoRadar && (
                        <span className="text-[9px] font-mono opacity-80 leading-tight">
                            {autoPilotStatus}
                        </span>
                    )}
                </button>

                {onDeepScan && (
                    <button onClick={onDeepScan} className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-lg shadow-md hover:shadow-lg transition-all hover:scale-[1.02] active:scale-95 group">
                        <Rocket size={16} className="group-hover:animate-bounce" />
                        <span className="text-xs font-bold">DEEP SCAN (Forçar)</span>
                    </button>
                )}
            </div>
            
            {/* 5. NEWS METRICS */}
            <div className="mt-auto">
                 <RagPanel 
                    status={ragStatus} 
                    onIndex={onRagIndex} 
                    onSearch={onRagSearch} 
                    aiConfig={aiConfig} 
                 />
                 <NewsChart news={allNews} />
            </div>

        </aside>

      </main>
      
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
                            <p className="font-bold text-red-700 mb-2">Você está rodando o site na Nuvem (Google AI Studio/Vercel).</p>
                            <p className="mb-2">
                                Navegadores bloqueiam que sites seguros (HTTPS) acessem servidores locais (HTTP/localhost) por segurança (Mixed Content).
                            </p>
                            <p className="font-bold underline">
                                Para usar o Ollama Local, você DEVE baixar este código e rodar no seu computador (npm start).
                            </p>
                        </div>
                      ) : (
                        <p className="text-sm text-slate-600 mb-4">
                            Se você já está rodando localmente (localhost:3000), o Ollama precisa ser reiniciado com permissões de acesso externo (CORS).
                        </p>
                      )}
                      
                      <div className="space-y-4 opacity-80 hover:opacity-100 transition-opacity">
                          <div className="bg-slate-900 rounded-lg p-3">
                              <div className="text-[10px] text-slate-400 font-bold uppercase mb-2 flex items-center gap-1"><Command size={10} /> Windows (CMD - Recomendado)</div>
                              <code className="block text-xs font-mono text-green-400 bg-black/50 p-2 rounded border border-slate-700 select-all cursor-pointer hover:bg-black/80">
                                  taskkill /F /IM ollama.exe 2&gt;NUL &amp; set OLLAMA_ORIGINS=* &amp; ollama serve
                              </code>
                          </div>
                      </div>

                      <div className="mt-6 p-3 bg-blue-50 rounded-lg text-xs text-blue-700 border border-blue-100 text-center">
                         {isHttpsBlock ? 'Use o modo "GEMINI PRO" (Cloud) enquanto estiver aqui.' : 'Copie o comando acima e cole no terminal.'}
                      </div>
                  </div>
              </div>
          </div>
      )}

      <DeepAnalysisModal isOpen={isAnalysisModalOpen} onClose={() => setIsAnalysisModalOpen(false)} loading={isAnalyzing} result={analysisResult} query={externalQuery} />
      <NeuralBridgeModal isOpen={isNeuralBridgeOpen} onClose={() => setIsNeuralBridgeOpen(false)} loading={isGeneratingSignal} sentiment={marketSentiment} onGenerate={handleGenerateSignal} />
      
      <NewsModal item={selectedNews} onClose={() => setSelectedNews(null)} />
    </div>
  );
};
