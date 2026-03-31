// ============================================================================
// TRUE PRESS — Edge Function: gemini-proxy v5.0.0
// Análise: Claude Haiku (claude-haiku-4-5-20251001) — fast + no rate limits on paid tier
// Embedding: Gemini embedding-001 (fallback: sem embedding)
// v5.0.0: Groq → Claude API migration (W27)
// ============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ANTHROPIC_API_KEY    = Deno.env.get("ANTHROPIC_API_KEY") ?? "";
const GEMINI_API_KEY       = Deno.env.get("GEMINI_API_KEY") ?? "";
const SUPABASE_URL         = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const CLAUDE_MODEL = "claude-haiku-4-5-20251001";
const EMBED_MODEL  = "gemini-embedding-001";
const RATE_DELAY_MS = 300; // Claude is fast on paid tier — 300ms between calls

const corsHeaders = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ── Parse JSON robusto ───────────────────────────────────────────────────────
function parseJSON(raw: string): any {
        const clean = raw.replace(/```json\s*/gi, "").replace(/```\s*/gi, "").trim();
        try { return JSON.parse(clean); } catch (_) {}
        const m = clean.match(/\{[\s\S]*\}/);
        if (m) { try { return JSON.parse(m[0]); } catch (_) {} }
        throw new Error(`JSON inválido: ${raw.substring(0, 200)}`);
}

// ── Claude — análise de texto ───────────────────────────────────────────────
async function callClaude(prompt: string): Promise<{ text: string; model: string }> {
        if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY não configurada");

  const res = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: {
                        "Content-Type": "application/json",
                        "x-api-key": ANTHROPIC_API_KEY,
                        "anthropic-version": "2023-06-01",
            },
            body: JSON.stringify({
                        model: CLAUDE_MODEL,
                        max_tokens: 1200,
                        messages: [{ role: "user", content: prompt }],
            }),
  });

  if (!res.ok) {
            const b = await res.text();
            throw new Error(`CLAUDE_HTTP_${res.status}:${b.substring(0, 200)}`);
  }

  const data = await res.json();
        return { text: data.content?.[0]?.text ?? "", model: `claude-${CLAUDE_MODEL}` };
}

// ── Gemini — apenas embedding ────────────────────────────────────────────────
async function generateEmbedding(text: string): Promise<number[]> {
        if (!GEMINI_API_KEY) return [];

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${EMBED_MODEL}:embedContent?key=${GEMINI_API_KEY}`;
        const res = await fetch(url, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ model: `models/${EMBED_MODEL}`, content: { parts: [{ text: text.substring(0, 2000) }] } }),
        });

  if (!res.ok) return []; // embedding falha silenciosamente
  const data = await res.json();
        return data.embedding?.values ?? [];
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

      // ── Análise de notícia via Claude ─────────────────────────────────────────
async function analyzeNews(title: string, contentRaw: string): Promise<any> {
        const prompt = `Você é um analista sênior de inteligência privada brasileiro, especializado em geopolítica, mercados financeiros e agronegócio. Faça uma análise PROFUNDA e DETALHADA da notícia abaixo.

RETORNE APENAS JSON VÁLIDO, sem markdown, sem texto antes ou depois.

Regras obrigatórias:
- summary: mínimo 3 frases, máximo 5. Contextualize o fato, explique o que aconteceu e por quê importa.
- narrative_media: Qual é a narrativa que a mídia mainstream está construindo? Quem se beneficia dessa narrativa? Mínimo 2 frases.
- hidden_intent: Qual é a agenda real por trás desta notícia? Quem são os atores reais? O que não está sendo dito? Mínimo 2 frases.
- real_facts: Liste APENAS fatos verificáveis, números concretos, datas, nomes. Separe com ponto-e-vírgula. Mínimo 3 fatos.
- impact_rodrigo: Como isso impacta ESPECIFICAMENTE um produtor rural brasileiro, investidor pessoa física e empreendedor de tecnologia? Cite oportunidades E riscos concretos. Mínimo 3 frases.

{"title":"título limpo max 120 chars","summary":"análise completa em 3-5 frases contextualizadas","narrative_media":"narrativa da mídia e quem se beneficia, min 2 frases","hidden_intent":"agenda oculta e atores reais, min 2 frases","real_facts":"fato1; fato2; fato3; fato4","impact_rodrigo":"impacto específico para produtor rural, investidor e empreendedor tech, min 3 frases","category":"Agronegócio & Commodities|Política & STF|Mercado Financeiro & Forex|Geopolítica & Guerra|Tecnologia & IA|Saúde & Ciência|Segurança|Infraestrutura & Imobiliário|Energia|Meio Ambiente|Economia & Finanças|Liberdade & Censura|Negócios & Empreendedorismo|Entretenimento & Cultura|Esportes|Internacional|Outros","level_1_domain":"Finance_Trading|Politics_Gov|Agro_Commodities|Tech_AI|Health_Bio|Security_Legal|Infrastructure|Energy|International|General|Meio_Ambiente|Negocios|Entretenimento","level_2_project":"QuantumCore|NeuroGrid|TruePress|Personal|AERON|General","level_3_tag":"snake_case ex: soja_precos","score_rodrigo":0,"score_brasil":0}

NOTÍCIA PARA ANÁLISE:

Título: ${title}

Conteúdo: ${(contentRaw ?? "").substring(0, 2000)}`;

  const { text, model } = await callClaude(prompt);
        const parsed = parseJSON(text);
        return { ...parsed, model_used: model };
}

// ── Processar fila ───────────────────────────────────────────────────────────
async function processQueue(batchSize = 20): Promise<any> {
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  const { data: pending, error } = await supabase
          .from("raw_news")
          .select("id,url,source,title,content_raw,retry_count")
          .eq("status", "pending")
          .order("scraped_at", { ascending: true })
          .limit(batchSize);

  if (error) throw new Error(`DB: ${error.message}`);
        if (!pending || pending.length === 0) return { processed: 0, message: "Fila vazia" };

  const results = [];

  for (let i = 0; i < pending.length; i++) {
            const item = pending[i];

          try {
                      await supabase.from("raw_news").update({ status: "processing" }).eq("id", item.id);

              const analysis = await analyzeNews(item.title ?? "Sem título", item.content_raw ?? "");

              const safe = {
                            title:           analysis.title           || item.title || "Sem título",
                            summary:         analysis.summary          || "Resumo indisponível",
                            narrative_media: analysis.narrative_media  || "",
                            hidden_intent:   analysis.hidden_intent    || "",
                            real_facts:      analysis.real_facts       || "",
                            impact_rodrigo:  analysis.impact_rodrigo   || "",
                            category:        analysis.category         || "Outros",
                            level_1_domain:  analysis.level_1_domain   || "General",
                            level_2_project: analysis.level_2_project  || "TruePress",
                            level_3_tag:     analysis.level_3_tag      || "geral",
                            score_rodrigo:   Number(analysis.score_rodrigo) || 50,
                            score_brasil:    Number(analysis.score_brasil)  || 50,
                            model_used:      analysis.model_used       || "claude",
              };

              // Embedding opcional — não bloqueia se falhar
              // vector(768) only — discard if Gemini returns 3072-dim (new API)
              let embedding: number[] | null = null;
                      try {
                        const e = await generateEmbedding(`${safe.title} ${safe.summary}`);
                        if (e && e.length === 768) embedding = e;
                      } catch (_) {}

              const { error: insertErr } = await supabase.from("processed_news").insert({
                            raw_id: item.id, title: safe.title, summary: safe.summary,
                            narrative_media: safe.narrative_media, hidden_intent: safe.hidden_intent,
                            real_facts: safe.real_facts, impact_rodrigo: safe.impact_rodrigo,
                            category: safe.category, level_1_domain: safe.level_1_domain,
                            level_2_project: safe.level_2_project, level_3_tag: safe.level_3_tag,
                            score_rodrigo: safe.score_rodrigo, score_brasil: safe.score_brasil,
                            embedding, source_app: "truepress", source_url: item.url,
              });

              if (insertErr) throw new Error(`Insert: ${insertErr.message}`);

              await supabase.from("raw_news").update({ status: "done" }).eq("id", item.id);
                      results.push({ id: item.id, status: "done", title: safe.title, model: safe.model_used });

          } catch (err: any) {
                      const msg = (err?.message ?? String(err)).substring(0, 500);
                      await supabase.from("raw_news").update({
                                    status: "error", error_msg: msg,
                                    retry_count: (item.retry_count ?? 0) + 1,
                      }).eq("id", item.id);
                      results.push({ id: item.id, status: "error", error: msg });
          }

          if (i < pending.length - 1) await sleep(RATE_DELAY_MS);
  }

  return { processed: results.length, results };
}

// ── Handler principal ────────────────────────────────────────────────────────
serve(async (req) => {
        if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

        try {
                  const body = await req.json();
                  const { action } = body;

          const json = (data: any, status = 200) =>
                      new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

          if (action === "collect_rss") {
                      // Server-side RSS collection — priority feeds embedded
                      const FEEDS = [
                            { url: "https://feeds.folha.uol.com.br/poder/rss091.xml", source: "Folha Poder" },
                            { url: "https://feeds.folha.uol.com.br/mercado/rss091.xml", source: "Folha Mercado" },
                            { url: "https://g1.globo.com/rss/g1/politica/feed.xml", source: "G1 Política" },
                            { url: "https://g1.globo.com/rss/g1/economia/feed.xml", source: "G1 Economia" },
                            { url: "https://canalpecuaria.com/feed/", source: "Canal Pecuária" },
                            { url: "https://www.canalrural.com.br/feed/", source: "Canal Rural" },
                            { url: "https://feeds.reuters.com/reuters/businessNews", source: "Reuters Business" },
                            { url: "https://rss.uol.com.br/feed/economia.xml", source: "UOL Economia" },
                      ];
                      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
                      let collected = 0, duplicates = 0;
                      for (const feed of FEEDS) {
                            try {
                                  const res = await fetch(feed.url, { signal: AbortSignal.timeout(8000) });
                                  if (!res.ok) continue;
                                  const xml = await res.text();
                                  const re = /<item[^>]*>([\s\S]*?)<\/item>/gi;
                                  let m;
                                  while ((m = re.exec(xml)) !== null) {
                                        const x = m[1];
                                        const get = (t: string) => { const r = x.match(new RegExp(`<${t}[^>]*>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?<\\/${t}>`, 'i')); return r ? r[1].trim() : ''; };
                                        const url = get('link') || get('guid');
                                        const title = get('title');
                                        if (!url || !title) continue;
                                        const { error } = await supabase.from('raw_news').insert({
                                              url: url.substring(0, 2000), source: feed.source,
                                              title: title.substring(0, 500),
                                              content_raw: (get('description') || title).substring(0, 5000),
                                              status: 'pending',
                                        });
                                        if (error?.code === '23505') duplicates++;
                                        else if (!error) collected++;
                                  }
                            } catch (_) { continue; }
                      }
                      return json({ collected, duplicates });
          }

          if (action === "reprocess_empty") {
                      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
                      // Find raw_news IDs whose processed_news has empty analysis
                      const { data: empty } = await supabase.from('processed_news')
                            .select('raw_id')
                            .or('narrative_media.eq."",narrative_media.is.null');
                      if (!empty?.length) return json({ reset: 0 });
                      const rawIds = empty.map((r: any) => r.raw_id);
                      // Delete empty processed_news records
                      await supabase.from('processed_news').delete().in('raw_id', rawIds);
                      // Reset raw_news status to pending
                      const { data: updated } = await supabase.from('raw_news')
                            .update({ status: 'pending', error_msg: null })
                            .in('id', rawIds).select('id');
                      return json({ reset: updated?.length ?? 0 });
          }

          if (action === "generate") {
                      const { text, model } = await callClaude(body.prompt);
                      return json({ text, model_used: model });
          }

          if (action === "embed") {
                      const embedding = await generateEmbedding(body.text);
                      return json({ embedding });
          }

          if (action === "analyze_news") {
                      const a = await analyzeNews(body.title ?? "", body.content_raw ?? "");
                      return json(a);
          }

          if (action === "process_queue") {
                      const r = await processQueue(body.batchSize ?? body.batch_size ?? 20);
                      return json(r);
          }

          if (action === "reset_errors") {
                      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
                      const { data, error } = await supabase.from("raw_news")
                        .update({ status: "pending", error_msg: null })
                        .eq("status", "error").lt("retry_count", body.max_retry ?? 3).select("id");
                      if (error) throw new Error(error.message);
                      return json({ reset: data?.length ?? 0 });
          }

          if (action === "ingest_rss") {
                      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
                      let inserted = 0, duplicates = 0, errors = 0;
                      for (const item of (body.items ?? [])) {
                                    if (!item.url || !item.title) { errors++; continue; }
                                    const { error } = await supabase.from("raw_news").insert({
                                                    url: item.url.substring(0, 2000), source: item.source ?? "unknown",
                                                    title: item.title.substring(0, 500),
                                                    content_raw: (item.content_raw ?? "").substring(0, 5000), status: "pending",
                                    });
                                    if (error?.code === "23505") duplicates++;
                                    else if (error) errors++;
                                    else inserted++;
                      }
                      return json({ inserted, duplicates, errors });
                            }

          if (action === "generate_article") {
                      const { topic, research_context } = body;
                      if (!topic) return json({ error: "topic required" }, 400);

                      const prompt = `Você é um jornalista investigativo brasileiro de alto nível. Escreva um artigo jornalístico original sobre o tema abaixo.

RETORNE APENAS JSON VÁLIDO, sem markdown.

{"headline":"título jornalístico impactante max 120 chars","lede":"primeiro parágrafo (lead) em 2-3 frases que respondem quem/o quê/quando/onde/por quê","body":"corpo do artigo em 4-6 parágrafos com fatos, dados e contexto. Use linguagem clara e direta.","sources":["fonte1","fonte2"],"category":"Agronegócio|Política|Mercado Financeiro|Geopolítica|Tecnologia|Jurídico|Outros"}

TEMA: ${topic}
CONTEXTO: ${(research_context ?? "").substring(0, 1000)}`;

                      const { text, model } = await callClaude(prompt);
                      const parsed = parseJSON(text);

                      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
                      const { data: inserted, error: insertErr } = await supabase.from("own_articles").insert({
                            topic,
                            headline: parsed.headline || topic,
                            lede: parsed.lede || "",
                            body: parsed.body || "",
                            sources: parsed.sources || [],
                            category: parsed.category || "Outros",
                            author_ai: `claude-${CLAUDE_MODEL}`,
                      }).select().single();

                      if (insertErr) throw new Error(insertErr.message);
                      return json(inserted);
          }

          if (action === "health") {
                      let claudeOk = false;
                      try {
                                    const r = await fetch("https://api.anthropic.com/v1/messages", {
                                                    method: "POST",
                                                    headers: {
                                                        "Content-Type": "application/json",
                                                        "x-api-key": ANTHROPIC_API_KEY,
                                                        "anthropic-version": "2023-06-01",
                                                    },
                                                    body: JSON.stringify({
                                                        model: CLAUDE_MODEL,
                                                        max_tokens: 10,
                                                        messages: [{ role: "user", content: "ping" }],
                                                    }),
                                                    signal: AbortSignal.timeout(8000),
                                    });
                                    claudeOk = r.ok;
                      } catch (_) {}
                      return json({ claude: claudeOk, claude_model: CLAUDE_MODEL, gemini_embed: !!GEMINI_API_KEY });
          }

          return json({ error: `Unknown action: ${action}` }, 400);

        } catch (err: any) {
    const msg = err?.message ?? String(err);
                  console.error("[gemini-proxy] Error:", msg);
                  return new Response(JSON.stringify({ error: msg }), {
                              status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
                  });
        }
});
