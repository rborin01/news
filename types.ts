
export enum ScenarioType {
  SHORT = 'Curto Prazo (6-12 meses)',
  MEDIUM = 'Médio Prazo (1-3 anos)',
  LONG = 'Longo Prazo (3-10 anos)',
}

export enum Timeframe {
  DAILY = 'Últimas 24h',
  WEEKLY = 'Esta Semana',
  MONTHLY = 'Tendência Mensal',
  YEARLY = 'Visão Anual',
}

export type AIProvider = 'CLOUD' | 'LOCAL';

export interface AIConfig {
    provider: AIProvider;
    modelName: string; 
}

export interface OllamaModel {
    name: string;
    size: number;
    digest: string;
    details: {
        family: string;
        parameter_size: string;
        quantization_level: string;
    }
}

export interface ScenarioPrediction {
  prediction: string;
  confidence: number;
  impact: string;
}

export interface NewsAnalysis {
  id: string;
  title: string;
  category: string;
  timeframe: Timeframe;
  narrative: string;
  intent: string;
  action: string;
  truth: string;
  scenarios: {
    [key in 'short' | 'medium' | 'long']: ScenarioPrediction;
  };
  relevanceScore: number;
  nationalRelevance: number;
  personalImpact: string;
  muskAdvice?: string;
  dateAdded: string; 
}

// NOVO: Estrutura para o Banco de Dados Bruto (Raw Ledger)
export interface RawFeedItem {
    id: string; // Hash do link/titulo
    title: string;
    link: string;
    source: string;
    snippet: string;
    pubDate: string;
    ingestedAt: string;
    processed: boolean; // Se já foi analisado pela IA
}

export interface AiInvestigation {
  id: string;
  title: string;
  category: string;
  anomalyDetected: string;
  algorithmUsed: string;
  dataSources: string;
  findings: string;
  prediction: {
    horizon: string;
    forecast: string;
    confidence: number;
  };
  rodrigoAction: string;
  dateAdded: string;
}

export interface RawDataPoint {
    label: string;
    value: string;
    source: string;
}

export interface RawDataResult {
    id: string;
    topic: string;
    dateAdded: string;
    keyFigures: RawDataPoint[]; 
    involvedParties: string[]; 
    timeline: { date: string; event: string }[];
    officialSources: { name: string; url: string }[]; 
    rawSummary: string; 
}

export interface ExternalAnalysisResult {
  topic: string;
  hiddenTruth: string;
  winners: { name: string; gain: string }[];
  losers: { name: string; loss: string }[];
  manipulators: { agent: string; method: string; motive: string }[];
  corruptionTrace: string;
  authoritarianSimilarity: {
    country: string;
    mechanism: string;
    riskLevel: 'Baixo' | 'Médio' | 'Alto' | 'Crítico';
  };
  conclusion: string;
}

export interface PriceScenario {
    price: string;
    trend: 'Alta' | 'Baixa' | 'Lateral';
    confidence: number;
    justification: string;
}

export interface CommodityForecast {
    name: string; 
    currentPrice: string;
    futurePrice?: string;
    contractDate?: string;
    unit: string;
    lastUpdated: string;
    scenarios: {
        short: PriceScenario;  
        medium: PriceScenario; 
        long: PriceScenario;   
    };
    source: string;
}

export interface Opportunity {
    sector: string;
    opportunity: string;
    risk: string;
    roi_potential: string;
}

export interface TradeSignal {
    asset: string; 
    sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
    score: number; 
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME';
    reason: string;
}

export interface MarketSentiment {
    generatedAt: string;
    globalRisk: number; 
    primaryFocus: string; 
    signals: TradeSignal[];
    suggestedEAMode: 'AGGRESSIVE' | 'NORMAL' | 'CONSERVATIVE' | 'HALT';
}

// SNAPSHOT SYSTEM (L4 MEMORY LAYER)
export interface MemorySnapshot {
    id: string;
    name: string;      // Nome amigável (ex: "Fechamento Sexta")
    timestamp: string; // ISO Date
    type: 'AUTO' | 'MANUAL';
    data: IntelligenceReport;
    itemCount: number;
}

export interface IntelligenceReport {
  date: string;
  summary: string;
  news: NewsAnalysis[]; 
  investigations: AiInvestigation[]; 
  rawData?: RawDataResult[]; 
  opportunityMatrix: Opportunity[];
  commodities: CommodityForecast[];
  lastSentiment?: MarketSentiment;
}

// RAG Types - DO-178C
export interface RagDocument {
  id: string;          // 'rag_' + newsId
  newsId: string;      // referência à notícia original
  text: string;        // texto concatenado para embedding
  embedding: number[]; // vetor de embedding (768 dimensões)
  category: string;
  date: string;
  title: string;
}

export interface RagSearchResult {
  newsId: string;
  title: string;
  text: string;
  category: string;
  date: string;
  score: number; // 0-1 similaridade cosseno
}

export interface RagIndexStatus {
  totalNews: number;
  indexedDocs: number;
  lastIndexed: string | null;
  isIndexing: boolean;
}

export interface SystemLogEntry {
    timestamp: string;
    level: 'INFO' | 'WARN' | 'ERROR' | 'SUCCESS';
    module: string;
    message: string;
}

export const RODRIGO_PROFILE = `
Nome: Rodrigo Borin
Profissão: Engenheiro Mecânico + Desenvolvedor EA's Forex + Empresário Rural
Setores: Investimentos, Inteligência Artificial, Agronegócio (Cana, Pecuária, Soja, Amendoim, Eucalipto), Imobiliário, Forex/Trading
Localização: Jurerê, Florianópolis (SC)
Família: Pai de duas filhas (8 e 11 anos)
Bens: BMW 320i, Fazenda em Nova Morada (MS)
Projetos: Construtora SPE, Imobiliária (Aptos/Hotéis)
Interesses: Liberdade individual, segurança jurídica, ROI seguro, futuro das filhas, diversificação de culturas (Soja/Amendoim/Eucalipto).
`;

// CATEGORIAS BLINDADAS (BLUEPRINT 3.3.2)
export const DEFAULT_CATEGORIES = [
    // 1. Prioridade Rodrigo
    "🚨 Manchetes & Alertas",
    "⚖️ Política & STF (Leis)",
    "🌱 Agronegócio & Commodities",
    "💹 Forex & Finanças",
    "🏗️ Imobiliário & Construção SC",
    "🗽 Liberdade & Censura",
    
    // 2. Google News Standard (Full Spectrum)
    "🤖 Inteligência Artificial",
    "🇧🇷 Brasil",
    "🌍 Mundo",
    "💼 Negócios",
    "💻 Tecnologia",
    "🎬 Entretenimento",
    "⚽ Esportes",
    "🧬 Ciência",
    "🏥 Saúde"
];
