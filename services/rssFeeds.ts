// services/rssFeeds.ts
// DO-178C Level A | True Press v3.6.0
// Catalogo de feeds RSS por categoria — sem dependencia de proxy para fetch
// Rate limiting: max 50 noticias por ciclo, 4s entre chamadas Gemini

export interface FeedSource {
  name: string;
  url: string;
  category: string;
  language: 'pt' | 'en';
  priority: 1 | 2 | 3; // 1=alta, 2=media, 3=baixa
}

// ─────────────────────────────────────────────
// FEEDS ORGANIZADOS POR CATEGORIA
// Apenas feeds RSS publicos validos (testados)
// ─────────────────────────────────────────────
export const RSS_FEEDS: FeedSource[] = [

  // MANCHETES & ALERTAS (P1)
  { name: 'G1 Ultimas', url: 'https://g1.globo.com/rss/g1/', category: 'Manchetes & Alertas', language: 'pt', priority: 1 },
  { name: 'UOL Noticias', url: 'https://rss.uol.com.br/feed/noticias.xml', category: 'Manchetes & Alertas', language: 'pt', priority: 1 },
  { name: 'Folha SP', url: 'https://feeds.folha.uol.com.br/emcimadahora/rss091.xml', category: 'Manchetes & Alertas', language: 'pt', priority: 1 },
  { name: 'BBC Brasil', url: 'https://feeds.bbci.co.uk/portuguese/rss.xml', category: 'Manchetes & Alertas', language: 'pt', priority: 1 },
  { name: 'Reuters Top', url: 'https://feeds.reuters.com/reuters/topNews', category: 'Manchetes & Alertas', language: 'en', priority: 1 },

  // POLITICA & STF (P1)
  { name: 'G1 Politica', url: 'https://g1.globo.com/rss/g1/politica/', category: 'Politica & STF', language: 'pt', priority: 1 },
  { name: 'Folha Poder', url: 'https://feeds.folha.uol.com.br/poder/rss091.xml', category: 'Politica & STF', language: 'pt', priority: 1 },
  { name: 'Estadao Politica', url: 'https://www.estadao.com.br/arc/outboundfeeds/rss/politica/', category: 'Politica & STF', language: 'pt', priority: 1 },
  { name: 'Congresso Noticias', url: 'https://www.camara.leg.br/noticias/rss', category: 'Politica & STF', language: 'pt', priority: 2 },
  { name: 'Senado Noticias', url: 'https://www12.senado.leg.br/noticias/rss/ultimas', category: 'Politica & STF', language: 'pt', priority: 2 },

  // AGRONEGOCIO & COMMODITIES (P1)
  { name: 'Canal Rural', url: 'https://www.canalrural.com.br/feed/', category: 'Agronegocio & Commodities', language: 'pt', priority: 1 },
  { name: 'Agrolink', url: 'https://www.agrolink.com.br/noticias/rss', category: 'Agronegocio & Commodities', language: 'pt', priority: 1 },
  { name: 'Notícias Agrícolas', url: 'https://www.noticiasagricolas.com.br/rss/noticias.xml', category: 'Agronegocio & Commodities', language: 'pt', priority: 1 },
  { name: 'Reuters Commodities', url: 'https://feeds.reuters.com/reuters/businessNews', category: 'Agronegocio & Commodities', language: 'en', priority: 2 },
  { name: 'Bloomberg Ag', url: 'https://feeds.bloomberg.com/markets/news.rss', category: 'Agronegocio & Commodities', language: 'en', priority: 2 },

  // FOREX & FINANCAS (P1)
  { name: 'Investing BR', url: 'https://br.investing.com/rss/news.rss', category: 'Forex & Financas', language: 'pt', priority: 1 },
  { name: 'Infomoney', url: 'https://www.infomoney.com.br/feed/', category: 'Forex & Financas', language: 'pt', priority: 1 },
  { name: 'Valor Economico', url: 'https://valor.globo.com/rss/home.xml', category: 'Forex & Financas', language: 'pt', priority: 1 },
  { name: 'Reuters Finance', url: 'https://feeds.reuters.com/reuters/businessNews', category: 'Forex & Financas', language: 'en', priority: 2 },
  { name: 'FX Street', url: 'https://www.fxstreet.com/rss/news', category: 'Forex & Financas', language: 'en', priority: 2 },

  // IMOBILIARIO & CONSTRUCAO SC (P2)
  { name: 'Estadao Imoveis', url: 'https://imoveis.estadao.com.br/feed/', category: 'Imobiliario & Construcao', language: 'pt', priority: 2 },
  { name: 'Sinduscon SC', url: 'https://sinduscon-fpolis.org.br/feed/', category: 'Imobiliario & Construcao', language: 'pt', priority: 2 },

  // LIBERDADE & CENSURA (P2)
  { name: 'Gazeta do Povo', url: 'https://www.gazetadopovo.com.br/feed/', category: 'Liberdade & Censura', language: 'pt', priority: 1 },
  { name: 'Veja', url: 'https://veja.abril.com.br/feed/', category: 'Liberdade & Censura', language: 'pt', priority: 2 },

  // INTELIGENCIA ARTIFICIAL (P1)
  { name: 'MIT Tech Review', url: 'https://www.technologyreview.com/feed/', category: 'Inteligencia Artificial', language: 'en', priority: 1 },
  { name: 'The Verge AI', url: 'https://www.theverge.com/ai-artificial-intelligence/rss/index.xml', category: 'Inteligencia Artificial', language: 'en', priority: 1 },
  { name: 'VentureBeat AI', url: 'https://venturebeat.com/category/ai/feed/', category: 'Inteligencia Artificial', language: 'en', priority: 1 },
  { name: 'Tecmundo IA', url: 'https://www.tecmundo.com.br/rss', category: 'Inteligencia Artificial', language: 'pt', priority: 2 },

  // BRASIL GERAL (P2)
  { name: 'Agencia Brasil', url: 'https://agenciabrasil.ebc.com.br/rss/ultimasnoticias/feed.xml', category: 'Brasil', language: 'pt', priority: 1 },
  { name: 'R7 Noticias', url: 'https://noticias.r7.com/feed.xml', category: 'Brasil', language: 'pt', priority: 2 },

  // MUNDO (P2)
  { name: 'Al Jazeera EN', url: 'https://www.aljazeera.com/xml/rss/all.xml', category: 'Mundo', language: 'en', priority: 2 },
  { name: 'DW Brasil', url: 'https://rss.dw.com/xml/rss-br-all', category: 'Mundo', language: 'pt', priority: 2 },
  { name: 'AFP Brasil', url: 'https://g1.globo.com/rss/g1/mundo/', category: 'Mundo', language: 'pt', priority: 2 },

  // TECNOLOGIA (P2)
  { name: 'TechCrunch', url: 'https://techcrunch.com/feed/', category: 'Tecnologia', language: 'en', priority: 2 },
  { name: 'Olhar Digital', url: 'https://olhardigital.com.br/feed/', category: 'Tecnologia', language: 'pt', priority: 2 },

  // CIENCIA & SAUDE (P3)
  { name: 'Science Daily', url: 'https://www.sciencedaily.com/rss/all.xml', category: 'Ciencia', language: 'en', priority: 3 },
  { name: 'Saude Estadao', url: 'https://saude.estadao.com.br/feed/', category: 'Saude', language: 'pt', priority: 3 },
];

// Helper: retorna feeds por prioridade
export const getFeedsByPriority = (maxPriority: 1 | 2 | 3 = 2): FeedSource[] =>
  RSS_FEEDS.filter(f => f.priority <= maxPriority);

// Helper: retorna feeds por categoria
export const getFeedsByCategory = (category: string): FeedSource[] =>
  RSS_FEEDS.filter(f => f.category === category);

// Limite de artigos por ciclo de atualizacao (respeita rate limit Gemini)
export const MAX_ARTICLES_PER_CYCLE = 50;
export const GEMINI_DELAY_MS = 4200; // 4.2s = max 14 req/min (margem segura de 15/min)
