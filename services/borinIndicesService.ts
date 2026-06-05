import { supabase } from './supabaseClient';

export interface BorinIndex {
  id: string;
  week_start: string;
  index_code: string;
  score: number;
  article_count: number;
  calculated_at: string;
}

export async function fetchBorinIndices(limit = 52): Promise<BorinIndex[]> {
  const { data, error } = await supabase
    .from('borin_indices')
    .select('*')
    .order('week_start', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('[borinIndicesService] fetchBorinIndices error:', error);
    return [];
  }
  return data || [];
}

export async function getLatestIndices(): Promise<Record<string, BorinIndex>> {
  const { data, error } = await supabase
    .from('borin_indices')
    .select('*')
    .order('week_start', { ascending: false })
    .limit(100);

  if (error) {
    console.error('[borinIndicesService] getLatestIndices error:', error);
    return {};
  }

  const result: Record<string, BorinIndex> = {};
  for (const row of (data || [])) {
    if (!result[row.index_code]) {
      result[row.index_code] = row;
    }
  }
  return result;
}

export async function getIndexHistory(indexCode: string, weeks = 12): Promise<BorinIndex[]> {
  const { data, error } = await supabase
    .from('borin_indices')
    .select('*')
    .eq('index_code', indexCode)
    .order('week_start', { ascending: false })
    .limit(weeks);

  if (error) {
    console.error('[borinIndicesService] getIndexHistory error:', error);
    return [];
  }
  return (data || []).reverse();
}
