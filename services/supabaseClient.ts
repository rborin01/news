import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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
