import { writeFileSync } from 'fs';

const API_URL = process.env.VITE_API_URL || 'http://localhost:3001/api';
const SITE_URL = process.env.SITE_URL || 'https://patrimonio-europeo.netlify.app';

const staticRoutes = [
  { path: '/', priority: '1.0', changefreq: 'weekly' },
  { path: '/buscar', priority: '0.9', changefreq: 'daily' },
  { path: '/mapa', priority: '0.8', changefreq: 'weekly' },
  { path: '/contacto', priority: '0.3', changefreq: 'monthly' },
  { path: '/proponer', priority: '0.4', changefreq: 'monthly' },
];

function urlEntry(loc, changefreq, priority) {
  return `  <url>\n    <loc>${loc}</loc>\n    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`;
}

async function generateSitemap() {
  const urls = staticRoutes.map(r =>
    urlEntry(`${SITE_URL}${r.path}`, r.changefreq, r.priority)
  );

  // Fetch monument IDs from API (API caps max limit at 100 per page)
  // Uses delay + exponential backoff to avoid triggering backend rate limiter (429)
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  const fetchWithRetry = async (url, maxRetries = 5) => {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      const res = await fetch(url);
      if (res.ok) return res;
      if (res.status === 429) {
        const wait = Math.min(30000, 2000 * Math.pow(2, attempt));
        console.log(`  ⏸ Rate limited (429), waiting ${wait / 1000}s...`);
        await sleep(wait);
        continue;
      }
      throw new Error(`API returned ${res.status}`);
    }
    throw new Error('Max retries reached (rate limited)');
  };

  try {
    const limit = 100;
    const delayMs = 200;  // 200ms delay between requests = ~5 req/sec (safe under rate limit)
    let page = 1;
    let totalPages = 1;

    do {
      const res = await fetchWithRetry(`${API_URL}/monumentos?page=${page}&limit=${limit}`);
      const data = await res.json();
      totalPages = data.total_pages || 1;

      if (data.items && data.items.length > 0) {
        for (const m of data.items) {
          urls.push(urlEntry(`${SITE_URL}/monumento/${m.id}`, 'monthly', '0.6'));
        }
      }
      if (page % 100 === 0) console.log(`  page ${page}/${totalPages} (${urls.length} URLs)...`);
      page++;
      if (page <= totalPages) await sleep(delayMs);
    } while (page <= totalPages);
  } catch (err) {
    console.warn(`⚠ Error fetching monuments: ${err.message}`);
    console.warn(`  Generated ${urls.length} URLs so far (keeping partial sitemap).`);
  }

  // Split into multiple sitemap files if needed (Google limit: 50k URLs per sitemap)
  const MAX_URLS_PER_SITEMAP = 40000;
  const now = new Date().toISOString().split('T')[0];

  if (urls.length <= MAX_URLS_PER_SITEMAP) {
    // Single sitemap (small enough)
    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>`;
    writeFileSync('dist/sitemap.xml', sitemap);
    console.log(`✓ Sitemap generated: ${urls.length} URLs`);
  } else {
    // Split into chunks + generate sitemap-index
    const chunks = [];
    for (let i = 0; i < urls.length; i += MAX_URLS_PER_SITEMAP) {
      chunks.push(urls.slice(i, i + MAX_URLS_PER_SITEMAP));
    }

    // Write each chunk as sitemap-1.xml, sitemap-2.xml, etc.
    chunks.forEach((chunk, idx) => {
      const chunkXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${chunk.join('\n')}
</urlset>`;
      writeFileSync(`dist/sitemap-${idx + 1}.xml`, chunkXml);
    });

    // Write sitemap-index.xml as the main sitemap
    const indexEntries = chunks.map((_, idx) =>
      `  <sitemap>\n    <loc>${SITE_URL}/sitemap-${idx + 1}.xml</loc>\n    <lastmod>${now}</lastmod>\n  </sitemap>`
    );
    const indexXml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${indexEntries.join('\n')}
</sitemapindex>`;
    writeFileSync('dist/sitemap.xml', indexXml);

    console.log(`✓ Sitemap index generated: ${chunks.length} sitemap files, ${urls.length} total URLs`);
    chunks.forEach((chunk, idx) => {
      console.log(`  └ dist/sitemap-${idx + 1}.xml: ${chunk.length} URLs`);
    });
  }
}

generateSitemap();
