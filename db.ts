// db.ts
// DO-178C Level A | True Press v3.6.0
// Backend: Supabase (permanente) + IndexedDB (fallback local/offline)
// MAXIMO 500 LINHAS

import { openDB, DBSchema } from 'idb';
import { IntelligenceReport, NewsAnalysis, RawDataResult, MemorySnapshot, Timeframe, AiInvestigation, RawFeedItem, RagDocument } from './types';
import { v4 as uuidv4 } from 'uuid';
import {
  saveNewsToSupabase,
  getNewsFromSupabase,
  saveEmbeddingToSupabase,
  saveSnapshotToSupabase,
  getSnapshotsFromSupabase,
} from './services/supabaseClient';

interface TruePressDB extends DBSchema {
  news: { key: string; value: NewsAnalysis; indexes: { 'by-date': string }; };
  raw_feeds: { key: string; value: RawFeedItem; indexes: { 'by-ingested': string }; };
  investigations: { key: string; value: AiInvestigation; };
  reports: { key: string; value: IntelligenceReport; };
  rawdata: { key: string; value: RawDataResult; };
  snapshots: { key: string; value: MemorySnapshot; indexes: { 'by-timestamp': string }; };
  embeddings: { key: string; value: RagDocument; indexes: { 'by-newsId': string; 'by-date': string }; };
}

const DB_NAME = 'truepress-db-v2';
const DB_VERSION = 3;
const BLACKBOX_KEY = 'truepress_blackbox_full';

const sanitizeNewsItem = (item: any): NewsAnalysis => ({
  id: item.id || uuidv4(),
  title: item.title || 'Item Recuperado',
  category: item.category || 'Arquivo',
  timeframe: item.timeframe || Timeframe.DAILY,
  narrative: item.narrative || item.summary || 'N/A',
  intent: item.intent || 'N/A',
  action: item.action || 'N/A',
  truth: item.truth || item.narrative || 'Verificacao pendente.',
  relevanceScore: typeof item.relevanceScore === 'number' ? item.relevanceScore : 50,
  nationalRelevance: typeof item.nationalRelevance === 'number' ? item.nationalRelevance : 50,
  personalImpact: item.personalImpact || 'N/A',
  scenarios: item.scenarios || {
    short: { prediction: 'N/A', confidence: 0, impact: 'N/A' },
    medium: { prediction: 'N/A', confidence: 0, impact: 'N/A' },
    long: { prediction: 'N/A', confidence: 0, impact: 'N/A' },
  },
  muskAdvice: item.muskAdvice,
  dateAdded: item.dateAdded || new Date().toISOString(),
});

export const initDB = async () => {
  return openDB<TruePressDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('news')) db.createObjectStore('news', { keyPath: 'id' }).createIndex('by-date', 'dateAdded');
      if (!db.objectStoreNames.contains('raw_feeds')) db.createObjectStore('raw_feeds', { keyPath: 'id' }).createIndex('by-ingested', 'ingestedAt');
      if (!db.objectStoreNames.contains('investigations')) db.createObjectStore('investigations', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('reports')) db.createObjectStore('reports', { keyPath: 'date' });
      if (!db.objectStoreNames.contains('rawdata')) db.createObjectStore('rawdata', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('snapshots')) db.createObjectStore('snapshots', { keyPath: 'id' }).createIndex('by-timestamp', 'timestamp');
      if (!db.objectStoreNames.contains('embeddings')) {
        const s = db.createObjectStore('embeddings', { keyPath: 'id' });
        s.createIndex('by-newsId', 'newsId');
        s.createIndex('by-date', 'date');
      }
    },
  });
};

const saveToBlackbox = (items: NewsAnalysis[]) => {
  try {
    localStorage.setItem(BLACKBOX_KEY, JSON.stringify(items.slice(0, 300)));
    console.log('[BLACKBOX] ' + items.length + ' itens salvos no cofre.');
  } catch (e) { console.warn('[BLACKBOX] Falha:', e); }
};

const recoverFromBlackbox = (): NewsAnalysis[] => {
  try {
    const raw = localStorage.getItem(BLACKBOX_KEY);
    if (raw) {
      const d = JSON.parse(raw);
      console.log('[BLACKBOX] ' + d.length + ' itens recuperados.');
      return d.map(sanitizeNewsItem);
    }
  } catch (e) { console.error(e); }
  return [];
};

export const wipeDatabase = async () => {
  try {
    const db = await initDB();
    const stores = ['news','reports','rawdata','snapshots','investigations','raw_feeds','embeddings'] as const;
    const tx = db.transaction(stores, 'readwrite');
    for (const s of stores) await tx.objectStore(s).clear();
    await tx.done;
    localStorage.clear();
    console.log('Database Wiped');
  } catch (e) { console.error('wipeDatabase error', e); }
};

export const persistRawFeeds = async (items: RawFeedItem[]) => {
  try {
    const db = await initDB();
    const tx = db.transaction('raw_feeds', 'readwrite');
    for (const item of items) await tx.store.put(item);
    await tx.done;
    return true;
  } catch (e) { console.error('persistRawFeeds error:', e); return false; }
};

export const persistNewsItems = async (items: NewsAnalysis[]) => {
  try {
    const sanitized = items.map(sanitizeNewsItem);
    for (const item of sanitized) {
      await saveNewsToSupabase(item).catch(e => console.warn('[DB] Supabase saveNews falhou:', e));
    }
    const db = await initDB();
    const tx = db.transaction('news', 'readwrite');
    for (const item of sanitized) await tx.store.put(item);
    await tx.done;
    const allNews = await db.getAll('news');
    saveToBlackbox(allNews);
    return true;
  } catch (e) { console.error('persistNewsItems error:', e); return false; }
};

export const persistInvestigation = async (item: AiInvestigation) => {
  try { const db = await initDB(); await db.put('investigations', item); }
  catch (e) { console.error('persistInvestigation error:', e); }
};

export const saveSnapshot = async (report: IntelligenceReport, name: string, type: 'AUTO' | 'MANUAL' = 'MANUAL') => {
  try {
    const db = await initDB();
    const snapshot: MemorySnapshot = { id: uuidv4(), name, timestamp: new Date().toISOString(), type, data: report, itemCount: report.news.length };
    await saveSnapshotToSupabase(snapshot).catch(e => console.warn('[DB] Supabase snapshot falhou:', e));
    await db.put('snapshots', snapshot);
    await saveCurrentState(report);
    return snapshot.id;
  } catch (e) { console.error('saveSnapshot error:', e); return null; }
};

export const listSnapshots = async (): Promise<MemorySnapshot[]> => {
  try {
    const sbSnaps = await getSnapshotsFromSupabase().catch(() => [] as MemorySnapshot[]);
    if (sbSnaps.length > 0) return sbSnaps;
    const db = await initDB();
    const snaps = await db.getAll('snapshots');
    return snaps.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  } catch { return []; }
};

export const loadSnapshot = async (id: string): Promise<IntelligenceReport | null> => {
  try {
    const db = await initDB();
    const snap = await db.get('snapshots', id);
    if (snap) { await saveCurrentState(snap.data); return snap.data; }
    return null;
  } catch { return null; }
};

export const deleteSnapshot = async (id: string) => {
  const db = await initDB();
  await db.delete('snapshots', id);
};

export const saveCurrentState = async (report: IntelligenceReport) => {
  try {
    const db = await initDB();
    const clean = JSON.parse(JSON.stringify(report));
    clean.date = 'current-state';
    await db.put('reports', clean);
    if (report.news?.length > 0) saveToBlackbox(report.news);
  } catch (e) { console.error('saveCurrentState error:', e); }
};

export const saveReport = saveCurrentState;

export const loadCurrentState = async (): Promise<IntelligenceReport | null> => {
  try {
    const db = await initDB();
    let state = await db.get('reports', 'current-state');
    let sbNews: NewsAnalysis[] = [];
    try { sbNews = await getNewsFromSupabase(500); } catch (e) { console.warn('[DB] Supabase getNews falhou:', e); }
    let localNews = await db.getAll('news');
    if (localNews.length === 0 && sbNews.length === 0) {
      const bb = recoverFromBlackbox();
      if (bb.length > 0) {
        localNews = bb;
        const tx = db.transaction('news', 'readwrite');
        for (const n of localNews) await tx.store.put(n);
        await tx.done;
      }
    }
    const allInvest = await db.getAll('investigations');
    if (!state) state = { date: 'current-state', summary: 'Estado restaurado.', news: [], investigations: [], opportunityMatrix: [], commodities: [] };
    const uniqueMap = new Map<string, NewsAnalysis>();
    if (state.news) state.news.forEach((n: NewsAnalysis) => uniqueMap.set(n.id, n));
    localNews.forEach(n => uniqueMap.set(n.id, n));
    sbNews.forEach(n => uniqueMap.set(n.id, sanitizeNewsItem(n)));
    state.news = Array.from(uniqueMap.values()).map(sanitizeNewsItem).sort((a, b) => new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime());
    const investMap = new Map<string, AiInvestigation>();
    if (state.investigations) state.investigations.forEach((i: AiInvestigation) => investMap.set(i.id, i));
    allInvest.forEach(i => investMap.set(i.id, i));
    state.investigations = Array.from(investMap.values()).sort((a, b) => new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime());
    return state;
  } catch (e) { console.error('loadCurrentState error:', e); return null; }
};

export const getAllNews = async (): Promise<NewsAnalysis[]> => {
  try {
    const sbNews = await getNewsFromSupabase(500);
    if (sbNews.length > 0) return sbNews.map(sanitizeNewsItem);
  } catch (e) { console.warn('[DB] Supabase getAllNews falhou:', e); }
  const db = await initDB();
  const items = await db.getAll('news');
  if (items.length === 0) return recoverFromBlackbox();
  return items.map(sanitizeNewsItem);
};

export const getAllRawData = async (): Promise<RawDataResult[]> => {
  const db = await initDB();
  return await db.getAll('rawdata');
};

export const saveEmbedding = async (doc: RagDocument) => {
  try {
    await saveEmbeddingToSupabase(doc).catch(e => console.warn('[DB] Supabase saveEmbedding falhou:', e));
    const db = await initDB();
    await db.put('embeddings', doc);
  } catch (e) { console.error('saveEmbedding error:', e); }
};

export const getEmbeddingByNewsId = async (newsId: string): Promise<RagDocument | undefined> => {
  try { const db = await initDB(); return await db.getFromIndex('embeddings', 'by-newsId', newsId); }
  catch { return undefined; }
};

export const getAllEmbeddings = async (): Promise<RagDocument[]> => {
  try { const db = await initDB(); return await db.getAll('embeddings'); }
  catch { return []; }
};

export const deleteEmbedding = async (id: string) => {
  try { const db = await initDB(); await db.delete('embeddings', id); }
  catch (e) { console.error('deleteEmbedding error:', e); }
};

export const getEmbeddingCount = async (): Promise<number> => {
  try { const db = await initDB(); return await db.count('embeddings'); }
  catch { return 0; }
};

export const exportDatabase = async () => {
  try {
    const db = await initDB();
    const news = await db.getAll('news');
    const exportNews = news.length > 0 ? news : recoverFromBlackbox();
    const blob = new Blob([JSON.stringify({ version: 3, timestamp: new Date().toISOString(), news: exportNews, investigations: await db.getAll('investigations'), snapshots: await db.getAll('snapshots'), rawdata: await db.getAll('rawdata'), report: await loadCurrentState() }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'truepress_BACKUP_' + new Date().toISOString().slice(0,10) + '.json';
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  } catch (e) { console.error('exportDatabase error:', e); }
};

export const importDatabase = async (file: File): Promise<{count: number; news: NewsAnalysis[]; report?: IntelligenceReport}> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        const items = (data.news || data.data || []).map(sanitizeNewsItem);
        await persistNewsItems(items);
        if (data.investigations) for (const i of data.investigations) await persistInvestigation(i);
        if (data.snapshots) { const db = await initDB(); for (const s of data.snapshots) await db.put('snapshots', s); }
        const allNews = await getAllNews();
        const report = await loadCurrentState();
        resolve({ count: items.length, news: allNews, report: report || undefined });
      } catch (err) { reject(err); }
    };
    reader.onerror = () => reject(new Error('Erro de leitura'));
    reader.readAsText(file);
  });
};
