# FORGE Master Plan — True Press v2
**Data:** 2026-06-04
**Orquestrador:** Claude Sonnet 4.6
**Metodologia:** FORGE (DO-178C adaptado para web)
**Backend:** n8n.cloud (free tier) + Supabase Edge Functions
**Frontend:** React 19 + Vite + TypeScript
**Banco:** Supabase (PostgreSQL + pgvector)

---

## Módulos a implementar (em paralelo)

### M1 — auth-supabase
**Prioridade:** CRÍTICO — bloqueia tudo
**O que faz:** Substitui AuthGate.tsx (40 palavras como senha) por Supabase Auth real
**Arquivos afetados:**
- `components/AuthGate.tsx` — reescrever completo
- `App.tsx` — trocar `sessionStorage.truepress_auth` por `supabase.auth.getUser()`
- Supabase: tabela `user_profiles`, RLS em todas as tabelas

**Spec:**
- Login com email + senha (sem OAuth por ora)
- Registro com confirmação de email
- Sessão persistida via Supabase Auth (JWT)
- Redirect automático pós-login
- Logout limpo
- `user_profiles`: id (FK auth.users), email, name, role (admin/leitor), created_at
- RLS: `processed_news` e `raw_news` leitura para authenticated; `own_articles` somente service_role
- REGRA: nunca expor service_role key no frontend

**Testes obrigatórios (FORGE — escrever antes do código):**
- Login com credenciais válidas → authorized = true
- Login com credenciais inválidas → erro mensagem amigável
- Sessão persistida após refresh da página
- Logout limpa sessão
- Usuário não autenticado → redirect para /login

---

### M2 — db-schema
**Prioridade:** CRÍTICO — base para M3, M4, M5
**O que faz:** Cria as migrations SQL para todas as novas tabelas
**Arquivos afetados:**
- `supabase/migrations/002_user_profiles.sql`
- `supabase/migrations/003_borin_indices.sql`
- `supabase/migrations/004_professional_profiles.sql`
- `supabase/migrations/005_briefings.sql`

**Tabelas:**

```sql
-- user_profiles (liga auth.users ao perfil)
user_profiles: id uuid FK auth.users, email, name, role, created_at

-- borin_indices (séries históricas semanais)
borin_indices: id, week_start date, index_code (IPR/IIR/IREF/ICR/ICD/ILE/ICH/IPS/IGI),
               score numeric(5,2), article_count int, methodology text, calculated_at

-- professional_profiles (True Press Pro)
professional_profiles: id, user_id FK, profession (medico/advogado/contador/engenheiro/agro),
                       specialty text, location text, keywords text[], created_at, updated_at

-- briefings (notícias personalizadas geradas)
briefings: id, user_id FK, generated_at, profession, specialty,
           articles jsonb, analysis text, status (pending/done/error)
```

**RLS policies:**
- `user_profiles`: SELECT/UPDATE próprio registro
- `borin_indices`: SELECT para todos (authenticated)
- `professional_profiles`: SELECT/INSERT/UPDATE próprio
- `briefings`: SELECT próprio

---

### M3 — n8n-workflows
**Prioridade:** ALTA — orquestrador do backend de agentes
**O que faz:** Cria os 5 workflows n8n como arquivos JSON importáveis + README de setup

**Onde roda:** n8n.cloud (free tier — 5 workflows ativos, 2.000 exec/mês)
**Setup:** 1 import manual de JSON pelo usuário (única config manual permitida)

**Workflows:**

1. **RSS Ingestion Enhanced** (substitui Supabase cron ingest_rss)
   - Trigger: schedule 30min
   - Steps: fetch feeds → dedup por URL → POST Supabase edge function `ingest_rss`
   - Diferencial: retry automático, log de erros, alert se falhar 3x

2. **AI Processing Queue** (augmenta process_queue)
   - Trigger: schedule 35min
   - Steps: GET fila pendente Supabase → batch de 10 → POST gemini-proxy `process_queue`
   - Diferencial: priorização por score estimado, retry com backoff

3. **Borin Indices Calculator** (novo)
   - Trigger: schedule semanal (domingo 8h)
   - Steps: SELECT processed_news semana → group by categoria → calcular scores → INSERT borin_indices
   - Usa Groq para classificar notícias por índice

4. **Briefing Generator** (novo — True Press Pro)
   - Trigger: webhook (usuário solicita no site)
   - Steps: GET professional_profile → semantic search Supabase → Gemini gera briefing → INSERT briefings → envia email Resend
   - Timeout: 30s max

5. **Daily Digest Email** (novo)
   - Trigger: schedule diário 7h BRT
   - Steps: GET top 10 notícias → Gemini resume → Resend envia para assinantes opt-in

**Arquivos gerados:**
- `n8n/workflows/01-rss-ingestion.json`
- `n8n/workflows/02-ai-processing.json`
- `n8n/workflows/03-borin-indices.json`
- `n8n/workflows/04-briefing-generator.json`
- `n8n/workflows/05-daily-digest.json`
- `n8n/README-SETUP.md` (instruções de import em n8n.cloud — 5 minutos)

---

### M4 — borin-indices-engine
**Prioridade:** ALTA — diferencial único do produto
**O que faz:** Lógica de cálculo dos 9 Índices Borin a partir das notícias processadas

**Índices:**
- IPR (Prosperidade Real), IIR (Inflação Real), IREF (Eficiência Fiscal)
- ICR (Custo da Regulação), ICD (Custo da Desconfiança)
- ILE (Liberdade Econômica), ICH (Capital Humano)
- IPS (Prosperidade Social), IGI (Governança Institucional)

**Arquivos afetados:**
- `services/borinIndicesService.ts` — novo, lógica de cálculo
- `components/IndicesBorinPanel.tsx` — atualizar para usar dados reais do Supabase
- `components/IndicesBorinChart.tsx` — conectar com séries históricas reais

**Lógica de cálculo:**
```
Para cada índice, semana W:
  - Filtrar processed_news WHERE processed_at BETWEEN W_start AND W_end
  - Classificar por categoria/keywords relevantes ao índice
  - Score = média ponderada de (score_brasil * peso_categoria)
  - Normalizar 0-100
  - Inserir em borin_indices
```

**Mapeamento categoria → índice:**
- IIR: notícias sobre inflação, IPCA, preços
- IREF: fiscal, orçamento, gastos públicos
- ICR: regulação, leis, burocracia
- ILE: economia, mercado, comércio
- etc.

---

### M5 — truepress-pro
**Prioridade:** MÉDIA — produto novo, sem bloqueador técnico
**O que faz:** Feature de notícias personalizadas para profissionais

**Arquivos afetados:**
- `components/ProfessionalProfileModal.tsx` — novo
- `components/BriefingPanel.tsx` — novo
- `services/briefingService.ts` — novo
- App.tsx — adicionar rota `/pro`

**Fluxo:**
1. Usuário clica "True Press Pro" na sidebar
2. Modal: seleciona profissão + especialidade + palavras-chave
3. Salva em `professional_profiles` via Supabase
4. Clica "Gerar Briefing" → POST para n8n webhook (workflow 04)
5. Tela de loading → quando briefing chega, exibe cards personalizados
6. Email com briefing enviado automaticamente

---

### M6 — sitemap-news
**Prioridade:** MÉDIA — pré-requisito Google News
**O que faz:** Gera /sitemap-news.xml dinâmico do Supabase

**Arquivos afetados:**
- `src/pages/sitemap-news.xml.ts` — novo (Vite plugin)
- `public/robots.txt` — atualizar
- `vercel.json` — adicionar rewrite para sitemap

**Formato Google News:**
```xml
<urlset xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
  <url>
    <loc>https://news.rodrigoborin.com/noticia/{id}</loc>
    <news:news>
      <news:title>{title}</news:title>
      <news:publication_date>{processed_at}</news:publication_date>
    </news:news>
  </url>
</urlset>
```

---

## Regras FORGE para este projeto

1. **Máximo 500 linhas por arquivo** (já definido no CLAUDE.md)
2. **Testes escritos ANTES do código** (cada módulo tem spec de testes acima)
3. **Nunca expor keys no frontend** — só VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY
4. **Commits convencionais:** feat/fix/docs/refactor: descrição
5. **RLS obrigatório** em todas as tabelas novas
6. **Sem TODO/FIXME no código entregue**
7. **Build deve passar** (`npm run build`) antes de qualquer commit

## Sequência de deploy

1. M2 (migrations) → rodar no Supabase SQL Editor
2. M1 (auth) → deploy Vercel automático via git push
3. M4 (indices) → deploy junto com M1
4. M3 (n8n) → import manual dos JSONs no n8n.cloud (5 min)
5. M5 (pro) → deploy Vercel
6. M6 (sitemap) → deploy Vercel

**Custo total: R$ 0**
