// services/rssService.ts
// DO-178C Level A | True Press v3.6.0
// Web scraping via RSS com rate limiting Gemini (max 14 req/min)
// Feeds catalogados em rssFeeds.ts — sem dependencia de proxy fixo

import { RSS_FEEDS, getFeedsByPriority, MAX_ARTICLES_PER_CYCLE, GEMINI_DELAY_MS, FeedSource } from './rssFeeds';

export interface RawNewsItem {
  title: string;
  link: string;
  pubDate: string;
  source: string;
  snippet: string;
  category: string;
}

// ─────────────────────────────────────────────
// PROXIES CORS (tentados em ordem aleatoria)
// ─────────────────────────────────────────────
const PROXIES = [
  {
    name: 'RSS2JSON',
    fetch: async (rssUrl: string): Promise<string> => {
      const res = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssUrl)}`, { signal: AbortSignal.timeout(5000) });
      if (!res.ok) throw new Error(`rss2json HTTP ${res.status}`);
      const data = await res.json();
      if (data.status !== 'ok') throw new Error('rss2json status: ' + data.status);
      return JSON.stringify(data.items); // retorna JSON array
    },
    isJson: true,
  },
  {
    name: 'AllOrigins',
    fetch: async (rssUrl: string): Promise<string> => {
      const res = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(rssUrl)}`, { signal: AbortSignal.timeout(6000) });
      if (!res.ok) throw new Error(`allorigins HTTP ${res.status}`);
      const json = await res.json();
      return json.contents;
    },
    isJson: false,
  },
  {
    name: 'CorsProxy',
    fetch: async (rssUrl: string): Promise<string> => {
      const res = await fetch(`https://corsproxy.io/?${encodeURIComponent(rssUrl)}`, { signal: AbortSignal.timeout(6000) });
      if (!res.ok) throw new Error(`corsproxy HTTP ${res.status}`);
      return await res.text();
    },
    isJson: false,
  },
  {
    name: 'CodeTabs',
    fetch: async (rssUrl: string): Promise<string> => {
      const res = await fetch(`https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(rssUrl)}`, { signal: AbortSignal.timeout(6000) });
      if (!res.ok) throw new Error(`codetabs HTTP ${res.status}`);
      return await res.text();
    },
    isJson: false,
  },
];

// ─────────────────────────────────────────────
// PARSE RSS XML → RawNewsItem[]
// ─────────────────────────────────────────────
const parseXML = (xmlContent: string, source: FeedSource): RawNewsItem[] => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlContent, 'text/xml');
  if (doc.querySelector('parsererror')) throw new Error('XML parse error');
  return Array.from(doc.querySelectorAll('item')).slice(0, 15).map(item => ({
    title: item.querySelector('title')?.textContent?.trim() || 'Sem Título',
    link: item.querySelector('link')?.textContent?.trim() || '',
    pubDate: item.querySelector('pubDate')?.textContent || new Date().toISOString(),
    source: source.name,
    snippet: (item.querySelector('description')?.textContent || '')
      .replace(/<[^>]*>?/gm, '').replace(/\s+/g, ' ').substring(0, 300).trim(),
    category: source.category,
  }));
};

const parseRss2JsonItems = (jsonStr: string, source: FeedSource): RawNewsItem[] => {
  const items = JSON.parse(jsonStr);
  return items.slice(0, 15).map((item: any) => ({
    title: item.title || 'Sem Título',
    link: item.link || '',
    pubDate: item.pubDate || new Date().toISOString(),
    source: source.name,
    snippet: (item.description || item.content || '')
      .replace(/<[^>]*>?/gm, '').replace(/\s+/g, ' ').substring(0, 300).trim(),
    category: source.category,
  }));
};

// ─────────────────────────────────────────────
// BUSCA UM FEED (tenta todos os proxies)
// ─────────────────────────────────────────────
const fetchOneFeed = async (source: FeedSource): Promise<RawNewsItem[]> => {
  const shuffled = [...PROXIES].sort(() => Math.random() - 0.5);
  for (const proxy of shuffled) {
    try {
      const raw = await proxy.fetch(source.url);
      if (!raw || raw.length < 50) throw new Error('empty response');
      const items = proxy.isJson ? parseRss2JsonItems(raw, source) : parseXML(raw, source);
      if (items.length > 0) {
        console.log(`[RSS] OK: ${source.name} via ${proxy.name} (${items.length} itens)`);
        return items;
      }
    } catch (e) {
      // proxima tentativa silenciosa
    }
  }
  console.warn(`[RSS] FALHOU: ${source.name}`);
  return [];
};

// ─────────────────────────────────────────────
// COLETA TODOS OS FEEDS (com deduplicacao)
// ─────────────────────────────────────────────
export const harvestAllFeeds = async (maxPriority: 1 | 2 | 3 = 2): Promise<RawNewsItem[]> => {
  const feeds = getFeedsByPriority(maxPriority);
  const allItems: RawNewsItem[] = [];
  const seenTitles = new Set<string>();

  for (const feed of feeds) {
    const items = await fetchOneFeed(feed);
    for (const item of items) {
      const key = item.title.toLowerCase().trim().substring(0, 60);
      if (!seenTitles.has(key)) {
        seenTitles.add(key);
        allItems.push(item);
      }
    }
    if (allItems.length >= MAX_ARTICLES_PER_CYCLE) break;
    // Pequena pausa entre feeds para nao sobrecarregar proxies
    await new Promise(r => setTimeout(r, 300));
  }

  console.log(`[RSS] Total coletado: ${allItems.length} artigos unicos`);
  return allItems.slice(0, MAX_ARTICLES_PER_CYCLE);
};

// ─────────────────────────────────────────────
// BUSCA POR QUERY (mantida para compatibilidade)
// ─────────────────────────────────────────────
export const harvestGoogleNews = async (query: string): Promise<RawNewsItem[]> => {
  const encodedQuery = encodeURIComponent(query);
  const googleRssUrl = `https://news.google.com/rss/search?q=${encodedQuery}&hl=pt-BR&gl=BR&ceid=BR:pt-419`;
  const fakeSource: FeedSource = { name: 'Google News', url: googleRssUrl, category: 'Manchetes & Alertas', language: 'pt', priority: 1 };
  return fetchOneFeed(fakeSource);
};

// ─────────────────────────────────────────────
// RATE LIMITER — 4.2s entre chamadas Gemini
// Uso: await geminiDelay() antes de cada chamada
// ─────────────────────────────────────────────
export const geminiDelay = (): Promise<void> =>
  new Promise(r => setTimeout(r, GEMINI_DELAY_MS));
