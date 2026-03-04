// ============================================================================
// TRUE PRESS — services/rssFeeds.ts v3.8.1
// Exporta: RSS_FEEDS, FEED_CATEGORIES, FEED_COUNT (novos)
//        + FeedSource, getFeedsByPriority, MAX_ARTICLES_PER_CYCLE,
//          GEMINI_DELAY_MS (mantidos — usados por rssService.ts)
// ============================================================================

// ── Tipos ────────────────────────────────────────────────────────────────────

export interface FeedSource {
      name: string;
      url: string;
      category: string;
      language: 'pt' | 'en' | 'es' | 'fr';
      priority: 1 | 2 | 3; // 1=crítico, 2=importante, 3=complementar
}

// ── Constantes ───────────────────────────────────────────────────────────────

export const MAX_ARTICLES_PER_CYCLE = 150;
export const GEMINI_DELAY_MS = 4200;

// ── Feeds catalogados ────────────────────────────────────────────────────────

export const FEED_SOURCES: FeedSource[] = [

      // ── POLÍTICA E GERAL ──────────────────────────────────────────────────────
    { name: 'Folha Poder',        url: 'https://feeds.folha.uol.com.br/poder/rss091.xml',                    category: 'Política',          language: 'pt', priority: 1 },
    { name: 'Folha Mercado',      url: 'https://feeds.folha.uol.com.br/mercado/rss091.xml',                  category: 'Mercado Financeiro', language: 'pt', priority: 1 },
    { name: 'Folha Mundo',        url: 'https://feeds.folha.uol.com.br/mundo/rss091.xml',                    category: 'Geopolítica',        language: 'pt', priority: 1 },
    { name: 'Folha Cotidiano',    url: 'https://feeds.folha.uol.com.br/cotidiano/rss091.xml',                category: 'Política',          language: 'pt', priority: 2 },
    { name: 'G1 Política',        url: 'https://g1.globo.com/rss/g1/politica/feed.xml',                     category: 'Política',          language: 'pt', priority: 1 },
{ name: 'G1 Economia',        url: 'https://g1.globo.com/rss/g1/economia/feed.xml',                     category: 'Mercado Financeiro', language: 'pt', priority: 1 },
    { name: 'G1 Mundo',           url: 'https://g1.globo.com/rss/g1/mundo/feed.xml',                        category: 'Geopolítica',        language: 'pt', priority: 1 },
    { name: 'Poder360',           url: 'https://www.poder360.com.br/feed/',                                  category: 'Política',          language: 'pt', priority: 1 },
    { name: 'Gazeta do Povo',     url: 'https://www.gazetadopovo.com.br/feed/',                              category: 'Política',          language: 'pt', priority: 2 },
    { name: 'Veja',               url: 'https://veja.abril.com.br/feed/',                                    category: 'Política',          language: 'pt', priority: 2 },
    { name: 'Correio Braziliense',url: 'https://www.correiobraziliense.com.br/rss/brasil.xml',               category: 'Política',          language: 'pt', priority: 2 },
    { name: 'O Globo',            url: 'https://oglobo.globo.com/rss.xml',                                   category: 'Política',          language: 'pt', priority: 2 },
    { name: 'Piauí',              url: 'https://piaui.folha.uol.com.br/feed/',                               category: 'Política',          language: 'pt', priority: 3 },
    { name: 'IstoÉ Dinheiro',     url: 'https://www.istoedinheiro.com.br/feed/',                             category: 'Mercado Financeiro', language: 'pt', priority: 2 },
    { name: 'Exame',              url: 'https://exame.com/feed/',                                            category: 'Mercado Financeiro', language: 'pt', priority: 2 },
    { name: 'Agência Brasil',     url: 'https://agenciabrasil.ebc.com.br/rss/ultimasnoticias/feed.xml',     category: 'Política',          language: 'pt', priority: 1 },
    { name: 'Senado',             url: 'https://www.senado.leg.br/noticias/rss/rs_noticias.xml',             category: 'Política',          language: 'pt', priority: 2 },
    { name: 'Câmara',             url: 'https://www.camara.leg.br/noticias/rss/ultimasNoticias',             category: 'Política',          language: 'pt', priority: 2 },

      // ── AGRONEGÓCIO ────────────────────────────────────────────────────────────
    { name: 'NotAg Soja',         url: 'https://www.noticiasagricolas.com.br/noticias/soja.xml',             category: 'Agronegócio',        language: 'pt', priority: 1 },
    { name: 'NotAg Milho',        url: 'https://www.noticiasagricolas.com.br/noticias/milho.xml',            category: 'Agronegócio',        language: 'pt', priority: 1 },
    { name: 'NotAg Boi Gordo',    url: 'https://www.noticiasagricolas.com.br/noticias/boi-gordo.xml',       category: 'Agronegócio',        language: 'pt', priority: 1 },
    { name: 'NotAg Café',         url: 'https://www.noticiasagricolas.com.br/noticias/cafe.xml',             category: 'Agronegócio',        language: 'pt', priority: 1 },
    { name: 'NotAg Algodão',      url: 'https://www.noticiasagricolas.com.br/noticias/algodao.xml',          category: 'Agronegócio',        language: 'pt', priority: 2 },
    { name: 'NotAg Agronegócio',  url: 'https://www.noticiasagricolas.com.br/noticias/agronegocio.xml',     category: 'Agronegócio',        language: 'pt', priority: 1 },
    { name: 'Globo Rural',        url: 'https://revistagloborural.globo.com/rss/noticias/feed.xml',         category: 'Agronegócio',        language: 'pt', priority: 1 },
    { name: 'CNA',                url: 'https://www.cnabrasil.org.br/rss/noticias',                          category: 'Agronegócio',        language: 'pt', priority: 2 },
    { name: 'Embrapa',            url: 'https://www.embrapa.br/rss/noticias.xml',                            category: 'Agronegócio',        language: 'pt', priority: 2 },
    { name: 'Canal Rural',        url: 'https://www.canalrural.com.br/rss/ultimas-noticias.xml',             category: 'Agronegócio',        language: 'pt', priority: 1 },
    { name: 'Agrolink',           url: 'https://www.agrolink.com.br/rss/noticias.xml',                       category: 'Agronegócio',        language: 'pt', priority: 2 },
    { name: 'AgroSaber',          url: 'https://www.agrosaber.com.br/feed/',                                 category: 'Agronegócio',        language: 'pt', priority: 3 },
    { name: 'A Granja',           url: 'https://www.agranja.com/rss.xml',                                    category: 'Agronegócio',        language: 'pt', priority: 3 },
    { name: 'Pecuária Brasil',    url: 'https://www.pecuariabrasil.com.br/feed/',                            category: 'Agronegócio',        language: 'pt', priority: 2 },
    { name: 'DBO',                url: 'https://www.dbo.com.br/rss.xml',                                     category: 'Agronegócio',        language: 'pt', priority: 2 },
    { name: 'Ruralnews',          url: 'https://ruralnews.com.br/feed/',                                     category: 'Agronegócio',        language: 'pt', priority: 3 },

      // ── MERCADO FINANCEIRO ──────────────────────────────────────────────────────
    { name: 'InfoMoney Últimas',  url: 'https://www.infomoney.com.br/ultimas-noticias/feed/',                category: 'Mercado Financeiro', language: 'pt', priority: 1 },
    { name: 'InfoMoney Mercados', url: 'https://www.infomoney.com.br/mercados/feed/',                        category: 'Mercado Financeiro', language: 'pt', priority: 1 },
    { name: 'InfoMoney Economia', url: 'https://www.infomoney.com.br/economia/feed/',                        category: 'Mercado Financeiro', language: 'pt', priority: 1 },
    { name: 'InfoMoney Invest',   url: 'https://www.infomoney.com.br/onde-investir/feed/',                   category: 'Mercado Financeiro', language: 'pt', priority: 2 },
    { name: 'Valor Finanças',     url: 'https://valor.globo.com/rss/financas/feed.xml',                     category: 'Mercado Financeiro', language: 'pt', priority: 1 },
    { name: 'Valor Brasil',       url: 'https://valor.globo.com/rss/brasil/feed.xml',                       category: 'Mercado Financeiro', language: 'pt', priority: 1 },
    { name: 'Valor Agro',         url: 'https://valor.globo.com/rss/agro/feed.xml',                         category: 'Agronegócio',        language: 'pt', priority: 1 },
    { name: 'Money Times',        url: 'https://moneytimes.com.br/mercados/feed/',                           category: 'Mercado Financeiro', language: 'pt', priority: 2 },
    { name: 'Money Times Neg',    url: 'https://moneytimes.com.br/negocios/feed/',                           category: 'Mercado Financeiro', language: 'pt', priority: 2 },
    { name: 'Reuters Business',   url: 'https://feeds.reuters.com/reuters/businessNews',                     category: 'Mercado Financeiro', language: 'en', priority: 1 },
    { name: 'Reuters Companies',  url: 'https://feeds.reuters.com/reuters/companyNews',                      category: 'Mercado Financeiro', language: 'en', priority: 2 },
    { name: 'Bloomberg Línea',    url: 'https://bloomberglinea.com.br/rss/',                                 category: 'Mercado Financeiro', language: 'pt', priority: 1 },
    { name: 'Suno Research',      url: 'https://www.sunoresearch.com.br/noticias/feed/',                     category: 'Mercado Financeiro', language: 'pt', priority: 2 },
    { name: 'Kinvo',              url: 'https://blog.kinvo.com.br/feed/',                                    category: 'Mercado Financeiro', language: 'pt', priority: 3 },

      // ── GEOPOLÍTICA E INTERNACIONAL ─────────────────────────────────────────────
    { name: 'BBC Brasil',         url: 'https://feeds.bbci.co.uk/portuguese/rss.xml',                       category: 'Geopolítica',        language: 'pt', priority: 1 },
    { name: 'BBC Brasil BR',      url: 'https://feeds.bbci.co.uk/portuguese/brasil/rss.xml',                category: 'Geopolítica',        language: 'pt', priority: 1 },
    { name: 'BBC Mundo',          url: 'https://feeds.bbci.co.uk/portuguese/mundo/rss.xml',                 category: 'Geopolítica',        language: 'pt', priority: 1 },
    { name: 'DW Brasil All',      url: 'https://rss.dw.com/xml/rss-br-all',                                 category: 'Geopolítica',        language: 'pt', priority: 1 },
    { name: 'DW Brasil',          url: 'https://rss.dw.com/xml/rss-br-brasil',                              category: 'Geopolítica',        language: 'pt', priority: 2 },
    { name: 'DW Mundo',           url: 'https://rss.dw.com/xml/rss-br-mundo',                               category: 'Geopolítica',        language: 'pt', priority: 2 },
    { name: 'France 24',          url: 'https://www.france24.com/pt/rss',                                   category: 'Geopolítica',        language: 'pt', priority: 2 },
    { name: 'Le Monde Dipl.',     url: 'https://diplomatique.org.br/feed/',                                  category: 'Geopolítica',        language: 'pt', priority: 2 },
    { name: 'Outras Palavras',    url: 'https://outraspalavras.net/feed/',                                   category: 'Geopolítica',        language: 'pt', priority: 3 },
    { name: 'The Intercept BR',   url: 'https://theintercept.com/feed/?lang=pt',                            category: 'Geopolítica',        language: 'pt', priority: 2 },
    { name: 'Reuters World',      url: 'https://feeds.reuters.com/Reuters/worldNews',                       category: 'Geopolítica',        language: 'en', priority: 1 },
    { name: 'Reuters Top',        url: 'https://feeds.reuters.com/reuters/topNews',                         category: 'Geopolítica',        language: 'en', priority: 1 },
    { name: 'Al Jazeera',         url: 'https://www.aljazeera.com/xml/rss/all.xml',                         category: 'Geopolítica',        language: 'en', priority: 2 },
    { name: 'Foreign Policy',     url: 'https://foreignpolicy.com/feed/',                                   category: 'Geopolítica',        language: 'en', priority: 2 },

      // ── SEGURANÇA E DEFESA ──────────────────────────────────────────────────────
    { name: 'Min. Defesa',        url: 'https://www.gov.br/defesa/pt-br/RSS.xml',                           category: 'Segurança',          language: 'pt', priority: 2 },
    { name: 'Poder Naval',        url: 'https://www.naval.com.br/blog/feed/',                               category: 'Segurança',          language: 'pt', priority: 2 },
    { name: 'Defesa Net',         url: 'https://www.defesanet.com.br/rss/rss.xml',                          category: 'Segurança',          language: 'pt', priority: 2 },
    { name: 'PF',                 url: 'https://www.gov.br/pf/pt-br/RSS.xml',                               category: 'Segurança',          language: 'pt', priority: 3 },
    { name: 'Senado Segurança',   url: 'https://www.senado.leg.br/noticias/rss/rs_seguranca.xml',           category: 'Segurança',          language: 'pt', priority: 2 },
    { name: 'Min. Justiça',       url: 'https://www.gov.br/mj/pt-br/RSS.xml',                               category: 'Segurança',          language: 'pt', priority: 2 },

      // ── TECNOLOGIA E IA ─────────────────────────────────────────────────────────
    { name: 'MIT Tech Review BR', url: 'https://mittechreview.com.br/feed/',                                category: 'Tecnologia',         language: 'pt', priority: 2 },
    { name: 'Tecmundo',           url: 'https://rss.tecmundo.com.br/feed',                                  category: 'Tecnologia',         language: 'pt', priority: 2 },
    { name: 'Olhar Digital',      url: 'https://olhardigital.com.br/feed/',                                 category: 'Tecnologia',         language: 'pt', priority: 2 },
    { name: 'Canaltech',          url: 'https://canaltech.com.br/rss/',                                     category: 'Tecnologia',         language: 'pt', priority: 2 },
    { name: 'The Verge',          url: 'https://www.theverge.com/rss/index.xml',                            category: 'Tecnologia',         language: 'en', priority: 2 },
    { name: 'Ars Technica',       url: 'https://feeds.arstechnica.com/arstechnica/index',                   category: 'Tecnologia',         language: 'en', priority: 2 },

    ];

// ── Compatibilidade com rssService.ts ────────────────────────────────────────

// RSS_FEEDS: array simples de URLs (usado pelo newsQueue.ts)
export const RSS_FEEDS: string[] = FEED_SOURCES.map(f => f.url);

// getFeedsByPriority: usado pelo rssService.ts
export const getFeedsByPriority = (maxPriority: 1 | 2 | 3 = 2): FeedSource[] =>
      FEED_SOURCES.filter(f => f.priority <= maxPriority);

// FEED_CATEGORIES: agrupado por categoria
export const FEED_CATEGORIES: Record<string, string[]> = FEED_SOURCES.reduce((acc, f) => {
      const key = f.category.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z_]/g, '');
      if (!acc[key]) acc[key] = [];
      acc[key].push(f.url);
      return acc;
}, {} as Record<string, string[]>);

export const FEED_COUNT = FEED_SOURCES.length;
