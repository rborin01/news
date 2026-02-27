import { supabase, callGeminiProxy } from './supabaseClient';
import { RSS_FEEDS } from './rssFeeds';

export interface QueueStats { pending: number; processing: number; done: number; error: number; }

export interface ProcessedNewsItem {
  id?: string;
  raw_id: string;
  title: string;
  summary: string;
  narrative_media: string;
  hidden_intent: string;
  real_facts: string;
  impact_rodrigo: string;
  category: string;
  level_1_domain: string;
  level_2_project: string;
  level_3_tag: string;
  score_rodrigo: number;
  score_brasil: number;
  embedding?: number[];
  processed_at?: string;
  source_app: string;
}

const CORS_PROXIES = [
  (url: string) => `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`,
  (url: string) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
  (url: string) => `https://proxy.cors.sh/${url}`,
];

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

function parseRSS(xml: string, source: string): any[] {
  const items: any[] = [];
  const re = /<item[^>]*>([sS]*?)<\/item>/gi; let m;
  while ((m = re.exec(xml)) !== null) {
    const x = m[1];
    const get = (t: string) => { const r = x.match(new RegExp(`<${t}[^>]*>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?</${t}>`, 'i')); return r ? r[1].trim() : ''; };
    const url = get('link') || get('guid'); const title = get('title');
    if (url && title) items.push({ url, source, title, content_raw: get('description') || title, status: 'pending' });
  }
  return items;
}

async function fetchRSS(feedUrl: string, source: string): Promise<any[]> {
  for (const proxyFn of CORS_PROXIES) {
    try {
      const res = await fetch(proxyFn(feedUrl), { signal: AbortSignal.timeout(8000) });
      if (!res.ok) continue;
      const data = await res.json().catch(() => null);
      const xml = data?.contents || await res.text();
      if (!xml || !xml.includes('<item')) continue;
      return parseRSS(xml, source);
    } catch { continue; }
  }
  return [];
}

export async function ingestAllFeeds(onProgress?: (msg: string) => void): Promise<number> {
  let totalNew = 0;
  for (const feed of RSS_FEEDS) {
    onProgress?.(`📡 ${feed.source}`);
    const items = await fetchRSS(feed.url, feed.source);
    if (!items.length) continue;
    const { data: existing } = await supabase.from('raw_news').select('url').in('url', items.map(i => i.url));
    const existingUrls = new Set((existing || []).map((r: any) => r.url));
    const newItems = items.filter(i => !existingUrls.has(i.url));
    if (newItems.length) {
      const { error } = await supabase.from('raw_news').insert(newItems);
      if (!error) { totalNew += newItems.length; onProgress?.(`  ✅ +${newItems.length} de ${feed.source}`); }
    }
    await sleep(200);
  }
  return totalNew;
}

export async function processQueue(batchSize = 10, onProgress?: (msg: string) => void): Promise<number> {
  const { data: pending } = await supabase.from('raw_news').select('*').eq('status', 'pending').order('scraped_at', { ascending: true }).limit(batchSize);
  if (!pending?.length) { onProgress?.('Fila vazia'); return 0; }
  let processed = 0;
  for (const item of pending) {
    await supabase.from('raw_news').update({ status: 'processing' }).eq('id', item.id);
    onProgress?.(`🤖 ${item.title?.substring(0, 50)}...`);
    try {
      const analysis = await callGeminiProxy('analyze_news', { title: item.title, content_raw: item.content_raw });
      let embedding: number[] | undefined;
      try { const e = await callGeminiProxy('embed', { text: `${analysis.title} ${analysis.summary}` }); embedding = e?.embedding; } catch {}
      const { error } = await supabase.from('processed_news').insert({
        raw_id: item.id, title: analysis.title || item.title, summary: analysis.summary || '',
        narrative_media: analysis.narrative_media || '', hidden_intent: analysis.hidden_intent || '',
        real_facts: analysis.real_facts || '', impact_rodrigo: analysis.impact_rodrigo || '',
        category: analysis.category || 'Geral', level_1_domain: analysis.level_1_domain || 'World',
        level_2_project: analysis.level_2_project || 'TruePress', level_3_tag: analysis.level_3_tag || 'geral',
        score_rodrigo: analysis.score_rodrigo || 0, score_brasil: analysis.score_brasil || 0,
        embedding, source_app: 'truepress',
      });
      if (!error) { await supabase.from('raw_news').update({ status: 'done' }).eq('id', item.id); processed++; onProgress?.('  ✅ Salvo'); }
      else await supabase.from('raw_news').update({ status: 'error', error_msg: error.message }).eq('id', item.id);
    } catch (err: any) { await supabase.from('raw_news').update({ status: 'error', error_msg: err.message }).eq('id', item.id); }
    await sleep(4200);
  }
  return processed;
}

export async function runFullPipeline(onProgress?: (msg: string) => void): Promise<{ ingested: number; processed: number }> {
  onProgress?.('🚀 Iniciando pipeline...');
  const ingested = await ingestAllFeeds(onProgress);
  await sleep(1000);
  const processed = await processQueue(10, onProgress);
  onProgress?.(`✅ ${ingested} ingeridas, ${processed} processadas`);
  return { ingested, processed };
}

export async function fetchProcessedNews(limit = 50): Promise<ProcessedNewsItem[]> {
  const { data } = await supabase.from('processed_news').select('*').order('processed_at', { ascending: false }).limit(limit);
  return (data || []) as ProcessedNewsItem[];
}

export async function getQueueStats(): Promise<QueueStats> {
  const stats: QueueStats = { pending: 0, processing: 0, done: 0, error: 0 };
  for (const status of ['pending', 'processing', 'done', 'error'] as const) {
    const { count } = await supabase.from('raw_news').select('*', { count: 'exact', head: true }).eq('status', status);
    stats[status] = count || 0;
  }
  return stats;
}

export async function searchProcessedNews(params: { query: string; domain?: string; project?: string; tag?: string; limit?: number }): Promise<ProcessedNewsItem[]> {
  const e = await callGeminiProxy('embed', { text: params.query });
  if (!e?.embedding) return [];
  const { data } = await supabase.rpc('match_processed_news_filtered', {
    query_embedding: e.embedding, match_threshold: 0.7, match_count: params.limit || 20,
    filter_domain: params.domain || null, filter_project: params.project || null, filter_tag: params.tag || null,
  });
  return (data || []) as ProcessedNewsItem[];
}
