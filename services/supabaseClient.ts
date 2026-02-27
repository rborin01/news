import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// v4.0.0 - callGeminiProxy + saveReport + health check
export async function callGeminiProxy(action: string, payload: Record<string, unknown>): Promise<any> {
  const { data, error } = await supabase.functions.invoke('gemini-proxy', { body: { action, ...payload } });
  if (error) throw new Error(`GeminiProxy error: ${error.message}`);
  return data;
}

export async function saveReportToSupabase(report: any): Promise<void> {
  await supabase.from('snapshots').upsert({ id: 'latest', data: report, saved_at: new Date().toISOString() });
}

export async function loadReportFromSupabase(): Promise<any | null> {
  const { data } = await supabase.from('snapshots').select('data').eq('id', 'latest').single();
  return data?.data ?? null;
}

export async function checkSupabaseHealth(): Promise<boolean> {
  try {
    const { error } = await supabase.from('processed_news').select('id').limit(1);
    return !error;
  } catch {
    return false;
  }
}

// Legacy functions - mantidas para compatibilidade com db.ts
export async function saveNewsToSupabase(item: any): Promise<void> {
  try {
    await supabase.from('raw_news').upsert({
      id: item.id,
      url: item.url || `local://${item.id}`,
      source: item.source || 'local',
      title: item.title,
      content_raw: item.narrative || item.summary || item.content_raw || '',
      status: 'done',
    });
  } catch (e) {
    console.warn('[supabaseClient] saveNewsToSupabase error:', e);
  }
}

export async function getNewsFromSupabase(limit = 500): Promise<any[]> {
  try {
    const { data } = await supabase.from('processed_news').select('*').order('processed_at', { ascending: false }).limit(limit);
    return (data || []).map((n: any) => ({
      id: n.id || n.raw_id,
      title: n.title,
      category: n.category || 'Geral',
      timeframe: 'DAILY',
      narrative: n.narrative_media || n.summary || '',
      intent: n.hidden_intent || '',
      action: n.impact_rodrigo || '',
      truth: n.real_facts || '',
      relevanceScore: n.score_rodrigo || 50,
      nationalRelevance: n.score_brasil || 50,
      personalImpact: n.impact_rodrigo || '',
      scenarios: { short: { prediction: '', confidence: 0, impact: '' }, medium: { prediction: '', confidence: 0, impact: '' }, long: { prediction: '', confidence: 0, impact: '' } },
      dateAdded: n.processed_at || new Date().toISOString(),
    }));
  } catch (e) {
    console.warn('[supabaseClient] getNewsFromSupabase error:', e);
    return [];
  }
}

export async function saveEmbeddingToSupabase(doc: any): Promise<void> {
  try {
    await supabase.from('processed_news').update({ embedding: doc.embedding }).eq('id', doc.newsId);
  } catch (e) {
    console.warn('[supabaseClient] saveEmbeddingToSupabase error:', e);
  }
}

export async function saveSnapshotToSupabase(snapshot: any): Promise<void> {
  try {
    await supabase.from('snapshots').upsert({ id: snapshot.id, data: snapshot, saved_at: new Date().toISOString() });
  } catch (e) {
    console.warn('[supabaseClient] saveSnapshotToSupabase error:', e);
  }
}

export async function getSnapshotsFromSupabase(): Promise<any[]> {
  try {
    const { data } = await supabase.from('snapshots').select('*').order('saved_at', { ascending: false }).limit(50);
    return (data || []).map((s: any) => s.data).filter(Boolean);
  } catch (e) {
    console.warn('[supabaseClient] getSnapshotsFromSupabase error:', e);
    return [];
  }
}

// generateWithGemini - used by geminiService.ts
export async function generateWithGemini(prompt: string, model?: string): Promise<string> {
  try {
    const result = await callGeminiProxy('generate', { prompt, model });
    return result?.text || '';
  } catch (e) {
    console.warn('[supabaseClient] generateWithGemini error:', e);
    throw e;
  }
}

// generateEmbedding - may be used by ragService.ts
export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const result = await callGeminiProxy('embed', { text });
    return result?.embedding || [];
  } catch (e) {
    console.warn('[supabaseClient] generateEmbedding error:', e);
    return [];
  }
}
