# SKILLS.md — True Press

## SKILL 1 — INICIAR SESSÃO

Leia CLAUDE.md, BLUEPRINT.md e DESIGN_DOC.md ANTES de qualquer código.

Sempre exiba o dashboard de progresso no início da resposta.

## SKILL 2 — CÓDIGO FRONTEND

Mapeamento CRÍTICO (nunca errar):

```
n.narrative_media → narrative
n.hidden_intent   → intent
n.real_facts      → truth
n.impact_rodrigo  → action
```

Padrão Supabase:

```typescript
const { data, error } = await supabase
  .from('processed_news')
  .select('*')
  .order('processed_at', { ascending: false })
  .limit(100);

if (error) { console.error('[TruePress]', error); return []; }
```

Chamar Gemini SEMPRE via callGeminiProxy() — nunca fetch direto.

## SKILL 3 — EDGE FUNCTION (Deno, não Node)

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
const KEY = Deno.env.get('GEMINI_API_KEY') ?? '';
// sem require(), sem process.env, sem __dirname
```

Parse JSON do Gemini — SEMPRE limpar markdown:

```typescript
const clean = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
```

Embedding — NUNCA inserir vazio:

```typescript
embedding = (result && result.length > 0) ? result : undefined;
```

## SKILL 4 — PROMPT PARA CHROME

Estrutura obrigatória:

```
ARQUIVO: nome
URL: link direto no GitHub
PASSO 1: Leia o arquivo atual
PASSO 2: Localize [trecho específico]
PASSO 3: Substitua por [novo código]
PASSO 4: Commit: "tipo: descrição"
PASSO 5: Reporte hash
```

## SKILL 5 — BANCO DE DADOS

NUNCA alterar schema processed_news sem avisar Rodrigo.

Sempre testar SQL no editor antes de aplicar.

Sempre usar IF NOT EXISTS e DEFAULT em ALTER TABLE.

## SKILL 6 — DIAGNÓSTICO

Pipeline parado:

```sql
SELECT status, COUNT(*) FROM raw_news GROUP BY status;
SELECT COUNT(*) FROM processed_news ORDER BY processed_at DESC LIMIT 5;
```

Dashboard sem análises: verificar mapeamento em adaptNewsFromSupabase().

Edge Function com erro: checar Logs no dashboard Supabase.

## SKILL 7 — CHECKLIST PRÉ-COMMIT

[ ] TypeScript sem erros

[ ] Campos Supabase mapeados corretamente

[ ] API key não exposta no frontend

[ ] Arquivo < 500 linhas

[ ] Commit com prefixo feat/fix/docs/refactor

[ ] Funcionalidade existente preservada

[ ] Schema alterado? Rodrigo foi avisado?
