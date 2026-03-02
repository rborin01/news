// ============================================================================
// TRUE PRESS — services/rssFeeds.ts v3.8.0
// Total: 79 feeds organizados por categoria
// Categorias: Política/Geral | Agronegócio | Mercado Financeiro |
//             Geopolítica/Internacional | Segurança/Defesa | Tecnologia
// ============================================================================

export const RSS_FEEDS: string[] = [

    // ── POLÍTICA E GERAL ─────────────────────────────────────────────────────
    "https://feeds.folha.uol.com.br/poder/rss091.xml",
    "https://feeds.folha.uol.com.br/mercado/rss091.xml",
    "https://feeds.folha.uol.com.br/mundo/rss091.xml",
    "https://feeds.folha.uol.com.br/cotidiano/rss091.xml",
    "https://g1.globo.com/rss/g1/politica/feed.xml",
    "https://g1.globo.com/rss/g1/economia/feed.xml",
    "https://g1.globo.com/rss/g1/mundo/feed.xml",
    "https://www.poder360.com.br/feed/",
    "https://www.gazetadopovo.com.br/feed/",
    "https://veja.abril.com.br/feed/",
    "https://www.correiobraziliense.com.br/rss/brasil.xml",
    "https://oglobo.globo.com/rss.xml",
    "https://piaui.folha.uol.com.br/feed/",
    "https://www.istoedinheiro.com.br/feed/",
    "https://exame.com/feed/",
    "https://agenciabrasil.ebc.com.br/rss/ultimasnoticias/feed.xml",
    "https://www.senado.leg.br/noticias/rss/rs_noticias.xml",
    "https://www.camara.leg.br/noticias/rss/ultimasNoticias",

    // ── AGRONEGÓCIO ──────────────────────────────────────────────────────────
    "https://www.noticiasagricolas.com.br/noticias/soja.xml",
    "https://www.noticiasagricolas.com.br/noticias/milho.xml",
    "https://www.noticiasagricolas.com.br/noticias/boi-gordo.xml",
    "https://www.noticiasagricolas.com.br/noticias/cafe.xml",
    "https://www.noticiasagricolas.com.br/noticias/algodao.xml",
    "https://www.noticiasagricolas.com.br/noticias/agronegocio.xml",
    "https://revistagloborural.globo.com/rss/noticias/feed.xml",
    "https://www.cnabrasil.org.br/rss/noticias",
    "https://www.embrapa.br/rss/noticias.xml",
    "https://www.canalrural.com.br/rss/ultimas-noticias.xml",
    "https://www.agrolink.com.br/rss/noticias.xml",
    "https://www.agrosaber.com.br/feed/",
    "https://www.agranja.com/rss.xml",
    "https://www.pecuariabrasil.com.br/feed/",
    "https://www.dbo.com.br/rss.xml",
    "https://ruralnews.com.br/feed/",

    // ── MERCADO FINANCEIRO ────────────────────────────────────────────────────
    "https://www.infomoney.com.br/ultimas-noticias/feed/",
    "https://www.infomoney.com.br/mercados/feed/",
    "https://www.infomoney.com.br/economia/feed/",
    "https://www.infomoney.com.br/onde-investir/feed/",
    "https://valor.globo.com/rss/financas/feed.xml",
    "https://valor.globo.com/rss/brasil/feed.xml",
    "https://valor.globo.com/rss/agro/feed.xml",
    "https://moneytimes.com.br/mercados/feed/",
    "https://moneytimes.com.br/negocios/feed/",
    "https://feeds.reuters.com/reuters/businessNews",
    "https://feeds.reuters.com/reuters/companyNews",
    "https://bloomberglinea.com.br/rss/",
    "https://www.sunoresearch.com.br/noticias/feed/",
    "https://blog.kinvo.com.br/feed/",

    // ── GEOPOLÍTICA E INTERNACIONAL ───────────────────────────────────────────
    "https://feeds.bbci.co.uk/portuguese/rss.xml",
    "https://feeds.bbci.co.uk/portuguese/brasil/rss.xml",
    "https://feeds.bbci.co.uk/portuguese/mundo/rss.xml",
    "https://rss.dw.com/xml/rss-br-all",
    "https://rss.dw.com/xml/rss-br-brasil",
    "https://rss.dw.com/xml/rss-br-mundo",
    "https://www.france24.com/pt/rss",
    "https://diplomatique.org.br/feed/",
    "https://outraspalavras.net/feed/",
    "https://theintercept.com/feed/?lang=pt",
    "https://feeds.reuters.com/Reuters/worldNews",
    "https://feeds.reuters.com/reuters/topNews",
    "https://www.aljazeera.com/xml/rss/all.xml",
    "https://foreignpolicy.com/feed/",

    // ── SEGURANÇA E DEFESA ────────────────────────────────────────────────────
    "https://www.gov.br/defesa/pt-br/RSS.xml",
    "https://www.naval.com.br/blog/feed/",
    "https://www.defesanet.com.br/rss/rss.xml",
    "https://www.gov.br/pf/pt-br/RSS.xml",
    "https://www.senado.leg.br/noticias/rss/rs_seguranca.xml",
    "https://www.gov.br/mj/pt-br/RSS.xml",

    // ── TECNOLOGIA E IA ──────────────────────────────────────────────────────
    "https://mittechreview.com.br/feed/",
    "https://rss.tecmundo.com.br/feed",
    "https://olhardigital.com.br/feed/",
    "https://canaltech.com.br/rss/",
    "https://www.theverge.com/rss/index.xml",
    "https://feeds.arstechnica.com/arstechnica/index",
  ];

export const FEED_CATEGORIES: Record<string, string[]> = {
    politica_geral: RSS_FEEDS.slice(0, 18),
    agronegocio:    RSS_FEEDS.slice(18, 34),
    financeiro:     RSS_FEEDS.slice(34, 48),
    geopolitica:    RSS_FEEDS.slice(48, 62),
    seguranca:      RSS_FEEDS.slice(62, 68),
    tecnologia:     RSS_FEEDS.slice(68),
};

export const FEED_COUNT = RSS_FEEDS.length;
