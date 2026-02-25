
import { openDB, DBSchema } from 'idb';
import { IntelligenceReport, NewsAnalysis, RawDataResult, MemorySnapshot, Timeframe, AiInvestigation, RawFeedItem, RagDocument } from './types';
import { v4 as uuidv4 } from 'uuid';

interface TruePressDB extends DBSchema {
  news: { // STORE 1: PROCESSADO (AI)
    key: string;
    value: NewsAnalysis;
    indexes: { 'by-date': string };
  };
  raw_feeds: { // STORE 2: BRUTO (RAW) - NOVO LEDGER
    key: string;
    value: RawFeedItem;
    indexes: { 'by-ingested': string };
  };
  investigations: {
    key: string;
    value: AiInvestigation;
  };
  reports: { // Estado Atual (Current State)
    key: string;
    value: IntelligenceReport;
  };
  rawdata: { 
    key: string;
    value: RawDataResult;
  };
  snapshots: { // Time Machine (Backup Slots)
    key: string;
    value: MemorySnapshot;
    indexes: { 'by-timestamp': string };
  };
  embeddings: { // RAG Embeddings
    key: string;
    value: RagDocument;
    indexes: { 'by-newsId': string, 'by-date': string };
  };
}

const DB_NAME = 'truepress-db-v2'; 
const DB_VERSION = 3; 
const BLACKBOX_KEY = 'truepress_blackbox_full'; // DADOS COMPLETOS (NOVO)

const sanitizeNewsItem = (item: any): NewsAnalysis => {
    return {
        id: item.id || uuidv4(),
        title: item.title || "Item Recuperado",
        category: item.category || "Arquivo",
        timeframe: item.timeframe || Timeframe.DAILY,
        narrative: item.narrative || item.summary || "N/A",
        intent: item.intent || "N/A",
        action: item.action || "N/A",
        truth: item.truth || item.narrative || "Verificação pendente.",
        relevanceScore: typeof item.relevanceScore === 'number' ? item.relevanceScore : 50,
        nationalRelevance: typeof item.nationalRelevance === 'number' ? item.nationalRelevance : 50,
        personalImpact: item.personalImpact || "N/A",
        scenarios: item.scenarios || {
            short: { prediction: "N/A", confidence: 0, impact: "N/A" },
            medium: { prediction: "N/A", confidence: 0, impact: "N/A" },
            long: { prediction: "N/A", confidence: 0, impact: "N/A" }
        },
        muskAdvice: item.muskAdvice,
        dateAdded: item.dateAdded || new Date().toISOString()
    };
};

export const initDB = async () => {
  return openDB<TruePressDB>(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion, newVersion, transaction) {
      if (!db.objectStoreNames.contains('news')) {
        const newsStore = db.createObjectStore('news', { keyPath: 'id' });
        newsStore.createIndex('by-date', 'dateAdded');
      }
      if (!db.objectStoreNames.contains('raw_feeds')) {
        const rawStore = db.createObjectStore('raw_feeds', { keyPath: 'id' });
        rawStore.createIndex('by-ingested', 'ingestedAt');
      }
      if (!db.objectStoreNames.contains('investigations')) {
        db.createObjectStore('investigations', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('reports')) {
        db.createObjectStore('reports', { keyPath: 'date' });
      }
      if (!db.objectStoreNames.contains('rawdata')) {
         db.createObjectStore('rawdata', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('snapshots')) {
         const snapStore = db.createObjectStore('snapshots', { keyPath: 'id' });
         snapStore.createIndex('by-timestamp', 'timestamp');
      }
      if (!db.objectStoreNames.contains('embeddings')) {
         const embStore = db.createObjectStore('embeddings', { keyPath: 'id' });
         embStore.createIndex('by-newsId', 'newsId');
         embStore.createIndex('by-date', 'date');
      }
    },
  });
};

export const wipeDatabase = async () => {
    try {
        const db = await initDB();
        const tx = db.transaction(['news', 'reports', 'rawdata', 'snapshots', 'investigations', 'raw_feeds', 'embeddings'], 'readwrite');
        await tx.objectStore('news').clear();
        await tx.objectStore('reports').clear();
        await tx.objectStore('rawdata').clear();
        await tx.objectStore('snapshots').clear();
        await tx.objectStore('investigations').clear();
        await tx.objectStore('raw_feeds').clear();
        await tx.objectStore('embeddings').clear();
        await tx.done;
        localStorage.clear();
        console.log("Database Wiped Successfully");
    } catch (e) {
        console.error("Failed to wipe database", e);
    }
};

// --- CORE PERSISTENCE ---

// Funções Auxiliares Blackbox (LocalStorage Mirror)
const saveToBlackbox = (items: NewsAnalysis[]) => {
    try {
        // Salva os últimos 300 itens no LocalStorage como string (sobrevive a resets de IDB no mesmo origin)
        // Isso é uma redundância síncrona.
        const safeData = JSON.stringify(items.slice(0, 300));
        localStorage.setItem(BLACKBOX_KEY, safeData);
        console.log(`[BLACKBOX] ${items.length} itens salvos no cofre.`);
    } catch (e) {
        console.warn("[BLACKBOX] Falha ao salvar (Quota Exceeded?)", e);
    }
};

const recoverFromBlackbox = (): NewsAnalysis[] => {
    try {
        const raw = localStorage.getItem(BLACKBOX_KEY);
        if (raw) {
            const data = JSON.parse(raw);
            console.log(`[BLACKBOX] ${data.length} itens recuperados do cofre de emergência.`);
            return data.map(sanitizeNewsItem);
        }
    } catch (e) { console.error(e); }
    return [];
};

export const persistRawFeeds = async (items: RawFeedItem[]) => {
    try {
        const db = await initDB();
        const tx = db.transaction('raw_feeds', 'readwrite');
        const store = tx.objectStore('raw_feeds');
        for (const item of items) {
            await store.put(item);
        }
        await tx.done;
        return true;
    } catch (e) {
        console.error("Persist Raw Feeds Error:", e);
        return false;
    }
};

export const persistNewsItems = async (items: NewsAnalysis[]) => {
    try {
        const db = await initDB();
        const tx = db.transaction('news', 'readwrite');
        const store = tx.objectStore('news');
        for (const item of items) {
            await store.put(sanitizeNewsItem(item));
        }
        await tx.done;

        // ATUALIZAÇÃO SÍNCRONA DO BLACKBOX (CRÍTICO)
        // Pega tudo que temos agora e atualiza o LocalStorage imediatamente
        const allNews = await db.getAll('news');
        saveToBlackbox(allNews);

        return true;
    } catch (e) {
        console.error("Persist News Error:", e);
        return false;
    }
};

export const persistInvestigation = async (item: AiInvestigation) => {
    try {
        const db = await initDB();
        await db.put('investigations', item);
    } catch (e) {
        console.error("Persist Investigation Error:", e);
    }
};

// --- SNAPSHOT SYSTEM (TIME MACHINE) ---

export const saveSnapshot = async (report: IntelligenceReport, name: string, type: 'AUTO' | 'MANUAL' = 'MANUAL') => {
    try {
        const db = await initDB();
        
        const snapshot: MemorySnapshot = {
            id: uuidv4(),
            name,
            timestamp: new Date().toISOString(),
            type,
            data: report,
            itemCount: report.news.length
        };
        
        await db.put('snapshots', snapshot);
        
        // Salva também como "estado atual"
        await saveCurrentState(report);

        return snapshot.id;
    } catch (e) {
        console.error("Snapshot Save Failed:", e);
        return null;
    }
};

export const listSnapshots = async (): Promise<MemorySnapshot[]> => {
    try {
        const db = await initDB();
        const snaps = await db.getAll('snapshots');
        return snaps.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    } catch { return []; }
};

export const loadSnapshot = async (id: string): Promise<IntelligenceReport | null> => {
    try {
        const db = await initDB();
        const snap = await db.get('snapshots', id);
        if (snap) {
            await saveCurrentState(snap.data);
            return snap.data;
        }
        return null;
    } catch { return null; }
};

export const deleteSnapshot = async (id: string) => {
    const db = await initDB();
    await db.delete('snapshots', id);
};

// --- STATE MANAGEMENT ---

export const saveCurrentState = async (report: IntelligenceReport) => {
    try {
        const db = await initDB();
        const cleanReport = JSON.parse(JSON.stringify(report));
        cleanReport.date = 'current-state'; 
        await db.put('reports', cleanReport);
        
        // Se houver notícias novas no report que não estão no blackbox, salva agora
        if (report.news && report.news.length > 0) {
            saveToBlackbox(report.news);
        }

    } catch (e) { console.error("Save Current State Failed", e); }
};

// ALIAS
export const saveReport = saveCurrentState;

export const loadCurrentState = async (): Promise<IntelligenceReport | null> => {
    try {
        const db = await initDB();
        
        // 1. Tenta carregar o objeto container 'current-state'
        let state = await db.get('reports', 'current-state');
        
        // 2. Recuperação Híbrida: Pega do IDB News Store
        let allNews = await db.getAll('news');
        
        // 3. AUTO-HEAL: SE O BANCO ESTIVER VAZIO, TENTA O BLACKBOX (Emergência)
        if (allNews.length === 0) {
            const blackboxNews = recoverFromBlackbox();
            if (blackboxNews.length > 0) {
                console.warn("[DB] Banco IDB vazio! Restaurando do Blackbox (LocalStorage)...");
                allNews = blackboxNews;
                // Auto-heal: Reinsere no banco principal para corrigir
                const tx = db.transaction('news', 'readwrite');
                for (const n of allNews) await tx.store.put(n);
                await tx.done;
            }
        }

        const allInvest = await db.getAll('investigations');

        if (!state) {
             state = {
                date: 'current-state',
                summary: 'Estado restaurado.',
                news: [],
                investigations: [],
                opportunityMatrix: [],
                commodities: []
             };
        }

        // Mescla inteligente para garantir que não percamos nada
        const uniqueNewsMap = new Map();
        if (state.news) state.news.forEach((n: NewsAnalysis) => uniqueNewsMap.set(n.id, n));
        allNews.forEach(n => uniqueNewsMap.set(n.id, n));

        // Ordenação
        state.news = Array.from(uniqueNewsMap.values()).map(sanitizeNewsItem).sort((a,b) => new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime());
        
        // Investigações
        const uniqueInvestMap = new Map();
        if (state.investigations) state.investigations.forEach((i: AiInvestigation) => uniqueInvestMap.set(i.id, i));
        allInvest.forEach(i => uniqueInvestMap.set(i.id, i));
        state.investigations = Array.from(uniqueInvestMap.values()).sort((a,b) => new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime());

        return state;
    } catch (e) { 
        console.error("Load Current State Failed", e);
        return null; 
    }
};

export const getAllNews = async (): Promise<NewsAnalysis[]> => {
    const db = await initDB();
    const items = await db.getAll('news');
    if (items.length === 0) return recoverFromBlackbox(); // Fallback imediato
    return items.map(sanitizeNewsItem);
};

export const getAllRawData = async (): Promise<RawDataResult[]> => {
    const db = await initDB();
    return await db.getAll('rawdata');
};

// --- RAG EMBEDDINGS ---

export const saveEmbedding = async (doc: RagDocument) => {
    try {
        const db = await initDB();
        await db.put('embeddings', doc);
    } catch (e) {
        console.error("Save Embedding Error:", e);
    }
};

export const getEmbeddingByNewsId = async (newsId: string): Promise<RagDocument | undefined> => {
    try {
        const db = await initDB();
        return await db.getFromIndex('embeddings', 'by-newsId', newsId);
    } catch (e) {
        return undefined;
    }
};

export const getAllEmbeddings = async (): Promise<RagDocument[]> => {
    try {
        const db = await initDB();
        return await db.getAll('embeddings');
    } catch (e) {
        return [];
    }
};

export const deleteEmbedding = async (id: string) => {
    try {
        const db = await initDB();
        await db.delete('embeddings', id);
    } catch (e) {
        console.error("Delete Embedding Error:", e);
    }
};

export const getEmbeddingCount = async (): Promise<number> => {
    try {
        const db = await initDB();
        return await db.count('embeddings');
    } catch (e) {
        return 0;
    }
};

// --- IMPORT/EXPORT SYSTEM ---

export const exportDatabase = async () => {
    try {
        const db = await initDB();
        const news = await db.getAll('news');
        // Se IDB falhar, tenta blackbox
        const exportNews = news.length > 0 ? news : recoverFromBlackbox();
        
        const investigations = await db.getAll('investigations');
        const rawdata = await db.getAll('rawdata');
        const snapshots = await db.getAll('snapshots');
        const report = await loadCurrentState();

        const exportData = {
            version: 2,
            timestamp: new Date().toISOString(),
            news: exportNews,
            investigations,
            snapshots,
            rawdata,
            report
        };

        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `truepress_FULL_BACKUP_${new Date().toISOString().slice(0,10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    } catch (e) {
        console.error("Export Failed", e);
        alert("Erro ao exportar dados.");
    }
};

export const importDatabase = async (file: File): Promise<{count: number, news: NewsAnalysis[], report?: IntelligenceReport}> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const text = e.target?.result as string;
                if (!text) throw new Error("Arquivo vazio");
                const data = JSON.parse(text);
                
                const db = await initDB();
                const tx = db.transaction(['news', 'reports', 'investigations', 'rawdata', 'snapshots', 'raw_feeds'], 'readwrite');
                
                let count = 0;

                // Import News
                const items = data.news || data.data || [];
                const importedNews = [];
                for (const item of items) {
                    const sane = sanitizeNewsItem(item);
                    await tx.objectStore('news').put(sane);
                    importedNews.push(sane);
                    count++;
                }

                // Import Investigations
                if (data.investigations) {
                    for (const item of data.investigations) {
                        await tx.objectStore('investigations').put(item);
                    }
                }
                
                // Import Snapshots
                if (data.snapshots) {
                    for (const item of data.snapshots) {
                        await tx.objectStore('snapshots').put(item);
                    }
                }

                await tx.done;
                
                // Atualiza Blackbox imediatamente
                saveToBlackbox(importedNews);

                const allNews = await getAllNews();
                const report = await loadCurrentState();
                
                resolve({ count, news: allNews, report: report || undefined });
            } catch (err) {
                console.error("Import Error", err);
                reject(err);
            }
        };
        reader.onerror = () => reject(new Error("Erro de leitura"));
        reader.readAsText(file);
    });
};
