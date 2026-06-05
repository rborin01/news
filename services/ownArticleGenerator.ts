import { supabase, callGeminiProxy } from './supabaseClient';
import type { OwnArticle } from './ownPressService';

const AUTHOR_AI = 'Gemini (True Press)';

interface GeneratedArticleDraft {
  headline: string;
  lede: string;
  body: string;
  category: string;
  sources: string[];
}

function buildPrompt(topic: string, category: string): string {
  return [
    'Voce e um jornalista profissional brasileiro escrevendo para o veiculo "True Press".',
    `Escreva uma materia jornalistica original e factual sobre o seguinte topico: "${topic}".`,
    category?.trim() ? `Categoria editorial sugerida: "${category}".` : '',
    'Estruture o texto com lide (lede) que responda quem, o que, quando, onde, por que e como.',
    'O corpo (body) deve ter de 4 a 8 paragrafos, em portugues do Brasil, tom analitico e neutro.',
    'Liste de 2 a 5 fontes plausiveis (nomes de instituicoes, orgaos ou veiculos) em sources.',
    'Responda EXCLUSIVAMENTE com um objeto JSON puro, sem cercas de codigo e sem texto extra,',
    'no formato exato:',
    '{"headline": string, "lede": string, "body": string, "category": string, "sources": string[]}',
  ]
    .filter(Boolean)
    .join('\n');
}

function extractText(raw: unknown): string {
  if (typeof raw === 'string') return raw;
  if (raw && typeof raw === 'object') {
    const obj = raw as Record<string, unknown>;
    if (typeof obj.text === 'string') return obj.text;
    if (typeof obj.output === 'string') return obj.output;
    if (typeof obj.content === 'string') return obj.content;
  }
  return '';
}

function stripCodeFences(text: string): string {
  return text
    .replace(/^\s*```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/i, '')
    .trim();
}

function parseDraft(text: string): GeneratedArticleDraft {
  const cleaned = stripCodeFences(text);
  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start === -1 || end === -1 || end <= start) {
      throw new Error('Resposta da IA nao contem JSON valido');
    }
    parsed = JSON.parse(cleaned.slice(start, end + 1));
  }

  const obj = (parsed && typeof parsed === 'object' ? parsed : {}) as Record<string, unknown>;
  const headline = typeof obj.headline === 'string' ? obj.headline.trim() : '';
  const body = typeof obj.body === 'string' ? obj.body.trim() : '';
  if (!headline || !body) {
    throw new Error('Artigo gerado sem headline ou body');
  }

  const sources = Array.isArray(obj.sources)
    ? obj.sources.filter((s): s is string => typeof s === 'string' && s.trim().length > 0).map((s) => s.trim())
    : [];

  return {
    headline,
    body,
    lede: typeof obj.lede === 'string' ? obj.lede.trim() : '',
    category: typeof obj.category === 'string' && obj.category.trim() ? obj.category.trim() : '',
    sources,
  };
}

export async function generateOriginalArticle(topic: string, category = ''): Promise<OwnArticle> {
  if (!topic?.trim()) {
    throw new Error('Topico obrigatorio');
  }

  const prompt = buildPrompt(topic.trim(), category);
  const raw = await callGeminiProxy('generate', { prompt, topic: topic.trim() });
  const text = extractText(raw);
  if (!text.trim()) {
    throw new Error('Resposta vazia da IA');
  }

  const draft = parseDraft(text);
  const finalCategory = draft.category || category.trim() || 'Geral';

  const { data, error } = await supabase
    .from('own_articles')
    .insert({
      topic: topic.trim(),
      headline: draft.headline,
      lede: draft.lede,
      body: draft.body,
      sources: draft.sources,
      category: finalCategory,
      author_ai: AUTHOR_AI,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  if (!data?.id) throw new Error('Falha ao persistir artigo');

  return data as OwnArticle;
}
