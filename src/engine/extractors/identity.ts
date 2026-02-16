import type { Station, Evidence } from '../../types';
import type { ParsedPage } from '../parser';

let counter = 0;
function makeStation(label: string, value: string, evidence: Evidence[]): Station {
  return { id: `identity-${++counter}`, lineId: 'identity', label, value, confidence: 0, evidence };
}

export function extractIdentity(page: ParsedPage): Station[] {
  counter = 0;
  const stations: Station[] = [];
  const seen = new Set<string>();

  function add(label: string, value: string, source: string, selector: string, raw: string) {
    const key = `${label}:${value}`;
    if (seen.has(key) || !value.trim()) return;
    seen.add(key);
    stations.push(makeStation(label, value.trim(), [{ source, selector, raw }]));
  }

  // JSON-LD
  for (const ld of page.jsonLd) {
    if (typeof ld.name === 'string') add('Business Name', ld.name, 'JSON-LD', 'name', JSON.stringify(ld).slice(0, 200));
    if (typeof ld.description === 'string') add('Description', ld.description.slice(0, 120), 'JSON-LD', 'description', ld.description);
    if (typeof ld['@type'] === 'string') add('Business Type', ld['@type'], 'JSON-LD', '@type', String(ld['@type']));
    const addr = ld.address as Record<string, unknown> | undefined;
    if (addr && typeof addr.addressLocality === 'string') {
      const loc = [addr.addressLocality, addr.addressRegion].filter(Boolean).join(', ');
      add('Location', loc, 'JSON-LD', 'address', JSON.stringify(addr).slice(0, 200));
    }
  }

  // OG / Meta
  const ogSiteName = page.metaTags.get('og:site_name');
  if (ogSiteName) add('Business Name', ogSiteName, 'Meta', 'og:site_name', ogSiteName);

  const ogDesc = page.metaTags.get('og:description') || page.metaTags.get('description');
  if (ogDesc) add('Description', ogDesc.slice(0, 120), 'Meta', 'description', ogDesc);

  // Title fallback
  if (page.title && stations.every(s => s.label !== 'Business Name')) {
    const cleaned = page.title.split(/[|–—-]/).map(s => s.trim())[0];
    if (cleaned) add('Business Name', cleaned, 'HTML', 'title', page.title);
  }

  // H1 fallback
  const h1 = page.doc.querySelector('h1')?.textContent?.trim();
  if (h1 && stations.every(s => s.label !== 'Business Name')) {
    add('Business Name', h1, 'HTML', 'h1', h1);
  }

  // Category from meta keywords
  const keywords = page.metaTags.get('keywords');
  if (keywords) {
    add('Category', keywords.split(',').slice(0, 3).map(k => k.trim()).join(', '), 'Meta', 'keywords', keywords);
  }

  return stations;
}
