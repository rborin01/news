import { supabase, callGeminiProxy } from './supabaseClient';

export interface OwnArticle {
  id: string;
  topic: string;
  headline: string;
  lede: string;
  body: string;
  sources: string[];
  category: string;
  author_ai: string;
  created_at: string;
}

export async function generateArticle(topic: string, researchContext: string): Promise<OwnArticle> {
  const result = await callGeminiProxy('generate_article', {
    topic,
    research_context: researchContext,
  });
  if (!result?.id) throw new Error('Falha ao gerar artigo');
  return result as OwnArticle;
}

export async function listOwnArticles(limit = 50): Promise<OwnArticle[]> {
  const { data, error } = await supabase
    .from('own_articles')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data || []) as OwnArticle[];
}

export async function deleteOwnArticle(id: string): Promise<void> {
  const { error } = await supabase.from('own_articles').delete().eq('id', id);
  if (error) throw new Error(error.message);
}
