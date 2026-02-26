// supabase/functions/gemini-proxy/index.ts
// Edge Function: Proxy seguro para todas as chamadas Gemini API
// A chave GEMINI_API_KEY nunca chega ao browser
// DO-178C Level A | True Press v3.6.0

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY') ?? ''
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req: Request) => {
    // Handle CORS preflight
        if (req.method === 'OPTIONS') {
              return new Response('ok', { headers: CORS_HEADERS })
        }

        try {
              const body = await req.json()
              const { action, payload } = body

      // Criar cliente Supabase com service_role para escrita
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

      // =============================================
      // AÇÃO: generate - Gerar análise de notícia
      // Modelo: gemini-2.0-flash (rápido, custo baixo)
      // =============================================
      if (action === 'generate') {
              const { model = 'gemini-2.0-flash', contents, systemInstruction } = payload
              const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`

                const geminiBody: Record<string, unknown> = { contents }
              if (systemInstruction) {
                        geminiBody.systemInstruction = { parts: [{ text: systemInstruction }] }
              }

                const resp = await fetch(url, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify(geminiBody),
                })

                const data = await resp.json()
              return new Response(JSON.stringify(data), {
                        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
                        status: resp.status,
              })
      }

      // =============================================
      // AÇÃO: embed - Gerar embedding vetorial
      // Modelo: gemini-embedding-001 (768 dims, v1beta)
      // =============================================
      if (action === 'embed') {
              const { text, newsId, level1 = 'news', level2 = 'truepress', level3 = 'general' } = payload
              const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${GEMINI_API_KEY}`

                const resp = await fetch(url, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                                      model: 'models/gemini-embedding-001',
                                      content: { parts: [{ text }] },
                          }),
                })

                const data = await resp.json()

                if (!resp.ok) {
                          return new Response(JSON.stringify({ error: data }), {
                                      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
                                      status: resp.status,
                          })
                }

                const embedding = data.embedding?.values ?? data.embeddings?.[0]?.values
              if (!embedding) {
                        return new Response(JSON.stringify({ error: 'No embedding returned' }), {
                                    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
                                    status: 500,
                        })
              }

                // Salvar embedding no Supabase com hierarquia de 3 níveis
                if (newsId) {
                          await supabase.from('embeddings').upsert({
                                      news_id: newsId,
                                      content_chunk: text,
                                      embedding: `[${embedding.join(',')}]`,
                                      level_1_domain: level1,
                                      level_2_project: level2,
                                      level_3_tag: level3,
                          })
                }

                return new Response(JSON.stringify({ embedding }), {
                          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
                })
      }

      // =============================================
      // AÇÃO: save-news - Salvar notícia no Supabase
      // Usa service_role para bypass do RLS
      // =============================================
      if (action === 'save-news') {
              const { news } = payload

                const { error } = await supabase.from('news').upsert(
                          news.map((item: Record<string, unknown>) => ({
                                      id: item.id,
                                      title: item.title,
                                      source: item.source,
                                      url: item.url,
                                      published_at: item.publishedAt,
                                      category: item.category,
                                      summary: item.summary,
                                      content: item.content,
                                      narrative: item.narrative,
                                      intent: item.intent,
                                      truth: item.truth,
                                      action: item.action,
                                      rodrigo_score: item.rodrigoScore ?? 0,
                                      brasil_score: item.brasilScore ?? 0,
                                      is_critical: item.isCritical ?? false,
                                      tags: item.tags ?? [],
                                      raw_data: item,
                                      updated_at: new Date().toISOString(),
                          })),
                  { onConflict: 'id' }
                        )

                if (error) {
                          return new Response(JSON.stringify({ error: error.message }), {
                                      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
                                      status: 500,
                          })
                }

                return new Response(JSON.stringify({ ok: true, count: news.length }), {
                          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
                })
      }

      // =============================================
      // AÇÃO: semantic-search - Busca vetorial hierárquica
      // Usa filtros de 3 níveis antes de buscar (anti-colapso)
      // =============================================
      if (action === 'semantic-search') {
              const { queryText, matchCount = 5, domain, project, tag } = payload

                // 1. Gerar embedding da query
                const embedUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${GEMINI_API_KEY}`
              const embedResp = await fetch(embedUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                                    model: 'models/gemini-embedding-001',
                                    content: { parts: [{ text: queryText }] },
                        }),
              })
              const embedData = await embedResp.json()
              const queryEmbedding = embedData.embedding?.values

                if (!queryEmbedding) {
                          return new Response(JSON.stringify({ error: 'Failed to embed query' }), {
                                      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
                                      status: 500,
                          })
                }

                // 2. Busca vetorial filtrada hierarquicamente
                const { data: results, error } = await supabase.rpc('match_embeddings_hierarchical', {
                          query_embedding: `[${queryEmbedding.join(',')}]`,
                          match_count: matchCount,
                          filter_domain: domain ?? null,
                          filter_project: project ?? null,
                          filter_tag: tag ?? null,
                })

                if (error) {
                          return new Response(JSON.stringify({ error: error.message }), {
                                      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
                                      status: 500,
                          })
                }

                return new Response(JSON.stringify({ results }), {
                          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
                })
      }

      return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
              headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
              status: 400,
      })

        } catch (err) {
              return new Response(JSON.stringify({ error: String(err) }), {
                      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
                      status: 500,
              })
        }
})
