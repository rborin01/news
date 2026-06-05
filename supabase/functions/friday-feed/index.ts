// Friday Feed — endpoint que a Friday consome como fonte de inteligência
// GET /functions/v1/friday-feed?domain=Finance_Trading&limit=20&min_score=60
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const FRIDAY_SHARED_KEY = Deno.env.get('FRIDAY_SHARED_KEY') ?? '';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-friday-key, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  // Auth: shared key between True Press and Friday
  const key = req.headers.get('x-friday-key');
  if (FRIDAY_SHARED_KEY && key !== FRIDAY_SHARED_KEY) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), {
      status: 401, headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  const url = new URL(req.url);
  const domain = url.searchParams.get('domain');
  const indexCode = url.searchParams.get('index_code');
  const limit = Math.min(Number(url.searchParams.get('limit') ?? 20), 100);
  const minScore = Number(url.searchParams.get('min_score') ?? 0);
  const since = url.searchParams.get('since'); // ISO date

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  let q = supabase
    .from('processed_news')
    .select('id,title,summary,narrative_media,real_facts,impact_rodrigo,category,level_1_domain,level_2_project,level_3_tag,score_rodrigo,score_brasil,borin_index_tags,processed_at')
    .order('processed_at', { ascending: false })
    .limit(limit);

  if (domain) q = q.eq('level_1_domain', domain);
  if (minScore > 0) q = q.gte('score_brasil', minScore);
  if (since) q = q.gte('processed_at', since);
  if (indexCode) q = q.contains('borin_index_tags', [indexCode]);

  const { data: news, error } = await q;
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  // Anexa os índices Borin mais recentes para contexto
  const { data: indices } = await supabase
    .from('borin_indices')
    .select('index_code,score,week_start,article_count')
    .order('week_start', { ascending: false })
    .limit(9);

  return new Response(
    JSON.stringify({
      source: 'true-press',
      generated_at: new Date().toISOString(),
      count: news?.length ?? 0,
      filters: { domain, index_code: indexCode, min_score: minScore, since },
      borin_indices: indices ?? [],
      news: news ?? [],
    }),
    { headers: { ...cors, 'Content-Type': 'application/json' } },
  );
});
