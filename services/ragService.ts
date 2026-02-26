// services/ragService.ts
// RAG - Retrieval-Augmented Generation Service
// DO-178C Level A - Versão 1.0.0
// Responsabilidade: Gerar embeddings, armazenar vetores e recuperar contexto semântico

import { GoogleGenAI } from '@google/genai';
import { NewsAnalysis, RagDocument, RagSearchResult } from '../types';
import { saveEmbedding, getEmbeddingByNewsId, getAllEmbeddings, deleteEmbedding } from '../db';

const EMBEDDING_MODEL = 'gemini-embedding-exp-03-07';
const MAX_CONTEXT_DOCS = 5;

// Calcula similaridade cosseno entre dois vetores
function cosineSimilarity(vecA: number[], vecB: number[]): number {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dot += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

// Cria texto rico para embedding a partir de uma notícia
function buildEmbeddingText(news: NewsAnalysis): string {
  return [
    news.title,
    news.category,
    news.narrative || '',
    news.intent || '',
    news.truth || '',
    news.action || '',
    (news.scenarios?.short?.prediction || ''),
    (news.scenarios?.medium?.prediction || ''),
    (news.scenarios?.long?.prediction || ''),
  ].filter(Boolean).join(' | ');
}

// Gera embedding para uma única notícia
export async function generateEmbedding(apiKey: string, news: NewsAnalysis): Promise<RagDocument | null> {
  try {
    const existing = await getEmbeddingByNewsId(news.id);
    if (existing) return existing;

    const ai = new GoogleGenAI({ apiKey });
    const text = buildEmbeddingText(news);
    const result = await ai.models.embedContent({
          const result = await ai.models.embedContent({
      contents: text,
    });
        const embedding = result.embedding?.values ?? result.embeddings?.[0]?.values;
    if (!embedding || embedding.length === 0) return null;

    const doc: RagDocument = {
      id: `rag_${news.id}`,
      newsId: news.id,
      text,
      embedding,
      category: news.category,
      date: news.date || new Date().toISOString(),
      title: news.title,
    };
    await saveEmbedding(doc);
    return doc;
  } catch (e) {
    console.warn('[RAG] Erro ao gerar embedding:', e);
    return null;
  }
}

// Processa batch de notícias para gerar embeddings (com rate limiting)
export async function indexNewsBatch(apiKey: string, newsList: NewsAnalysis[]): Promise<number> {
  let indexed = 0;
  for (const news of newsList) {
    const result = await generateEmbedding(apiKey, news);
    if (result) indexed++;
    await new Promise(r => setTimeout(r, 200)); // rate limiting
  }
  return indexed;
}

// Busca semântica: dado uma query, retorna as N notícias mais relevantes
export async function semanticSearch(
  apiKey: string,
  query: string,
  topK: number = MAX_CONTEXT_DOCS
): Promise<RagSearchResult[]> {
  try {
    const ai = new GoogleGenAI({ apiKey });
    const result = await ai.models.embedContent({
      model: EMBEDDING_MODEL,
      contents: query,
    });
        const queryVec = result.embedding?.values ?? result.embeddings?.[0]?.values;
    if (!queryVec || queryVec.length === 0) return [];

    const allDocs = await getAllEmbeddings();
    if (allDocs.length === 0) return [];

    const scored = allDocs.map(doc => ({
      doc,
      score: cosineSimilarity(queryVec, doc.embedding),
    }));

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, topK).map(s => ({
      newsId: s.doc.newsId,
      title: s.doc.title,
      text: s.doc.text,
      category: s.doc.category,
      date: s.doc.date,
      score: s.score,
    }));
  } catch (e) {
    console.warn('[RAG] Erro na busca semântica:', e);
    return [];
  }
}

// Constrói prompt enriquecido com contexto RAG para análise
export async function buildRagContext(
  apiKey: string,
  query: string,
  topK: number = MAX_CONTEXT_DOCS
): Promise<string> {
  const results = await semanticSearch(apiKey, query, topK);
  if (results.length === 0) return '';

  const contextLines = results.map((r, i) =>
    `[CONTEXTO ${i + 1} | Score: ${(r.score * 100).toFixed(1)}% | ${r.category} | ${r.date?.substring(0, 10)}]\n${r.title}\n${r.text}`
  );
  return `\n\n=== MEMÓRIA HISTÓRICA RAG (${results.length} documentos relevantes) ===\n${contextLines.join('\n---\n')}\n=== FIM DO CONTEXTO RAG ===\n`;
}

// Remove embeddings de notícias deletadas
export async function pruneOrphanEmbeddings(activeNewsIds: Set<string>): Promise<number> {
  const allDocs = await getAllEmbeddings();
  let removed = 0;
  for (const doc of allDocs) {
    if (!activeNewsIds.has(doc.newsId)) {
      await deleteEmbedding(doc.id);
      removed++;
    }
  }
  return removed;
}
