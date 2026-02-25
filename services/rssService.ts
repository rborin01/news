
// SERVIÇO DE COLETA RSS (FALLBACK DE DADOS)
// Usado quando a API do Gemini (Search Grounding) está sem cota ou falha.
// Coleta dados brutos para alimentar a IA.

export interface RawNewsItem {
    title: string;
    link: string;
    pubDate: string;
    source: string;
    snippet: string;
}

export const harvestGoogleNews = async (query: string): Promise<RawNewsItem[]> => {
    const encodedQuery = encodeURIComponent(query);
    
    // ESTRATÉGIA MULTI-FONTE
    const sources = [
        {
            name: 'Google News',
            url: `https://news.google.com/rss/search?q=${encodedQuery}&hl=pt-BR&gl=BR&ceid=BR:pt-419`,
            parser: 'google'
        },
        {
            name: 'Bing News',
            url: `https://www.bing.com/news/search?q=${encodedQuery}&format=rss&setmkt=pt-BR`,
            parser: 'bing'
        }
    ];

    // --- CAMADA 1: RSS2JSON (API Externa - Mais limpa) ---
    for (const source of sources) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 4000);
            
            // Tenta RSS2JSON
            const res = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(source.url)}`, { signal: controller.signal });
            clearTimeout(timeoutId);

            if (res.ok) {
                const data = await res.json();
                if (data.status === 'ok' && data.items && data.items.length > 0) {
                    console.log(`[RSS] SUCESSO via RSS2JSON (${source.name}).`);
                    return data.items.slice(0, 10).map((item: any) => ({
                        title: item.title,
                        link: item.link,
                        pubDate: item.pubDate,
                        source: source.name,
                        snippet: (item.description || item.content || "").replace(/<[^>]*>?/gm, '').substring(0, 200)
                    }));
                }
            }
        } catch (e) {
            // Falha silenciosa, tenta proxies
        }
    }

    // --- CAMADA 2: PROXIES DE XML (Fallback Robusto) ---
    // Randomiza a ordem para balancear carga e evitar bloqueio de IP do proxy
    const proxies = [
        {
            name: 'CodeTabs',
            getUrl: (u: string) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(u)}`,
            execute: async (url: string, signal: AbortSignal) => {
                const res = await fetch(url, { signal });
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                return await res.text();
            }
        },
        {
            name: 'AllOrigins',
            getUrl: (u: string) => `https://api.allorigins.win/get?url=${encodeURIComponent(u)}`,
            execute: async (url: string, signal: AbortSignal) => {
                const res = await fetch(url, { signal });
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const json = await res.json(); 
                return json.contents;
            }
        },
        {
            name: 'CorsProxy',
            getUrl: (u: string) => `https://corsproxy.io/?${encodeURIComponent(u)}`,
            execute: async (url: string, signal: AbortSignal) => {
                const res = await fetch(url, { signal });
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                return await res.text();
            }
        }
    ].sort(() => Math.random() - 0.5);

    for (const source of sources) {
        for (const proxy of proxies) {
            try {
                const proxyUrl = proxy.getUrl(source.url);
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 6000); 

                let xmlContent = "";
                try {
                    xmlContent = await proxy.execute(proxyUrl, controller.signal);
                } finally {
                    clearTimeout(timeoutId);
                }

                // Validação rigorosa de XML para evitar erros de parser
                if (!xmlContent || typeof xmlContent !== 'string' || xmlContent.trim().length < 50 || xmlContent.includes('<title>Error</title>') || xmlContent.includes('consent.google.com')) {
                    throw new Error("Conteúdo inválido");
                }

                const parser = new DOMParser();
                const xmlDoc = parser.parseFromString(xmlContent, "text/xml");
                if (xmlDoc.querySelector("parsererror")) throw new Error("Erro de parser XML");

                const items = Array.from(xmlDoc.querySelectorAll("item")).slice(0, 15);
                
                if (items.length > 0) {
                    console.log(`[RSS] SUCESSO via ${source.name} (${proxy.name}). ${items.length} itens.`);
                    return items.map(item => {
                        const descriptionHtml = item.querySelector("description")?.textContent || "";
                        const cleanSnippet = descriptionHtml
                            .replace(/<[^>]*>?/gm, '')
                            .replace(/&nbsp;/g, ' ')
                            .replace(/\s+/g, ' ')
                            .substring(0, 200)
                            .trim();

                        return {
                            title: item.querySelector("title")?.textContent || "Sem Título",
                            link: item.querySelector("link")?.textContent || "",
                            pubDate: item.querySelector("pubDate")?.textContent || "",
                            source: item.querySelector("source")?.textContent || source.name,
                            snippet: cleanSnippet
                        };
                    });
                }
            } catch (e) {
               // Continua tentando outros proxies
            }
        }
    }

    console.error("[RSS] TODAS AS FONTES FALHARAM.");
    return [];
};
