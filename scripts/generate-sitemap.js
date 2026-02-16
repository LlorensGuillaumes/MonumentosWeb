import { writeFileSync } from 'fs';

const API_URL = process.env.VITE_API_URL || 'http://localhost:3001/api';
const SITE_URL = process.env.SITE_URL || 'https://patrimonio-europeo.com';

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

  // Fetch monument IDs from API
  try {
    let page = 1;
    const limit = 1000;
    let hasMore = true;

    while (hasMore) {
      const res = await fetch(`${API_URL}/monumentos?page=${page}&limit=${limit}`);
      if (!res.ok) throw new Error(`API returned ${res.status}`);
      const data = await res.json();

      if (data.items && data.items.length > 0) {
        for (const m of data.items) {
          urls.push(urlEntry(`${SITE_URL}/monumento/${m.id}`, 'monthly', '0.6'));
        }
        hasMore = data.items.length === limit;
        page++;
      } else {
        hasMore = false;
      }
    }
  } catch (err) {
    console.warn('⚠ Could not fetch monuments from API:', err.message);
    console.warn('  Generating sitemap with static routes only.');
  }

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>`;

  writeFileSync('dist/sitemap.xml', sitemap);
  console.log(`✓ Sitemap generated: ${urls.length} URLs`);
}

generateSitemap();
