import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY ?? "";
const EDGE_URL = `${SUPABASE_URL}/functions/v1/gemini-proxy`;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export interface RawNewsItem {
  url: string;
  source: string;
  title: string;
  content_raw: string;
}

export interface QueueStats {
  pending: number;
  processing: number;
  done: number;
  error: number;
}

const CORS_PROXIES = [
  (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  (url: string) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
  (url: string) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
];

async function fetchRSSFeed(feedUrl: string): Promise<RawNewsItem[]> {
  let xmlText = "";
  for (const proxy of CORS_PROXIES) {
    try {
      const res = await fetch(proxy(feedUrl), { signal: AbortSignal.timeout(8000) });
      if (res.ok) { xmlText = await res.text(); break; }
    } catch { continue; }
  }
  if (!xmlText) return [];

  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, "text/xml");
  const items = Array.from(doc.querySelectorAll("item, entry"));

  return items.slice(0, 20).map((item) => {
    const title = item.querySelector("title")?.textContent?.trim() ?? "";
    const link =
      item.querySelector("link")?.textContent?.trim() ||
      item.querySelector("link")?.getAttribute("href") ?? "";
    const description =
      item.querySelector("description, summary, content")?.textContent?.trim() ?? "";
    const sourceName =
      doc.querySelector("channel > title, feed > title")?.textContent?.trim() ||
      new URL(feedUrl).hostname;
    return {
      url: link || feedUrl + "#" + Math.random(),
      source: sourceName,
      title,
      content_raw: description.substring(0, 3000),
    };
  }).filter((i) => i.title && i.url);
}

export async function ingestAllFeeds(
  feeds: string[]
): Promise<{ total: number; inserted: number; duplicates: number }> {
  const allItems: RawNewsItem[] = [];
  const results = await Promise.allSettled(feeds.map((url) => fetchRSSFeed(url)));
  for (const result of results) {
    if (result.status === "fulfilled") allItems.push(...result.value);
  }
  if (allItems.length === 0) return { total: 0, inserted: 0, duplicates: 0 };

  let inserted = 0, duplicates = 0;
  for (let i = 0; i < allItems.length; i += 50) {
    const batch = allItems.slice(i, i + 50);
    try {
      const res = await fetch(EDGE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "ingest_rss", items: batch }),
      });
      const data = await res.json();
      inserted += data.inserted ?? 0;
      duplicates += data.duplicates ?? 0;
    } catch (err) {
      console.error("[newsQueue] ingest batch error:", err);
    }
  }
  return { total: allItems.length, inserted, duplicates };
}

export async function processQueue(
  batchSize = 5
): Promise<{ processed: number; results: any[] }> {
  try {
    const res = await fetch(EDGE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "process_queue", batch_size: batchSize }),
    });
    return await res.json();
  } catch (err) {
    console.error("[newsQueue] process_queue error:", err);
    return { processed: 0, results: [] };
  }
}

export async function fetchProcessedNews(
  opts: {
    limit?: number;
    domain?: string;
    project?: string;
    tag?: string;
    category?: string;
  } = {}
): Promise<any[]> {
  let query = supabase
    .from("processed_news")
    .select("*")
    .order("processed_at", { ascending: false })
    .limit(opts.limit ?? 60);

  if (opts.domain) query = query.eq("level_1_domain", opts.domain);
  if (opts.project) query = query.eq("level_2_project", opts.project);
  if (opts.tag) query = query.eq("level_3_tag", opts.tag);
  if (opts.category) query = query.eq("category", opts.category);

  const { data, error } = await query;
  if (error) {
    console.error("[newsQueue] fetchProcessedNews error:", error);
    return [];
  }
  return data ?? [];
}

export async function getQueueStats(): Promise<QueueStats> {
  const { data, error } = await supabase.from("raw_news").select("status");
  if (error || !data) return { pending: 0, processing: 0, done: 0, error: 0 };
  return data.reduce(
    (acc: QueueStats, row: any) => {
      acc[row.status as keyof QueueStats] =
        (acc[row.status as keyof QueueStats] ?? 0) + 1;
      return acc;
    },
    { pending: 0, processing: 0, done: 0, error: 0 }
  );
}

export async function runFullPipeline(
  feeds: string[]
): Promise<{ ingested: any; processed: any }> {
  console.log("[newsQueue] Iniciando pipeline completo...");
  const ingested = await ingestAllFeeds(feeds);
  await new Promise((r) => setTimeout(r, 1000));
  const processed = await processQueue(5);
  return { ingested, processed };
}
