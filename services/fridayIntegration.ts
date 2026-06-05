// Friday <-> True Press integration client
// PULL: get True Press intelligence feed. PUSH: alert Friday on high-impact news.
import { supabase } from './supabaseClient';

export interface FridayFeedItem {
  id: string;
  title: string;
  summary: string;
  narrative_media: string;
  real_facts: string;
  impact_rodrigo: string;
  category: string;
  level_1_domain: string;
  score_rodrigo: number;
  score_brasil: number;
  borin_index_tags: string[];
  processed_at: string;
}

export interface FridayFeedResponse {
  source: string;
  generated_at: string;
  count: number;
  borin_indices: Array<{ index_code: string; score: number; week_start: string }>;
  news: FridayFeedItem[];
}

export interface FridayFeedOptions {
  domain?: string;
  indexCode?: string;
  limit?: number;
  minScore?: number;
  since?: string;
}

const FRIDAY_FEED_URL =
  import.meta.env.VITE_SUPABASE_URL + '/functions/v1/friday-feed';

/** PULL — fetch the True Press intelligence feed (used by Friday and internal tools). */
export async function getFridayFeed(
  opts: FridayFeedOptions = {},
): Promise<FridayFeedResponse> {
  const params = new URLSearchParams();
  if (opts.domain) params.set('domain', opts.domain);
  if (opts.indexCode) params.set('index_code', opts.indexCode);
  if (opts.limit) params.set('limit', String(opts.limit));
  if (opts.minScore) params.set('min_score', String(opts.minScore));
  if (opts.since) params.set('since', opts.since);

  const res = await fetch(`${FRIDAY_FEED_URL}?${params.toString()}`, {
    headers: {
      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY as string,
      'x-friday-key': (import.meta.env.VITE_FRIDAY_SHARED_KEY as string) ?? '',
    },
  });
  if (!res.ok) throw new Error(`friday-feed error: ${res.status}`);
  return res.json();
}

/** Convenience: high-impact news of the last N hours, for Friday alerts. */
export async function getHighImpactNews(hours = 24): Promise<FridayFeedItem[]> {
  const since = new Date(Date.now() - hours * 3600_000).toISOString();
  const feed = await getFridayFeed({ minScore: 80, since, limit: 50 });
  return feed.news;
}

/** Direct query (no edge function) for internal dashboards. */
export async function getNewsByDomain(
  domain: string,
  limit = 50,
): Promise<FridayFeedItem[]> {
  const { data, error } = await supabase
    .from('processed_news')
    .select(
      'id,title,summary,narrative_media,real_facts,impact_rodrigo,category,level_1_domain,score_rodrigo,score_brasil,borin_index_tags,processed_at',
    )
    .eq('level_1_domain', domain)
    .order('processed_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []) as FridayFeedItem[];
}
