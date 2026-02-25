# True Press - Private Intelligence

## Descrição do Projeto
True Press é um dashboard de inteligência privada projetado para análise crítica de notícias, desconstrução de narrativas e previsão de oportunidades. Utiliza IA avançada (Gemini 3 Pro / Ollama Local) para filtrar o ruído da mídia mainstream e extrair a verdade factual.

## Stack Tecnológica
- **Frontend:** React 19, TypeScript, Tailwind CSS, Vite
- **Armazenamento:** IndexedDB (idb) para persistência local-first
- **IA:** Google Gemini API (`@google/genai`), Ollama (Local LLM)
- **RAG:** Sistema nativo de Retrieval-Augmented Generation com embeddings vetoriais locais

## Instruções de Instalação Local

1. Clone o repositório
2. Instale as dependências:
   ```bash
   npm install
   ```
3. Copie o arquivo `.env.example` para `.env` e configure sua chave da API do Gemini:
   ```bash
   cp .env.example .env
   ```
4. Inicie o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```

## Instruções de Deploy na Vercel

1. Crie um novo projeto na Vercel e conecte ao seu repositório GitHub.
2. Nas configurações do projeto (Environment Variables), adicione:
   - `VITE_API_KEY`: Sua chave do Google Gemini API
3. O comando de build padrão (`npm run build`) e o diretório de saída (`dist`) serão detectados automaticamente.
4. Clique em Deploy.

## Configuração de Domínio Personalizado (news.rodrigoborin.com)

1. No painel da Vercel, vá em Settings > Domains.
2. Adicione o domínio `news.rodrigoborin.com`.
3. No painel de DNS do seu provedor de domínio (onde `rodrigoborin.com` está registrado), adicione um registro CNAME:
   - **Nome/Host:** `news`
   - **Valor/Destino:** `cname.vercel-dns.com.`
4. Aguarde a propagação do DNS e a Vercel emitirá o certificado SSL automaticamente.

## Arquitetura RAG (Retrieval-Augmented Generation)

O sistema RAG do True Press (DO-178C Level A) opera inteiramente no navegador para máxima privacidade:
1. **Geração de Embeddings:** Utiliza o modelo `text-embedding-004` do Gemini para converter notícias em vetores semânticos de 768 dimensões.
2. **Armazenamento Local:** Os vetores são salvos no IndexedDB (store `embeddings`).
3. **Busca Semântica:** Calcula a similaridade cosseno entre a query do usuário e o banco de vetores para recuperar o contexto histórico mais relevante.
4. **Análise Enriquecida:** Injeta o contexto recuperado nos prompts do Gemini 3 Pro para gerar análises profundas baseadas no histórico real de notícias.

## Variáveis de Ambiente Necessárias

- `VITE_API_KEY`: Chave de API do Google Gemini (Obrigatório para nuvem e RAG).
- `VITE_OLLAMA_URL`: URL do servidor Ollama local (Padrão: `http://localhost:11434`).
- `VITE_APP_VERSION`: Versão do aplicativo.
- `VITE_APP_NAME`: Nome do aplicativo.
