import React, { useState, useMemo, useEffect } from 'react';
import { IntelligenceReport, NewsAnalysis, ExternalAnalysisResult, AiInvestigation, MarketSentiment, RawDataResult, DEFAULT_CATEGORIES, AIConfig, OllamaModel } from '../types';
import { generateDeepAnalysis, generateMarketSentiment } from '../services/geminiService';
import { getAllRawData } from '../db';
import { NewsCard } from './NewsCard';
import { NewsModal } from './NewsModal';
import { AiInvestigationCard } from './AiInvestigationCard';
import { RawDataCard } from './RawDataCard';
import { CommodityForecast } from '../types';
import { DeepAnalysisModal } from './DeepAnalysisModal';
import { NeuralBridgeModal } from './NeuralBridgeModal';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { CommandCenter } from './CommandCenter';
import { OwnPressPanel } from './OwnPressPanel';
import { checkOllamaHealth, fetchLocalModels } from '../services/ollamaService';
import { checkPythonHealth } from '../services/pythonBridge';
import { Globe, Newspaper, Bot, RefreshCw, Filter, AlertCircle, FileSpreadsheet, Sparkles, Radar, Pen, Share2, Check } from 'lucide-react';

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
  queueStats: { pending: number; processing: number; done: number; error: number } | null;
  cotacoes?: { dolar: string; euro: string; bitcoin: string; lastUpdate: string } | null;
}

export const Dashboard: React.FC<DashboardProps> = ({
  data, allNews, allInvestigations, loading, error, memoryStatus,
  onRefreshNews, onRefreshInvest, onRefreshCommodities, onUpdateSummary,
  autoRadar, toggleAutoRadar, autoPilotStatus, onDeepScan, onOpenSystemMonitor,
  onDataImported, aiConfig, setAiConfig, ragStatus, onRagIndex, onRagSearch,
  queueStats, cotacoes,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');
  const [viewMode, setViewMode] = useState<'media' | 'ai' | 'data' | 'ownpress'>('media');
  const [searchQuery, setSearchQuery] = useState('');
  const [externalQuery, setExternalQuery] = useState('');
  const [topicFocus, setTopicFocus] = useState('');
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
  const [isHttpsBlock, setIsHttpsBlock] = useState<boolean>(false);

  useEffect(() => { getAllRawData().then(setRawDataList); }, []);

  useEffect(() => {
    const isHttps = window.location.protocol === 'https:';
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    setIsHttpsBlock(isHttps && !isLocalhost);
    setIsCloudMode(!isLocalhost);

    const refreshSystems = async () => {
      const ollamaOk = await checkOllamaHealth();
      setIsOllamaOnline(ollamaOk);
      if (ollamaOk) { const models = await fetchLocalModels(); setLocalModels(models); }
      const scraperOk = await checkPythonHealth();
      setIsScraperOnline(scraperOk);
    };
    refreshSystems();
    const interval = setInterval(refreshSystems, 30000);
    return () => clearInterval(interval);
  }, []);

  const categories = useMemo(() => {
    const loadedCats = new Set(allNews.filter(n => n?.category).map(n => n.category));
    DEFAULT_CATEGORIES.forEach(c => loadedCats.add(c));
    return ['Todos', ...Array.from(loadedCats)];
  }, [allNews]);

  const filteredNews = useMemo(() => {
    let result = allNews;
    if (selectedCategory !== 'Todos') result = result.filter(item => item.category?.includes(selectedCategory) || selectedCategory.includes(item.category));
    if (searchQuery) result = result.filter(item => item.title?.toLowerCase().includes(searchQuery.toLowerCase()) || item.narrative?.toLowerCase().includes(searchQuery.toLowerCase()));
    result = result.filter(item => (item.relevanceScore || 0) >= minPersonalRelevance && (item.nationalRelevance || 0) >= minNationalRelevance);
    return result.sort((a, b) => relevanceMode === 'personal' ? (b.relevanceScore || 0) - (a.relevanceScore || 0) : (b.nationalRelevance || 0) - (a.nationalRelevance || 0));
  }, [allNews, selectedCategory, searchQuery, minPersonalRelevance, minNationalRelevance, relevanceMode]);

  const filteredInvestigations = useMemo(() => {
    let result = allInvestigations;
    if (searchQuery) result = result.filter(item => item.title.toLowerCase().includes(searchQuery.toLowerCase()) || item.findings.toLowerCase().includes(searchQuery.toLowerCase()));
    return result.sort((a, b) => new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime());
  }, [allInvestigations, searchQuery]);

  const handleDeepAnalysis = async () => {
    if (!externalQuery) return;
    setIsAnalysisModalOpen(true);
    setIsAnalyzing(true);
    try {
      const result = await generateDeepAnalysis(externalQuery, aiConfig);
      setAnalysisResult(result);
    } catch (e) { setIsAnalysisModalOpen(false); } finally { setIsAnalyzing(false); }
  };

  const handleGenerateSignal = async () => {
    setIsGeneratingSignal(true);
    try {
      const context = allNews.slice(0, 15).map(n => `${n.title}: ${n.truth}`).join('\n');
      const sentiment = await generateMarketSentiment(context, aiConfig);
      setMarketSentiment(sentiment);
    } catch (e) { console.error(e); } finally { setIsGeneratingSignal(false); }
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

  const isDark = viewMode === 'ai' || viewMode === 'data';

  return (
    <div className={`flex min-h-screen ${isDark ? 'bg-slate-950' : 'bg-[#f8fafc]'} transition-colors duration-500`}>
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
        <div className="flex-1 flex flex-col h-full overflow-hidden relative">
          <Header toggleMobileMenu={() => {}} aiConfig={aiConfig} setAiConfig={setAiConfig} />

          {error && (
            <div className="bg-red-50 border-b border-red-200 p-3 flex items-center gap-2 text-red-700 text-sm font-bold">
              <AlertCircle size={18} /> {error}
            </div>
          )}

          {/* TOP BAR: VIEW TOGGLES & SEARCH */}
          <div className={`px-6 py-4 border-b flex flex-wrap gap-4 items-center justify-between ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
            <div className="flex bg-slate-200/50 p-1 rounded-lg w-fit">
              <button onClick={() => setViewMode('media')} className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-bold transition-all ${viewMode === 'media' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                <Newspaper size={16} /> PRESS WATCH
              </button>
              <button onClick={() => setViewMode('ai')} className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-bold transition-all ${viewMode === 'ai' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                <Bot size={16} /> AI ORIGINALS
              </button>
              <button onClick={() => setViewMode('data')} className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-bold transition-all ${viewMode === 'data' ? 'bg-slate-800 text-emerald-400 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                <FileSpreadsheet size={16} /> DATA ROOM
              </button>
              <button onClick={() => setViewMode('ownpress')} className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-bold transition-all ${viewMode === 'ownpress' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                <Pen size={16} /> MINHA IMPRENSA
              </button>
            </div>

            {viewMode !== 'ownpress' && (
              <div className="relative flex-1 max-w-md">
                <input
                  type="text"
                  placeholder="Filtrar base interna..."
                  className={`w-full pl-9 pr-4 py-2 text-sm rounded-lg border focus:ring-2 focus:ring-blue-500 outline-none transition-all ${isDark ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-300 text-slate-800 placeholder-slate-400'}`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <Filter size={16} className={`absolute left-3 top-2.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
              </div>
            )}
          </div>

          {/* MAIN CONTENT */}
          <div className={`flex-1 overflow-y-auto p-4 md:p-8 scroll-smooth ${isDark ? 'bg-slate-950 text-slate-200' : ''}`}>
            <div className="w-full max-w-[1800px] mx-auto">

              {viewMode === 'ownpress' && <OwnPressPanel />}

              {viewMode === 'media' && (
                <>
                  {data?.summary && (
                    <div className="mb-8 p-6 bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl shadow-xl text-white relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-4 opacity-10"><Globe size={100} /></div>
                      <div className="relative z-10">
                        <div className="flex justify-between items-start mb-4">
                          <h2 className="text-xl font-black uppercase tracking-widest text-blue-400">Resumo Executivo</h2>
                          <div className="flex gap-2">
                            <button onClick={handleShare} className={`flex items-center gap-2 px-3 py-1 border rounded-full text-xs font-bold transition ${copiedShare ? 'bg-green-500 text-white border-green-500' : 'bg-white/10 hover:bg-white/20 border-white/20 text-white'}`}>
                              {copiedShare ? <Check size={12} /> : <Share2 size={12} />}
                              {copiedShare ? 'COPIADO!' : 'COMPARTILHAR'}
                            </button>
                            <button onClick={onUpdateSummary} disabled={loading} className="flex items-center gap-2 px-3 py-1 bg-blue-600/20 hover:bg-blue-600/40 border border-blue-500/50 rounded-full text-xs font-bold transition text-blue-300 disabled:opacity-50">
                              <Sparkles size={12} /> ATUALIZAR
                            </button>
                            <button onClick={() => toggleSpeech(data.summary)} className="flex items-center gap-2 px-3 py-1 bg-white/10 hover:bg-white/20 rounded-full text-xs font-bold transition">
                              {speaking ? 'PARAR' : 'OUVIR'}
                            </button>
                          </div>
                        </div>
                        <p className="text-slate-300 leading-relaxed text-sm md:text-base font-light">{data.summary}</p>
                      </div>
                    </div>
                  )}
                  <div className="space-y-6">
                    <div className="flex justify-between items-center mb-2">
                      <h2 className="text-2xl font-bold text-slate-800">{selectedCategory}</h2>
                      <span className="text-xs text-slate-400 font-medium">{filteredNews.length} itens</span>
                    </div>
                    {filteredNews.length > 0 ? filteredNews.map(item => (
                      <NewsCard key={item.id} item={item} onClick={() => setSelectedNews(item)} />
                    )) : (
                      <div className="text-center py-20 bg-white rounded-xl border border-dashed border-slate-300">
                        <p className="text-slate-400">Sem dados.</p>
                        <button onClick={onDeepScan} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded font-bold text-sm">Forçar Varredura</button>
                      </div>
                    )}
                  </div>
                </>
              )}

              {viewMode === 'ai' && (
                <div className="space-y-6">
                  <div className="flex items-center gap-2 mb-6">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <h2 className="text-lg font-mono font-bold text-slate-300 uppercase">Investigações (Data Driven)</h2>
                  </div>
                  {filteredInvestigations.length > 0 ? filteredInvestigations.map(item => (
                    <AiInvestigationCard key={item.id} item={item} />
                  )) : (
                    <div className="text-center py-20 bg-slate-900 rounded-xl border border-dashed border-slate-700">
                      <Bot size={48} className="mx-auto mb-4 opacity-50 text-slate-500" />
                      <p className="text-slate-400 font-mono">Sem investigações.</p>
                    </div>
                  )}
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

        {/* RIGHT SIDEBAR — COMMAND CENTER */}
        <CommandCenter
          viewMode={viewMode}
          aiConfig={aiConfig}
          setAiConfig={setAiConfig}
          loading={loading}
          isCloudMode={isCloudMode}
          isScraperOnline={isScraperOnline}
          isOllamaOnline={isOllamaOnline}
          isHttpsBlock={isHttpsBlock}
          localModels={localModels}
          memoryStatus={memoryStatus ?? null}
          autoRadar={autoRadar}
          autoPilotStatus={autoPilotStatus}
          toggleAutoRadar={toggleAutoRadar}
          onDeepScan={onDeepScan}
          onRefreshCommodities={onRefreshCommodities}
          commodities={data?.commodities || []}
          ragStatus={ragStatus}
          onRagIndex={onRagIndex}
          onRagSearch={onRagSearch}
          allNews={allNews}
          externalQuery={externalQuery}
          setExternalQuery={setExternalQuery}
          handleDeepAnalysis={handleDeepAnalysis}
          handleManualRefresh={handleManualRefresh}
          setIsNeuralBridgeOpen={setIsNeuralBridgeOpen}
          queueStats={queueStats}
        />
      </main>

      <DeepAnalysisModal isOpen={isAnalysisModalOpen} onClose={() => setIsAnalysisModalOpen(false)} loading={isAnalyzing} result={analysisResult} query={externalQuery} />
      <NeuralBridgeModal isOpen={isNeuralBridgeOpen} onClose={() => setIsNeuralBridgeOpen(false)} loading={isGeneratingSignal} sentiment={marketSentiment} onGenerate={handleGenerateSignal} />
      <NewsModal item={selectedNews} onClose={() => setSelectedNews(null)} />
    </div>
  );
};
