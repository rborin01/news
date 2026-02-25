
// BRIDGE HÍBRIDA (CLOUD + LOCAL)
// Conecta tanto com o Python local (localhost:5000) quanto com a API Vercel (/api/scrape)
// Isso permite que o app funcione tanto no seu laptop (desenvolvimento) quanto no celular (produção).

import { RawNewsItem } from "./rssService";

const PYTHON_LOCAL_API = "http://localhost:5000";
const VERCEL_CLOUD_API = "/api/scrape";

// Verifica qual backend está disponível
export const checkPythonHealth = async (): Promise<boolean> => {
    try {
        // 1. Se estivermos rodando no navegador em produção (não localhost), assumimos que a API Vercel está lá.
        if (!window.location.hostname.includes('localhost') && !window.location.hostname.includes('127.0.0.1')) {
            return true; 
        }

        // 2. Se for local, tenta o Python
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 1000);
        const res = await fetch(`${PYTHON_LOCAL_API}/health`, { signal: controller.signal });
        clearTimeout(timeoutId);
        return res.ok;
    } catch (e) {
        // Se falhar o Python local, mas a rota da API existir (ex: rodando 'npm run dev' com proxy configurado), retornamos true
        try {
            const res = await fetch(`${VERCEL_CLOUD_API}?q=test`);
            return res.ok;
        } catch (z) {
            return false;
        }
    }
};

export const scrapeViaPython = async (query: string): Promise<RawNewsItem[]> => {
    // Lógica de Seleção de Rota
    let apiUrl = "";
    
    // Prioridade: Se estiver online (Vercel), usa rota relativa. Se local, tenta Python.
    if (!window.location.hostname.includes('localhost')) {
        apiUrl = `${VERCEL_CLOUD_API}?q=${encodeURIComponent(query)}`;
    } else {
        // Teste rápido para ver se o Python responde
        try {
            await fetch(`${PYTHON_LOCAL_API}/health`, { method: 'HEAD' });
            apiUrl = `${PYTHON_LOCAL_API}/scrape?q=${encodeURIComponent(query)}`;
        } catch {
            // Fallback para API relativa mesmo localmente (caso esteja usando Vercel CLI)
            apiUrl = `${VERCEL_CLOUD_API}?q=${encodeURIComponent(query)}`;
        }
    }

    try {
        const res = await fetch(apiUrl);
        if (!res.ok) {
             const errorText = await res.text();
             throw new Error(`Erro API (${res.status}): ${errorText}`);
        }
        
        const data = await res.json();
        return data; 
    } catch (e) {
        console.warn("Falha no Scraper Híbrido:", e);
        throw e;
    }
};
