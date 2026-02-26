// services/supabaseClient.ts
// Cliente seguro para a Edge Function gemini-proxy do Supabase
// Todas as chamadas Gemini passam pelo servidor — chave nunca exposta
// DO-178C Level A | True Press v3.6.0
// MÁXIMO 500 LINHAS — modularidade extrema

const SUPABASE_FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/gemini-proxy`;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';

// ─────────────────────────────────────────────────────────────────────────────
// Tipos compartilhados
// ─────────────────────────────────────────────────────────────────────────────

export interface GeminiGeneratePayload {
  action: 'generate';
  prompt: string;
  model?: string;
  systemInstruction?: string;
}

export interface GeminiEmbedPayload {
  action: 'embed';
  text: string;
}

export interface GeminiSaveNewsPayload {
  action: 'save_news';
  news: {
    id: string;
    title: string;
    summary: string;
    content: string;
    category: string;
    level1Domain: string;
    level2Project: string;
    level3Tag: string;
    source: string;
    url: string;
    publishedAt: string;
    sentiment: string;
    relevanceScore: number;
    embedding?: number[];
  };
}

export interface GeminiSaveEmbeddingPayload {
  action: 'save_embedding';
  newsId: string;
  embedding: number[];
  level1Domain: string;
  level2Project: string;
  level3Tag: string;
}

export interface GeminiSearchPayload {
  action: 'search';
  query: string;
  matchCount?: number;
  level1Domain?: string;
  level2Project?: string;
}

export interface GeminiGetNewsPayload {
  action: 'get_news';
  limit?: number;
  level1Domain?: string;
  category?: string;
}

export interface GeminiSaveSnapshotPayload {
  action: 'save_snapshot';
  name: string;
  data: object;
}

export interface GeminiGetSnapshotsPayload {
  action: 'get_snapshots';
}

export interface GeminiLoadSnapshotPayload {
  action: 'load_snapshot';
  id: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Função base — chama a Edge Function com autenticação
// ─────────────────────────────────────────────────────────────────────────────

async function callEdgeFunction<T>(
  payload: object
): Promise<T> {
  const response = await fetch(SUPABASE_FUNCTION_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'apikey': SUPABASE_ANON_KEY,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Edge Function error (${response.status}): ${error}`);
  }

  return response.json() as Promise<T>;
}

// ─────────────────────────────────────────────────────────────────────────────
// API pública — geração de texto com Gemini (servidor)
// ─────────────────────────────────────────────────────────────────────────────

export async function generateWithGemini(
  prompt: string,
  model?: string,
  systemInstruction?: string
): Promise<string> {
  const result = await callEdgeFunction<{ text: string }>({
    action: 'generate',
    prompt,
    model,
    systemInstruction,
  });
  return result.text;
}

// ─────────────────────────────────────────────────────────────────────────────
// API pública — geração de embedding (servidor)
// ─────────────────────────────────────────────────────────────────────────────

export async function generateEmbedding(text: string): Promise<number[]> {
  const result = await callEdgeFunction<{ embedding: number[] }>({
    action: 'embed',
    text,
  });
  return result.embedding;
}

// ─────────────────────────────────────────────────────────────────────────────
// API pública — salvar notícia no Supabase (servidor)
// ─────────────────────────────────────────────────────────────────────────────

export async function saveNewsToSupabase(
  news: GeminiSaveNewsPayload['news']
): Promise<{ id: string }> {
  return callEdgeFunction<{ id: string }>({
    action: 'save_news',
    news,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// API pública — salvar embedding vetorial (servidor)
// ─────────────────────────────────────────────────────────────────────────────

export async function saveEmbeddingToSupabase(
  newsId: string,
  embedding: number[],
  level1Domain: string,
  level2Project: string,
  level3Tag: string
): Promise<void> {
  await callEdgeFunction<void>({
    action: 'save_embedding',
    newsId,
    embedding,
    level1Domain,
    level2Project,
    level3Tag,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// API pública — busca semântica RAG (servidor)
// ─────────────────────────────────────────────────────────────────────────────

export async function searchSimilar(
  query: string,
  matchCount = 5,
  level1Domain?: string,
  level2Project?: string
): Promise<Array<{ id: string; content: string; similarity: number }>> {
  const result = await callEdgeFunction<{
    results: Array<{ id: string; content: string; similarity: number }>;
  }>({
    action: 'search',
    query,
    matchCount,
    level1Domain,
    level2Project,
  });
  return result.results ?? [];
}

// ─────────────────────────────────────────────────────────────────────────────
// API pública — buscar notícias do Supabase (servidor)
// ─────────────────────────────────────────────────────────────────────────────

export async function getNewsFromSupabase(
  limit = 100,
  level1Domain?: string,
  category?: string
): Promise<object[]> {
  const result = await callEdgeFunction<{ news: object[] }>({
    action: 'get_news',
    limit,
    level1Domain,
    category,
  });
  return result.news ?? [];
}

// ─────────────────────────────────────────────────────────────────────────────
// API pública — snapshots (Time Machine)
// ─────────────────────────────────────────────────────────────────────────────

export async function saveSnapshotToSupabase(
  name: string,
  data: object
): Promise<{ id: string }> {
  return callEdgeFunction<{ id: string }>({
    action: 'save_snapshot',
    name,
    data,
  });
}

export async function getSnapshotsFromSupabase(): Promise<object[]> {
  const result = await callEdgeFunction<{ snapshots: object[] }>({
    action: 'get_snapshots',
  });
  return result.snapshots ?? [];
}

export async function loadSnapshotFromSupabase(id: string): Promise<object> {
  return callEdgeFunction<object>({
    action: 'load_snapshot',
    id,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Verificação de saúde — testa se a Edge Function está acessível
// ─────────────────────────────────────────────────────────────────────────────

export async function checkEdgeFunctionHealth(): Promise<boolean> {
  try {
    await callEdgeFunction<object>({ action: 'health' });
    return true;
  } catch {
    return false;
  }
}
