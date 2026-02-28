import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Dashboard } from './components/Dashboard';
import { AuthGate } from './components/AuthGate';
import { LoadingOverlay } from './components/LoadingOverlay';
import { SystemMonitor } from './components/SystemMonitor';
import { fetchNewsBatch, fetchInvestigationBatch, fetchCommoditiesUpdate, generateDailySummary } from './services/geminiService';
import { saveReport, getAllNews, persistNewsItems, loadCurrentState, saveCurrentState, saveSnapshot, getEmbeddingCount } from './db';
import { IntelligenceReport, NewsAnalysis, SystemLogEntry, AIConfig, RagIndexStatus } from './types';
import { indexNewsBatch, semanticSearch, pruneOrphanEmbeddings } from './services/ragService';
import { runFullPipeline, processQueue, fetchProcessedNews, getQueueStats, QueueStats } from './services/newsQueue';
import { RSS_FEEDS } from './services/rssFeeds';

const ROTATION_QUEUE = [
  { type: 'COMMODITIES', label: 'Cotações Físicas (Atualização)' },
  { type: 'NEWS', topic: 'Preço da Soja e Milho Mercado Futuro', label: 'Radar Agro: Grãos' },
  { type: 'NEWS', topic: 'Preço da Arroba do Boi Pecuária', label: 'Radar Agro: Pecuária' },
  { type: 'NEWS', topic: 'Clima Safra Mato Grosso do Sul', label: 'Radar Agro: Clima MS' },
  { type: 'NEWS', topic: 'Leis Ambientais e Agrárias Brasil', label: 'Radar Agro: Jurídico' },
  { type: 'NEWS', topic: 'Decisões STF últimas 24h', label: 'Radar STF: Decisões' },
  { type: 'NEWS', topic: 'Votações Senado e Câmara Hoje', label: 'Radar Congresso: Votos' },
  { type: 'INVESTIGATION', topic: 'Gastos Cartão Corporativo Governo', label: 'Audit: Gastos Gov' },
  { type: 'NEWS', topic: 'USDBRL Dólar Futuro Tendência', label: 'Radar Mercado: Câmbio' },
  { type: 'NEWS', topic: 'Bolsa Brasil Fluxo Estrangeiro', label: 'Radar B3: Fluxo' },
  { type: 'NEWS', topic: 'Forex XAUUSD Gold Analysis', label: 'Radar Forex: Ouro' },
  { type: 'NEWS', topic: 'Forex EURUSD Analysis', label: 'Radar Forex: Euro' },
  { type: 'NEWS', topic: 'Regulamentação Redes Sociais Brasil', label: 'Radar Liberdade: Censura' },
  { type: 'INVESTIGATION', topic: 'Setor Imobiliário Santa Catarina', label: 'Audit: Imóveis SC' }
];

const AUTOPILOT_DELAY_MS = 1000 * 60 * 15;
const HEARTBEAT_MS = 10000;

// FIX 2 — adaptNewsFromSupabase
function adaptNewsFromSupabase(items: any[]): NewsAnalysis[] {
  return items.map(n => ({
    id: n.id || crypto.randomUUID(),
    title: n.title || 'Sem título',
    category: n.category || 'Geral',
    timeframe: 'DAILY',
    narrative: n.narrative_media || '',
    intent: n.hidden_intent || '',
    action: n.impact_rodrigo || '',
    truth: n.real_facts || '',
    summary: n.summary || n.narrative_media || '',
    scenarios: {
      short: { prediction: '', confidence: 0, impact: '' },
      medium: { prediction: '', confidence: 0, impact: '' },
      long: { prediction: '', confidence: 0, impact: '' }
    },
    relevanceScore: n.score_rodrigo || 0,
    nationalRelevance: n.score_brasil || 0,
    personalImpact: n.impact_rodrigo || '',
    dateAdded: n.processed_at || new Date().toISOString(),
    source: 'supabase',
  }));
}

function App() {
  const [authorized, setAuthorized] = useState(false);
  const [isDatabaseReady, setIsDatabaseReady] = useState(false);
  const [report, setReport] = useState<IntelligenceReport>({
    date: new Date().toISOString(),
    summary: "Sistema pronto. Carregando memória...",
    news: [],
    investigations: [],
    opportunityMatrix: [],
    commodities: []
  });
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingTask, setLoadingTask] = useState<string>("");
  const [progress, setProgress] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [memoryStatus, setMemoryStatus] = useState<string | null>(null);
  // FORÇANDO MODO CLOUD MAX POWER
  const [aiConfig, setAiConfig] = useState<AIConfig>({ provider: 'CLOUD', modelName: 'gemini-3-pro-preview' });
  const [ragStatus, setRagStatus] = useState<RagIndexStatus>({
    totalNews: 0, indexedDocs: 0, lastIndexed: null, isIndexing: false
  });
  const [cotacoes, setCotacoes] = useState<{ dolar: string; euro: string; bitcoin: string; lastUpdate: string } | null>(null);

  useEffect(() => { localStorage.setItem('truepress_ai_config', JSON.stringify(aiConfig)); }, [aiConfig]);

  const [autoRadar, setAutoRadar] = useState(() => localStorage.getItem('truepress_autoradar') === 'true');
  const [nextAutoTaskIndex, setNextAutoTaskIndex] = useState(0);
  const [autoPilotStatus, setAutoPilotStatus] = useState<string>('Inativo');
  const lastRunTimeRef = useRef<number>(0);
  const isRunningRef = useRef<boolean>(false);
  const [systemLogs, setSystemLogs] = useState<SystemLogEntry[]>([]);
  const [isSystemMonitorOpen, setIsSystemMonitorOpen] = useState(false);
  const [queueStats, setQueueStats] = useState<{ pending: number; processing: number; done: number; error: number } | null>(null);

  const addLog = useCallback((level: 'INFO'|'WARN'|'ERROR'|'SUCCESS', module: string, message: string) => {
    const entry: SystemLogEntry = { timestamp: new Date().toLocaleTimeString(), level, module, message };
    setSystemLogs(prev => [...prev.slice(-99), entry]);
  }, []);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (report.news.length > 0) { e.preventDefault(); e.returnValue = ''; }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [report.news.length]);

  useEffect(() => {
    if (isDatabaseReady && report.news.length > 0) { saveCurrentState(report); }
  }, [report, isDatabaseReady]);

  // FIX 5 — Cotações via AwesomeAPI
  useEffect(() => {
    const load = () => fetch('https://economia.awesomeapi.com.br/last/USD-BRL,EUR-BRL,BTC-BRL')
      .then(r => r.json())
      .then(d => setCotacoes({
        dolar: parseFloat(d?.USDBRL?.bid || 0).toFixed(2),
        euro: parseFloat(d?.EURBRL?.bid || 0).toFixed(2),
        bitcoin: parseFloat(d?.BTCBRL?.bid || 0).toLocaleString('pt-BR'),
        lastUpdate: new Date().toLocaleTimeString('pt-BR'),
      })).catch(() => {});
    load();
    const t = setInterval(load, 300000);
    return () => clearInterval(t);
  }, []);

  const runProgressSimulation = (durationMs: number = 12000) => {
    setProgress(0);
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const percentage = Math.min((elapsed / durationMs) * 90, 90);
      const jitter = Math.random() * 2;
      setProgress(p => Math.max(p, percentage + jitter));
      if (elapsed >= durationMs) clearInterval(interval);
    }, 200);
    return () => clearInterval(interval);
  };

  const loadData = useCallback(async () => {
    setError(null);
    setLoading(true);
    setLoadingTask("Restaurando Estado (Deep Recovery)");
    setProgress(30);
    addLog('INFO', 'System', 'Inicializando boot do sistema...');
    try {
      let savedState = await loadCurrentState();
      setProgress(50);
      let effectiveNews = savedState?.news || [];
      if (effectiveNews.length === 0) {
        addLog('WARN', 'DB', 'State vazio. Buscando fragmentos...');
        effectiveNews = await getAllNews();
      }
      if (effectiveNews.length > 0) {
        const restoredReport = { ...report, ...savedState, news: effectiveNews };
        setReport(restoredReport);
        setMemoryStatus(`Memória: ${effectiveNews.length} itens (Restaurado).`);
        addLog('SUCCESS', 'DB', `Recuperação total: ${effectiveNews.length} itens.`);
        setTimeout(() => { checkAndIndexRag(effectiveNews); }, 3000);
      } else {
        setMemoryStatus("Memória Vazia.");
        addLog('WARN', 'DB', 'Nenhum dado encontrado (Clean Slate).');
        setTimeout(() => { if(effectiveNews.length === 0) handleDeepScan(); }, 2000);
      }
      setIsDatabaseReady(true);
    } catch (e) {
      console.error("DB Load Error", e);
      setError("Erro crítico ao ler banco de dados.");
      setIsDatabaseReady(true);
    } finally {
      setProgress(100);
      setTimeout(() => setLoading(false), 500);
    }
  }, [aiConfig, addLog]);

  const checkAndIndexRag = async (newsList: NewsAnalysis[]) => {
    try {
      const count = await getEmbeddingCount();
      setRagStatus(prev => ({ ...prev, totalNews: newsList.length, indexedDocs: count }));
      if (count < newsList.length) { handleRagIndex(newsList); }
    } catch (e) { console.error("Erro ao verificar RAG", e); }
  };

  const handleRagIndex = async (newsList?: NewsAnalysis[]) => {
    const list = newsList || report.news;
    if (list.length === 0) return;
    setRagStatus(prev => ({ ...prev, isIndexing: true, totalNews: list.length }));
    addLog('INFO', 'RAG', `Iniciando indexação de ${list.length} documentos...`);
    try {
      const apiKey = process.env.API_KEY || '';
      const indexed = await indexNewsBatch(apiKey, list);
      const newCount = await getEmbeddingCount();
      setRagStatus(prev => ({ ...prev, isIndexing: false, indexedDocs: newCount, lastIndexed: new Date().toISOString() }));
      const activeIds = new Set(list.map(n => n.id));
      const removed = await pruneOrphanEmbeddings(activeIds);
      if (indexed > 0) addLog('SUCCESS', 'RAG', `Indexados ${indexed} novos documentos.`);
      if (removed > 0) addLog('INFO', 'RAG', `Limpos ${removed} documentos órfãos.`);
    } catch (e) {
      console.error("Erro na indexação RAG", e);
      addLog('ERROR', 'RAG', 'Falha na indexação.');
      setRagStatus(prev => ({ ...prev, isIndexing: false }));
    }
  };

  const handleRagSearch = async (query: string) => {
    const apiKey = process.env.API_KEY || '';
    return await semanticSearch(apiKey, query);
  };

  const handleDeepScan = async () => {
    setLoading(true);
    setError(null);
    addLog('WARN', 'DeepScan', `Iniciando varredura MASSIVA.`);
    const topics = [
      "Política Nacional STF", "Agronegócio Brasil Preços", "Economia Dólar e Bolsa",
      "Liberdade de Expressão Brasil", "Escândalos de Corrupção Recentes",
      "Preço do Boi Gordo e Bezerro", "Safra de Soja e Milho Previsão",
      "Mercado Imobiliário SC Litoral", "Geopolítica Mundial Impacto Brasil",
      "Leis Ambientais e Marco Temporal", "Forex XAUUSD Tendência",
      "Tecnologia e IA Agronegócio"
    ];
    try {
      for (let i = 0; i < topics.length; i++) {
        const topic = topics[i];
        setLoadingTask(`VARREDURA (${i+1}/${topics.length}): ${topic}`);
        setProgress((i / topics.length) * 100);
        if (i > 0) await new Promise(r => setTimeout(r, 4000));
        try {
          const newNews = await fetchNewsBatch(topic, aiConfig);
          if (newNews.length > 0) {
            await persistNewsItems(newNews);
            setReport(prev => {
              const updatedNews = [...newNews, ...prev.news];
              const uniqueNews = Array.from(new Map(updatedNews.map(item => [item.id, item])).values());
              return { ...prev, news: uniqueNews };
            });
            addLog('SUCCESS', 'DeepScan', `+${newNews.length} itens: ${topic}`);
          }
        } catch (innerError) {
          console.warn(`Falha no tópico ${topic}`, innerError);
          addLog('WARN', 'DeepScan', `Pulo: ${topic}`);
        }
      }
      setReport(current => {
        saveSnapshot(current, `Auto-Scan Completo ${new Date().toLocaleTimeString()}`, 'AUTO');
        return current;
      });
      setMemoryStatus("Base de Dados Populada (Full).");
      addLog('SUCCESS', 'DeepScan', 'Varredura concluída.');
    } catch (e) {
      console.error("Erro no Deep Scan:", e);
      setError("Erro na Varredura.");
    } finally {
      setProgress(100);
      setTimeout(() => setLoading(false), 500);
    }
  };

  useEffect(() => {
    const isAuth = sessionStorage.getItem('truepress_auth');
    if (isAuth === 'true') { setAuthorized(true); loadData(); }
  }, [loadData]);

  // FIX 3 — useEffect de inicialização com adaptNewsFromSupabase
  useEffect(() => {
    if (!authorized || !isDatabaseReady) return;
    fetchProcessedNews(100).then(items => {
      if (items?.length > 0) {
        const adapted = adaptNewsFromSupabase(items);
        setReport(prev => ({ ...prev, news: adapted, lastUpdated: new Date().toISOString() }));
      }
    }).catch(console.error);
  }, [authorized, isDatabaseReady]);

  const handleLoginSuccess = () => {
    sessionStorage.setItem('truepress_auth', 'true');
    setAuthorized(true);
    addLog('SUCCESS', 'Auth', 'Acesso autorizado.');
    loadData();
  };

  const handleDataImported = (importedNews: NewsAnalysis[], importedReport?: IntelligenceReport) => {
    setReport(prev => {
      const newState = {
        ...prev,
        news: importedNews,
        summary: importedReport?.summary || prev.summary,
        commodities: importedReport?.commodities || prev.commodities,
        investigations: importedReport?.investigations || prev.investigations,
        date: new Date().toISOString()
      };
      saveCurrentState(newState);
      return newState;
    });
    setMemoryStatus(`Memória: ${importedNews.length} registros (Importado).`);
    addLog('SUCCESS', 'System', `Importação concluída: ${importedNews.length} itens.`);
  };

  const handleUpdateSummary = async () => {
    if (report.news.length === 0) return;
    setLoading(true);
    setLoadingTask("Gerando Resumo Executivo...");
    try {
      const newSummary = await generateDailySummary(report.news, aiConfig);
      setReport(prev => {
        const newState = { ...prev, summary: newSummary };
        saveReport(newState);
        return newState;
      });
      addLog('SUCCESS', 'AI', 'Resumo executivo atualizado.');
    } catch (e) {
      addLog('ERROR', 'AI', 'Falha ao gerar resumo.');
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshNews = async (topic: string, aiConfig: AIConfig) => {
    setLoading(true);
    setLoadingTask(`Analisando: ${topic}`);
    const stopSim = runProgressSimulation(15000);
    try {
      const newNews = await fetchNewsBatch(topic, aiConfig);
      if (newNews.length > 0) {
        await persistNewsItems(newNews);
        setReport(prev => {
          const updatedNews = [...newNews, ...prev.news];
          const uniqueNews = Array.from(new Map(updatedNews.map(item => [item.id, item])).values());
          uniqueNews.sort((a, b) => new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime());
          return { ...prev, news: uniqueNews };
        });
        addLog('SUCCESS', 'AI', `+${newNews.length} itens.`);
      }
    } catch (e) {
      addLog('ERROR', 'AI', 'Falha na conexão com API.');
    } finally {
      stopSim();
      setProgress(100);
      setTimeout(() => setLoading(false), 500);
    }
  };

  const handleRefreshInvest = async (topic: string, aiConfig: AIConfig) => {
    setLoading(true);
    setLoading(false);
  };

  const handleRefreshCommodities = async (aiConfig: AIConfig) => {
    setLoading(true);
    setLoadingTask("Cotações Reais (Google Search)");
    const stopSim = runProgressSimulation(8000);
    try {
      const newCommodities = await fetchCommoditiesUpdate(aiConfig);
      if (newCommodities && newCommodities.length > 0) {
        setReport(prev => {
          const newState = { ...prev, commodities: newCommodities };
          saveCurrentState(newState);
          return newState;
        });
        addLog('SUCCESS', 'Commodities', 'Preços atualizados.');
      } else {
        addLog('WARN', 'Commodities', 'Nenhum dado retornado.');
      }
    } catch (e) {
      addLog('ERROR', 'Commodities', 'Falha na busca.');
    } finally {
      stopSim();
      setProgress(100);
      setTimeout(() => setLoading(false), 500);
    }
  };

  // FIX 4 — handleAutoPilotRun sem "undefined"
  async function handleAutoPilotRun() {
    if (isRunningRef.current) return;
    isRunningRef.current = true;
    const now = Date.now();
    if (now - lastRunTimeRef.current < AUTOPILOT_DELAY_MS) {
      const min = Math.ceil((AUTOPILOT_DELAY_MS - (now - lastRunTimeRef.current)) / 60000);
      setAutoPilotStatus(`Aguardando ${min}min`);
      isRunningRef.current = false;
      return;
    }
    setAutoPilotStatus('Executando pipeline...');
    addLog('INFO', 'AutoPilot', 'Iniciando pipeline RSS → Supabase');
    try {
      const result = await runFullPipeline((msg: string) => {
        addLog('INFO', 'Pipeline', msg);
        setAutoPilotStatus(msg.substring(0, 50));
      });
      const msg = result
        ? `✅ ${result.ingested ?? 0} ingeridas, ${result.processed ?? 0} processadas`
        : '✅ Concluído';
      setAutoPilotStatus(msg);
      const fresh = await fetchProcessedNews(100);
      if (fresh?.length > 0) {
        setReport(prev => ({ ...prev, news: adaptNewsFromSupabase(fresh) }));
      }
      const stats = await getQueueStats();
      setQueueStats(stats);
      lastRunTimeRef.current = Date.now();
      addLog('SUCCESS', 'AutoPilot', msg);
    } catch (err: any) {
      addLog('ERROR', 'AutoPilot', err.message);
      setAutoPilotStatus('Erro — próximo ciclo');
    } finally {
      isRunningRef.current = false;
    }
  }

  useEffect(() => {
    localStorage.setItem('truepress_autoradar', autoRadar.toString());
    if (autoRadar) {
      if (Date.now() - lastRunTimeRef.current > AUTOPILOT_DELAY_MS) { lastRunTimeRef.current = 0; }
    }
  }, [autoRadar]);

  useEffect(() => {
    const heartbeat = setInterval(() => {
      if (!autoRadar) { setAutoPilotStatus('Inativo'); return; }
      if (isDatabaseReady && Date.now() - lastRunTimeRef.current >= AUTOPILOT_DELAY_MS) handleAutoPilotRun();
    }, HEARTBEAT_MS);
    return () => clearInterval(heartbeat);
  }, [autoRadar, isDatabaseReady]);

  if (!authorized) return <AuthGate onSuccess={handleLoginSuccess} />;

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 p-0 font-sans">
      <LoadingOverlay isVisible={loading} progress={progress} taskName={loadingTask} />
      <SystemMonitor isOpen={isSystemMonitorOpen} onClose={() => setIsSystemMonitorOpen(false)} logs={systemLogs} />
      <Dashboard
        data={report}
        allNews={report.news}
        allInvestigations={report.investigations}
        loading={loading}
        error={error}
        memoryStatus={memoryStatus}
        onRefreshNews={handleRefreshNews}
        onRefreshInvest={handleRefreshInvest}
        onRefreshCommodities={handleRefreshCommodities}
        onUpdateSummary={handleUpdateSummary}
        autoRadar={autoRadar}
        toggleAutoRadar={() => setAutoRadar(!autoRadar)}
        autoPilotStatus={autoPilotStatus}
        onDeepScan={handleDeepScan}
        onOpenSystemMonitor={() => setIsSystemMonitorOpen(true)}
        onDataImported={handleDataImported}
        aiConfig={aiConfig}
        setAiConfig={setAiConfig}
        ragStatus={ragStatus}
        onRagIndex={() => handleRagIndex()}
        onRagSearch={handleRagSearch}
        queueStats={queueStats}
        cotacoes={cotacoes}
      />
    </div>
  );
}

export default App;
