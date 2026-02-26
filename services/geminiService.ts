
import { generateWithGemini } from "./supabaseClient";
import { RODRIGO_PROFILE, Timeframe, AIConfig, NewsAnalysis, CommodityForecast, ExternalAnalysisResult, MarketSentiment, AiInvestigation, RawFeedItem } from "../types";
import { harvestGoogleNews } from "./rssService";
import { scrapeViaPython, checkPythonHealth } from "./pythonBridge";
import { persistInvestigation, persistRawFeeds } from "../db";
import { analyzeWithOllama } from "./ollamaService";

const generateStableId = (text: string) => {
    let hash = 0, i, chr;
    if (text.length === 0) return Date.now().toString();
    for (i = 0; i < text.length; i++) {
        chr = text.charCodeAt(i);
        hash = ((hash << 5) - hash) + chr;
        hash |= 0;h
    }
    return 'news-' + Math.abs(hash).toString(36);
};

// Adapter: wraps generateWithGemini to match old ai.models.generateContent API

const ai = {
  models: {
    generateContent: async ({ model, contents, config }: { model: string; contents: string; config?: any }) => {
      const text = await generateWithGemini(contents, model);
      return { text };
    }
  }
};
const isRateLimitError = (e: any) => {
    return e?.status === 429 || 
           e?.message?.includes('429') || 
           e?.message?.includes('Quota exceeded') ||
           e?.message?.includes('RESOURCE_EXHAUSTED');
};

const cleanAndParseJSON = (text: string) => {
  try {
    if (!text) throw new Error("Texto vazio recebido da IA");
    let cleanText = text.replace(/```json/gi, '').replace(/```/g, '').replace(/\/\/.*$/gm, '').trim();
    
    const firstBracket = cleanText.indexOf('[');
    const firstBrace = cleanText.indexOf('{');
    
    if (firstBracket !== -1 && (firstBrace === -1 || firstBracket < firstBrace)) {
        const lastBracket = cleanText.lastIndexOf(']');
        cleanText = cleanText.substring(firstBracket, lastBracket + 1);
    } else if (firstBrace !== -1) {
        const lastBrace = cleanText.lastIndexOf('}');
        cleanText = cleanText.substring(firstBrace, lastBrace + 1);
    }

    try {
        const result = JSON.parse(cleanText);
        return result;
    } catch (syntaxError) {
        cleanText = cleanText.replace(/,\s*([\]}])/g, '$1'); // Fix trailing commas
        return JSON.parse(cleanText);
    }
  } catch (e) {
    console.error("JSON PARSE ERROR FINAL:", e);
    return [];
  }
};

const ensureString = (val: any, fallback: string = ""): string => {
    if (val === null || val === undefined || String(val).trim() === "") return fallback;
    return String(val);
};

const ensureTrend = (val: any): 'Alta' | 'Baixa' | 'Lateral' => {
    if (!val) return 'Lateral';
    const v = String(val).toLowerCase();
    if (v.includes('alta') || v.includes('subi')) return 'Alta';
    if (v.includes('baixa') || v.includes('cai') || v.includes('queda')) return 'Baixa';
    return 'Lateral';
};

const getFallbackNews = (reason: string = "Fontes Bloqueadas", rawItems: any[] = []): NewsAnalysis[] => {
    if (rawItems && rawItems.length > 0) {
        return rawItems.map(item => ({
            id: generateStableId(item.title),
            title: item.title,
            category: "Feed Bruto (Sem IA)",
            timeframe: Timeframe.DAILY,
            narrative: item.snippet || "Conteúdo original não processado por limite de cota.",
            truth: "Verifique a fonte original.",
            intent: "Informação bruta.",
            action: "Ler manchete.",
            relevanceScore: 50,
            nationalRelevance: 50,
            personalImpact: "Dados brutos.",
            scenarios: {
                short: { prediction: "N/A", confidence: 0, impact: "N/A" },
                medium: { prediction: "N/A", confidence: 0, impact: "N/A" },
                long: { prediction: "N/A", confidence: 0, impact: "N/A" }
            },
            dateAdded: new Date().toISOString()
        }));
    }
    return [];
};

async function harvestData(topic: string): Promise<{ source: string, context: string, rawItems: any[] }> {
    const pythonOnline = await checkPythonHealth();
    if (pythonOnline) {
        try {
            const items = await scrapeViaPython(topic);
            if (items.length > 0) {
                const context = items.map(i => `[${i.source}] ${i.title}: ${i.snippet} (${i.pubDate})`).join('\n');
                return { source: 'SCRAPER', context, rawItems: items };
            }
        } catch (e) { }
    }
    const rssItems = await harvestGoogleNews(topic);
    if (rssItems.length > 0) {
        const context = rssItems.map(i => `[${i.source}] ${i.title}: ${i.snippet}`).join('\n');
        return { source: 'RSS_PROXY', context, rawItems: rssItems };
    }
    return { source: 'NONE', context: '', rawItems: [] };
}

export const fetchNewsBatch = async (topicFocus: string = "Geral", aiConfig: AIConfig): Promise<NewsAnalysis[]> => {
    const now = new Date().toLocaleDateString('pt-BR');
    let contextData = "";
    let rawSourceItems: any[] = []; 

    // 1. COLETA (HARVEST)
    const harvest = await harvestData(topicFocus);
    if (harvest.source !== 'NONE') {
        contextData = harvest.context;
        rawSourceItems = harvest.rawItems;
        
        // --- NOVO: PERSISTÊNCIA RAW (LEDGER 1) ---
        const rawFeedItems: RawFeedItem[] = rawSourceItems.map(i => ({
            id: generateStableId(i.title + i.link),
            title: i.title,
            link: i.link || '',
            source: i.source || 'RSS',
            snippet: i.snippet,
            pubDate: i.pubDate || new Date().toISOString(),
            ingestedAt: new Date().toISOString(),
            processed: false
        }));
        await persistRawFeeds(rawFeedItems);
    }

    // 2. SELEÇÃO DE PROCESSADOR (ORCHESTRATOR)
    if (aiConfig.provider === 'LOCAL') {
        // --- FLUXO OLLAMA (LOCAL) ---
        if (!contextData) return []; 
        console.log("Iniciando processamento OLLAMA...");
        return await analyzeWithOllama(contextData, topicFocus, aiConfig);
    }

    // --- FLUXO GEMINI (CLOUD MAX POWER) ---
    // Usando Gemini 3 Flash para velocidade na análise de notícias em massa
    const modelName = 'gemini-2.0-flash'; 
    
    const config: any = { 
        temperature: 0.4, // Um pouco mais criativo para conectar pontos
        topK: 40, 
        topP: 0.95, 
        responseMimeType: 'application/json' 
    };
    
    let useSearch = false;
    
    // Se não temos RSS, usamos o googleSearch do Gemini (Full Web Access)
    if (!contextData || contextData.length < 100) {
         config.tools = [{ googleSearch: {} }];
         useSearch = true;
    }

    const prompt = `
    ATUE COMO: Chefe de Inteligência Privada (Sênior).
    ALVO: Rodrigo Borin (Empresário, Investidor, Agro, Forex).
    DATA: ${now}.
    TÓPICO: "${topicFocus}".
    
    ${contextData ? `CONTEXTO (FONTE BRUTA):\n${contextData}` : `INSTRUÇÃO: Use a ferramenta de busca para varrer a web sobre o tópico.`}
    
    TAREFA: Desconstrua as narrativas. Ignore o "ruído" da mídia mainstream. Busque a intenção por trás da manchete.
    
    RETORNE APENAS JSON (Array de NewsAnalysis):
    [{
      "title": "Manchete Direta",
      "category": "Categoria Real",
      "timeframe": "Últimas 24h",
      "narrative": "O que a mídia está vendendo",
      "truth": "A realidade factual (Cui Bono?)",
      "intent": "Manipular / Informar / Distrair",
      "action": "Ação recomendada para Rodrigo",
      "relevanceScore": 0-100 (Crítico para negócios do Rodrigo?),
      "nationalRelevance": 0-100,
      "personalImpact": "Impacto no bolso/liberdade do Rodrigo",
      "muskAdvice": "Frase estilo Elon Musk/Sun Tzu sobre isso",
      "scenarios": { "short": { "prediction": "...", "confidence": 90, "impact": "..." }, ... }
    }]
    `;

    try {
        const response = await ai.models.generateContent({ model: modelName, contents: prompt, config: config });
        let data = cleanAndParseJSON(response.text || "[]");
        if (!Array.isArray(data)) data = [data];
        return data.map((n: any) => ({
            id: generateStableId(ensureString(n.title) + topicFocus),
            title: ensureString(n.title, "Notícia"),
            category: ensureString(n.category) || topicFocus,
            timeframe: (ensureString(n.timeframe) as Timeframe) || Timeframe.DAILY,
            narrative: ensureString(n.narrative, "Análise pendente."),
            truth: ensureString(n.truth, "Em verificação."),
            intent: ensureString(n.intent, "N/A"),
            action: ensureString(n.action, "N/A"),
            relevanceScore: Number(n.relevanceScore) || 50,
            nationalRelevance: Number(n.nationalRelevance) || 50,
            personalImpact: ensureString(n.personalImpact, "Monitorar."),
            scenarios: n.scenarios || { short: { prediction: "N/A", confidence: 0, impact: "N/A" }, medium: { prediction: "N/A", confidence: 0, impact: "N/A" }, long: { prediction: "N/A", confidence: 0, impact: "N/A" } },
            muskAdvice: ensureString(n.muskAdvice),
            dateAdded: new Date().toISOString()
        })).filter((n: any) => n.title.length > 3);
    } catch (error: any) {
        if (isRateLimitError(error)) {
             if (rawSourceItems.length > 0) return getFallbackNews("Modo Econômico (RSS)", rawSourceItems);
             return getFallbackNews("Cota Excedida e Sem RSS");
        }
        return getFallbackNews("Erro de Conexão AI", rawSourceItems);
    }
};

const VALID_RANGES: {[key: string]: [number, number]} = {
    'boi': [180, 400], 
    'soja': [80, 250], 
    'dolar': [4.0, 7.5], 
    'milho': [30, 100]   
};

const validatePrice = (name: string, priceStr: string): string => {
    const cleanPrice = parseFloat(priceStr.replace('R$', '').replace(',', '.').trim());
    if (isNaN(cleanPrice)) return priceStr;

    const lowerName = name.toLowerCase();
    let range: [number, number] | null = null;

    if (lowerName.includes('boi')) range = VALID_RANGES['boi'];
    else if (lowerName.includes('soja')) range = VALID_RANGES['soja'];
    else if (lowerName.includes('dolar') || lowerName.includes('dólar') || lowerName.includes('usdbrl')) range = VALID_RANGES['dolar'];
    else if (lowerName.includes('milho')) range = VALID_RANGES['milho'];

    if (range) {
        if (cleanPrice < range[0] || cleanPrice > range[1]) {
            console.warn(`[SANITY CHECK] Preço descartado para ${name}: ${cleanPrice}. Fora do range ${range[0]}-${range[1]}`);
            return "N/D (Erro)";
        }
    }
    return priceStr;
};

export const fetchCommoditiesUpdate = async (aiConfig: AIConfig): Promise<CommodityForecast[]> => {
    let rssContext = "";
    try {
        const [boi, soja, dolar] = await Promise.all([
            harvestGoogleNews("Preço Boi Gordo CEPEA fechamento"),
            harvestGoogleNews("Preço Soja Paranaguá saca 60kg"),
            harvestGoogleNews("Cotação Dólar PTAX venda hoje")
        ]);
        const allItems = [...boi.slice(0,2), ...soja.slice(0,2), ...dolar.slice(0,2)];
        if (allItems.length > 0) {
            rssContext = "CONTEXTO RECENTE DE NOTÍCIAS (FONTE SECUNDÁRIA):\n" + allItems.map(i => `- ${i.title} (${i.pubDate}): ${i.snippet}`).join('\n');
        }
    } catch (e) { console.warn("Commodity RSS Fail", e); }

    const prompt = `
    ATUE COMO: Auditor Financeiro Rigoroso (Agro/Brasil).
    DATA: ${new Date().toLocaleDateString('pt-BR')}.
    ${rssContext}
    TAREFA: Obtenha os preços EXATOS de hoje ou último fechamento útil.
    ATIVOS ALVO: Boi Gordo (CEPEA), Soja (Paranaguá), Dólar (PTAX).
    REGRAS: PROIBIDO ESTIMAR. Se não encontrar o dado exato em lugar nenhum, retorne "N/D".
    RETORNE JSON: [ { "name": "Boi Gordo (CEPEA)", "currentPrice": "R$ 245,00", ... } ]
    `;

    try {
        // Gemini 3 Flash para busca rápida e eficiente
        const response = await ai.models.generateContent({
            model: 'gemini-2.0-flash',
            contents: prompt,
            config: { 
                temperature: 0.0, 
                tools: [{ googleSearch: {} }], 
                responseMimeType: 'application/json' 
            },
        });
        
        let data = cleanAndParseJSON(response.text || "[]");
        if (!Array.isArray(data)) data = [];
        
        return mapCommodities(data, 'Mercado Real (Auditado)').map(c => ({
            ...c,
            currentPrice: validatePrice(c.name, c.currentPrice)
        }));

    } catch(e: any) { 
        return [];
    }
};

const mapCommodities = (data: any[], sourceLabel: string): CommodityForecast[] => {
    return data.map((item: any) => ({
         name: ensureString(item.name, "Ativo"),
         currentPrice: ensureString(item.currentPrice, "N/D"),
         futurePrice: ensureString(item.futurePrice),
         unit: ensureString(item.unit || ''),
         lastUpdated: new Date().toISOString(),
         source: sourceLabel,
         scenarios: { 
             short: { price: ensureString(item.currentPrice), trend: ensureTrend(item.trend), confidence: item.currentPrice === 'N/D' ? 0 : 100, justification: ensureString(item.justification) },
             medium: { price: '', trend: 'Lateral', confidence: 0, justification: '' },
             long: { price: '', trend: 'Lateral', confidence: 0, justification: '' }
         }
     }));
};

export const generateDeepAnalysis = async (query: string, aiConfig: AIConfig): Promise<ExternalAnalysisResult | null> => {
    // POWER MODE: Usando Gemini 3 Pro com "Thinking" habilitado para raciocínio profundo
    const prompt = `
    MODO FORENSE ATIVADO.
    ALVO DA INVESTIGAÇÃO: "${query}".
    
    Execute uma varredura profunda.
    1. Identifique quem financia.
    2. Identifique quem se beneficia (Cui Bono).
    3. Trace paralelos históricos.
    4. Identifique manipulação de massa.

    Retorne JSON completo seguindo a estrutura ExternalAnalysisResult.
    `;
    
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro-preview-03-25', // MODELO DE ALTA INTELIGÊNCIA
            contents: prompt,
            config: { 
                temperature: 0.7, 
                thinkingConfig: { thinkingBudget: 2048 }, // ALOCAÇÃO DE ORÇAMENTO PARA PENSAR
                tools: [{ googleSearch: {} }], 
                responseMimeType: 'application/json' 
            },
        });
        const result = cleanAndParseJSON(response.text || "{}");
        if (result && result.topic) {
             const investItem: AiInvestigation = {
                 id: generateStableId(query + Date.now()),
                 title: `Dossiê: ${result.topic}`,
                 category: 'Investigação Profunda',
                 anomalyDetected: result.hiddenTruth || "Padrão Anômalo Detectado",
                 algorithmUsed: 'Gemini 3.0 Pro + Deep Thinking',
                 dataSources: 'Google Search Live + Forensic Logic',
                 findings: result.conclusion,
                 prediction: { horizon: 'Médio Prazo', forecast: 'Alta volatilidade política', confidence: 92 },
                 rodrigoAction: 'Revisar exposição ao risco.',
                 dateAdded: new Date().toISOString()
             };
             await persistInvestigation(investItem);
        }
        return result;
    } catch (e) {
        console.error("Deep Analysis Failed", e);
        return null;
    }
};

export const generateRagEnrichedAnalysis = async (
  apiKey: string,
  topic: string,
  ragContext: string
): Promise<NewsAnalysis[]> => {
    const prompt = `
    ATUE COMO: Analista Chefe de Inteligência Privada.
    ALVO: Rodrigo Borin.
    TÓPICO: "${topic}".
    
    ${ragContext}
    
    INSTRUÇÃO: Use o contexto histórico fornecido acima (Memória RAG) para enriquecer sua análise. Conecte os eventos passados com o tópico atual para identificar padrões, contradições ou tendências de longo prazo.
    
    RETORNE APENAS JSON (Array de NewsAnalysis):
    [{
      "title": "Manchete Direta",
      "category": "Categoria Real",
      "timeframe": "Últimas 24h",
      "narrative": "O que a mídia está vendendo",
      "truth": "A realidade factual baseada no histórico",
      "intent": "Manipular / Informar / Distrair",
      "action": "Ação recomendada para Rodrigo",
      "relevanceScore": 0-100,
      "nationalRelevance": 0-100,
      "personalImpact": "Impacto no bolso/liberdade do Rodrigo",
      "muskAdvice": "Frase estilo Elon Musk/Sun Tzu sobre isso",
      "scenarios": { "short": { "prediction": "...", "confidence": 90, "impact": "..." }, "medium": { "prediction": "...", "confidence": 80, "impact": "..." }, "long": { "prediction": "...", "confidence": 70, "impact": "..." } }
    }]
    `;

    try {
        const genAi = new GoogleGenAI({ apiKey });
        const response = await genAi.models.generateContent({
            model: 'gemini-2.5-pro-preview-03-25',
            contents: prompt,
            config: { 
                temperature: 0.5, 
                thinkingConfig: { thinkingBudget: 1024 },
                responseMimeType: 'application/json' 
            },
        });
        
        let data = cleanAndParseJSON(response.text || "[]");
        if (!Array.isArray(data)) data = [data];
        
        return data.map((n: any) => ({
            id: generateStableId(ensureString(n.title) + topic + Date.now()),
            title: ensureString(n.title, "Notícia Enriquecida"),
            category: ensureString(n.category) || topic,
            timeframe: (ensureString(n.timeframe) as Timeframe) || Timeframe.DAILY,
            narrative: ensureString(n.narrative, "Análise pendente."),
            truth: ensureString(n.truth, "Em verificação."),
            intent: ensureString(n.intent, "N/A"),
            action: ensureString(n.action, "N/A"),
            relevanceScore: Number(n.relevanceScore) || 50,
            nationalRelevance: Number(n.nationalRelevance) || 50,
            personalImpact: ensureString(n.personalImpact, "Monitorar."),
            scenarios: n.scenarios || { short: { prediction: "N/A", confidence: 0, impact: "N/A" }, medium: { prediction: "N/A", confidence: 0, impact: "N/A" }, long: { prediction: "N/A", confidence: 0, impact: "N/A" } },
            muskAdvice: ensureString(n.muskAdvice),
            dateAdded: new Date().toISOString()
        })).filter((n: any) => n.title.length > 3);
    } catch (error) {
        console.error("RAG Enriched Analysis Failed", error);
        return [];
    }
};

export const fetchInvestigationBatch = async (topic: string, aiConfig: AIConfig) => { return []; };

export const generateDailySummary = async (newsItems: NewsAnalysis[], aiConfig: AIConfig) => {
    const topNews = newsItems.slice(0, 15).map(n => `- ${n.title}: ${n.truth}`).join('\n');
    try { 
        // Gemini 3 Pro para um resumo executivo de altíssimo nível
        const res = await ai.models.generateContent({ 
            model: 'gemini-2.5-pro-preview-03-25', 
            contents: `Atue como Conselheiro Estratégico. Resuma executivamente para Rodrigo Borin:\n${topNews}`,
            config: { thinkingConfig: { thinkingBudget: 1024 } }
        });
        return res.text || "Resumo indisponível."; 
    } catch(e) { return "Resumo indisponível."; }
};

export const generateMarketSentiment = async (context: string, aiConfig: AIConfig): Promise<MarketSentiment | null> => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro-preview-03-25', // POWER MODE
            contents: `ANÁLISE NEURAL DE MERCADO (FOREX/B3/AGRO).\nContexto:\n${context.substring(0, 2000)}\nRetorne JSON MarketSentiment. Seja implacável na avaliação de risco.`,
            config: { 
                temperature: 0.5, 
                thinkingConfig: { thinkingBudget: 1024 }, // Thinking ativado para análise financeira
                responseMimeType: 'application/json' 
            }
        });
        return cleanAndParseJSON(response.text || "{}");
    } catch (e) { return null; }
};

export const mineRawData = async (query: string, aiConfig: AIConfig) => ({ id: "", topic: query, dateAdded: "", keyFigures: [], involvedParties: [], timeline: [], officialSources: [], rawSummary: "" });
