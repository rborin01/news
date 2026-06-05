import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SITE_URL = 'https://news.rodrigoborin.com'

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
      },
    })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const { data, error } = await supabase
    .from('processed_news')
    .select('id, title, processed_at')
    .gt('processed_at', new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString())
    .order('processed_at', { ascending: false })
    .limit(200)

  if (error) {
    return new Response('Internal Server Error', { status: 500 })
  }

  const urls = (data ?? []).map((row) => `
  <url>
    <loc>${SITE_URL}/noticia/${row.id}</loc>
    <news:news>
      <news:publication>
        <news:name>True Press</news:name>
        <news:language>pt</news:language>
      </news:publication>
      <news:publication_date>${new Date(row.processed_at).toISOString()}</news:publication_date>
      <news:title>${escapeXml(row.title)}</news:title>
    </news:news>
  </url>`).join('')

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">${urls}
</urlset>`

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=3600',
      'Access-Control-Allow-Origin': '*',
    },
  })
})
