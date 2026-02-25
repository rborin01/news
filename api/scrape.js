
export default async function handler(request, response) {
  // Configuração CORS Permissiva
  response.setHeader('Access-Control-Allow-Credentials', true);
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  response.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (request.method === 'OPTIONS') {
    response.status(200).end();
    return;
  }

  const { q } = request.query;

  if (!q) {
    return response.status(400).json({ error: 'Query parameter "q" is required' });
  }

  try {
    const encodedQuery = encodeURIComponent(q);
    const url = `https://news.google.com/rss/search?q=${encodedQuery}&hl=pt-BR&gl=BR&ceid=BR:pt-419`;

    // HEADERS DE CAMUFLAGEM (User-Agent Rotativo Simples)
    const userAgents = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    ];
    const randomUA = userAgents[Math.floor(Math.random() * userAgents.length)];

    const res = await fetch(url, {
        headers: {
            'User-Agent': randomUA,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
            'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
            'Referer': 'https://news.google.com/',
            'Cache-Control': 'no-cache'
        }
    });

    if (!res.ok) {
        throw new Error(`Google RSS blocked: ${res.status}`);
    }

    const xmlText = await res.text();

    const items = [];
    // Regex simplificado para extração rápida de XML sem parser pesado
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match;

    const extractTag = (xml, tag) => {
      const regex = new RegExp(`<${tag}.*?>(.*?)</${tag}>`, 's');
      const m = xml.match(regex);
      return m ? m[1].replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1').trim() : '';
    };

    while ((match = itemRegex.exec(xmlText)) !== null) {
      const itemBlock = match[1];
      const title = extractTag(itemBlock, 'title');
      const link = extractTag(itemBlock, 'link');
      const pubDate = extractTag(itemBlock, 'pubDate');
      const source = extractTag(itemBlock, 'source');
      const description = extractTag(itemBlock, 'description')
          .replace(/<[^>]*>?/gm, '') // Remove HTML tags
          .substring(0, 300); // Limita tamanho

      // ID baseada em hash simples do conteúdo para evitar duplicatas
      const id = Buffer.from(title + pubDate).toString('base64').substring(0, 20);

      if (title && items.length < 20) {
        items.push({
          id,
          title,
          link,
          pubDate,
          source: source || 'Google News',
          snippet: description + '...'
        });
      }
    }

    return response.status(200).json(items);

  } catch (error) {
    console.error("Scrape Error:", error);
    return response.status(500).json({ error: 'Failed to scrape data', details: error.message });
  }
}
