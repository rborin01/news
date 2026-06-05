# n8n.cloud Setup — True Press Backend
**Tempo estimado: 10 minutos**

## 1. Criar conta n8n.cloud

1. Acesse https://n8n.cloud
2. Crie conta gratuita (Community plan — 5 workflows ativos, 2.000 exec/mês)
3. Crie um workspace chamado "True Press"

---

## 2. Configurar variáveis de ambiente (n8n)

No n8n.cloud, vá em **Settings → Environment Variables** e adicione:

| Variável | Valor |
|---|---|
| `SUPABASE_URL` | `https://sfnvctljxidzueoutnxv.supabase.co` |
| `SUPABASE_ANON_KEY` | *(valor do .env.local — VITE_SUPABASE_ANON_KEY)* |
| `SUPABASE_SERVICE_ROLE_KEY` | *(pegar em Supabase → Settings → API → service_role)* |
| `RESEND_API_KEY` | *(criar em resend.com — grátis 3.000 emails/mês)* |

---

## 3. Importar os workflows

Para cada arquivo em `n8n/workflows/`:

1. No n8n, clique em **+ New Workflow**
2. Menu (três pontos) → **Import from file**
3. Selecione o arquivo `.json`
4. Clique **Save**
5. **Ative o workflow** (toggle no canto superior direito)

**Ordem de importação:**
1. `01-rss-ingestion.json` — coleta RSS a cada 30min
2. `02-ai-processing.json` — processa fila a cada 35min
3. `03-borin-indices.json` — calcula índices domingo 8h
4. `04-briefing-generator.json` — webhook para briefings personalizados
5. `05-daily-digest.json` — email diário 7h BRT

---

## 4. Configurar o webhook do briefing (Workflow 04)

Após ativar o workflow 04:
1. Clique no node **Webhook Trigger**
2. Copie a **Production URL** (formato: `https://[seu-workspace].app.n8n.cloud/webhook/briefing-generate`)
3. Adicione no Vercel env vars: `VITE_N8N_BRIEFING_WEBHOOK_URL=https://[url-copiada]`
4. Também adicione no `.env.local` local

---

## 5. Testar

Para cada workflow, clique em **Execute Workflow** (manualmente) e verifique:
- ✅ 01: Supabase retorna `{ingested: N}`
- ✅ 02: Supabase retorna `{processed: N}`
- ✅ 03: Insere dados em `borin_indices`
- ✅ 04: Webhook responde `{briefing_id: "...", status: "done"}`
- ✅ 05: Email chega em rborin01@gmail.com

---

## 6. Desativar os Supabase cron jobs (opcional, depois de validar n8n)

Quando n8n estiver estável, você pode desativar os cron jobs do Supabase em:
https://supabase.com/dashboard/project/sfnvctljxidzueoutnxv/integrations/cron/overview

Os workflows 01 e 02 substituem os crons existentes.
