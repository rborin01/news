
# BLUEPRINT DO SISTEMA: TRUE PRESS (NUCLEAR CORE)

**Versão:** 3.5.0 (Deploy & PWA Fix)
**Status:** DO-178C LEVEL A (CRÍTICO)

## 0. REGRAS DE OURO (ARQUITETURA)
1.  **MODULARIDADE EXTREMA:** Componentes devem ser atômicos.
2.  **LIMITE DE ARQUIVO:** Máximo **500 linhas**. Se passar, refatore.
3.  **ZERO SIMPLIFICAÇÃO:** Funcionalidades existentes (gráficos, listas) nunca podem ser removidas sem ordem explícita.
4.  **PERSISTÊNCIA MULTI-LAYER:** O sistema deve operar com redundância de dados (L1-L5).
5.  **SANITIZAÇÃO RETROATIVA:** Todo dado lido do DB deve passar por um adaptador de esquema.
6.  **REDUNDÂNCIA DE COLETA (NOVO):** Falha em uma fonte dispara automaticamente a próxima (Cascade Fetching).

## 1. PROTOCOLO DE COLETA DE DADOS (CASCATA)
O sistema nunca deve retornar "vazio" sem tentar todas as camadas:
1.  **L1 - Python Bridge:** Scraper local (se disponível). Alta fidelidade.
2.  **L2 - Cloud Scraper:** API Vercel com Headers Blindados.
3.  **L3 - Google RSS Proxy:** Via `CorsProxy` ou `AllOrigins`.
4.  **L4 - Bing RSS Proxy (NOVO):** Fonte alternativa de alta disponibilidade.
5.  **L5 - Gemini Native Search (ÚLTIMO RECURSO):** Uso da ferramenta `googleSearch` da IA.

## 2. PROTOCOLO DE MEMÓRIA (5 CAMADAS)
1.  **L1 - Volatile (RAM):** React State.
2.  **L2 - Persistent (IndexedDB):** Armazenamento de massa.
3.  **L3 - Emergency (Blackbox):** LocalStorage (Backup automático 200 itens).
4.  **L4 - Versioning (Snapshots):** Histórico de relatórios.
5.  **L5 - Archive (Cold Storage):** JSON Manual.

## 3. ESTRUTURAS DE DADOS IMUTÁVEIS
*A ordem e a nomenclatura exata devem ser preservadas em `types.ts` e UI.*

### A. Categorias Prioritárias (Rodrigo Borin)
1. "🚨 Manchetes & Alertas"
2. "⚖️ Política & STF (Leis)"
3. "🌱 Agronegócio & Commodities"
4. "💹 Forex & Finanças"
5. "🏗️ Imobiliário & Construção SC"
6. "🗽 Liberdade & Censura"

### B. Categorias Google News (Standard)
1. "🤖 Inteligência Artificial"
2. "🇧🇷 Brasil"
3. "🌍 Mundo"
4. "💼 Negócios"
5. "💻 Tecnologia"
6. "🎬 Entretenimento"
7. "⚽ Esportes"
8. "🧬 Ciência"
9. "🏥 Saúde"

---

## 4. WHITELIST DE ARQUIVOS (INVENTÁRIO TOTAL)

### A. Núcleo (Core)
1.  `index.html`
2.  `index.tsx`
3.  `App.tsx`
4.  `types.ts`
5.  `db.ts`

### B. Inteligência
6.  `services/rssService.ts`: **[ATUALIZADO]** Bing RSS adicionado.
7.  `services/geminiService.ts`: **[ATUALIZADO]** Lógica de Fallback para Grounding.
8.  `services/ollamaService.ts`
9.  `services/pythonBridge.ts`
10. `api/scrape.js`: **[ATUALIZADO]** Headers anti-bot.

### C. Interface (UI Shell)
11. `components/Header.tsx`
12. `components/Sidebar.tsx`
13. `components/Dashboard.tsx`
14. `components/SystemMonitor.tsx`
15. `components/LoadingOverlay.tsx`
16. `components/AuthGate.tsx`

### D. Unidades de Visualização
17. `components/NewsCard.tsx`
18. `components/NewsModal.tsx`
19. `components/AiInvestigationCard.tsx`
20. `components/RawDataCard.tsx`
21. `components/CommodityItem.tsx`
22. `components/NewsChart.tsx`

23. ---

24. ## CHANGELOG

25. ### v3.5.0 — Deploy & PWA Fix (2026-02-25)
26. - **DEPLOY**: Site ao vivo em https://news.rodrigoborin.com (Vercel + Cloudflare Full SSL)
    - - **FIX**: `vite.config.ts` corrigido para usar `process.env.VITE_API_KEY` na build do Vercel
    - **FIX**: `index.html` — removido Tailwind CDN duplicado e tags duplicadas, depois restaurado CDN
    - - **ADD**: `public/manifest.json` — PWA manifest com metadados, categorias e ícones
      - - **ADD**: `public/favicon.svg` — ícone SVG (dark #0f172a + TP azul #38bdf8)
        - - **ADD**: `index.html` linha 16 — `<link rel="icon" type="image/svg+xml" href="/favicon.svg" />`
          - - **ADD**: `public/` — nova pasta no repo (antes inexistente)
            - - **WHITELIST UPDATE**: Adicionado `index.css`, `public/manifest.json`, `public/favicon.svg`
             
              - ### v3.4.1 — Redundancy Update (sessões anteriores)
              - - Bing RSS Proxy adicionado (L4 cascade)
                - - Headers anti-bot em api/scrape.js
                  - - Gemini Fallback Grounding em services/geminiService.ts
27. `components/DeepAnalysisModal.tsx`
28. `components/NeuralBridgeModal.tsx`
