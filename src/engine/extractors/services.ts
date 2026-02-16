import type { Station, Evidence } from '../../types';
import type { ParsedPage } from '../parser';

let counter = 0;
function makeStation(label: string, value: string, evidence: Evidence[]): Station {
  return { id: `services-${++counter}`, lineId: 'services', label, value, confidence: 0, evidence };
}

export function extractServices(page: ParsedPage): Station[] {
  counter = 0;
  const stations: Station[] = [];
  const seen = new Set<string>();

  function add(label: string, value: string, source: string, selector: string, raw: string) {
    const key = value.toLowerCase();
    if (seen.has(key) || !value.trim()) return;
    seen.add(key);
    stations.push(makeStation(label, value.trim(), [{ source, selector, raw }]));
  }

  // JSON-LD offers / hasOfferCatalog
  for (const ld of page.jsonLd) {
    if (ld.hasOfferCatalog && typeof ld.hasOfferCatalog === 'object') {
      const cat = ld.hasOfferCatalog as Record<string, unknown>;
      const items = cat.itemListElement as Array<Record<string, unknown>> | undefined;
      if (Array.isArray(items)) {
        for (const item of items.slice(0, 8)) {
          const name = typeof item.name === 'string' ? item.name : (item.itemOffered as Record<string, unknown>)?.name;
          if (typeof name === 'string') add('Service', name, 'JSON-LD', 'hasOfferCatalog', name);
        }
      }
    }
    if (typeof ld.makesOffer === 'string') add('Service', ld.makesOffer, 'JSON-LD', 'makesOffer', ld.makesOffer);
  }

  // Lists near "services" headings
  const serviceHeadings = ['service', 'what we do', 'our services', 'offerings', 'solutions', 'we offer', 'specialties'];
  page.doc.querySelectorAll('h1, h2, h3, h4').forEach((heading) => {
    const text = heading.textContent?.toLowerCase() ?? '';
    if (serviceHeadings.some((s) => text.includes(s))) {
      let el = heading.nextElementSibling;
      let depth = 0;
      while (el && depth < 3) {
        if (el.tagName === 'UL' || el.tagName === 'OL') {
          el.querySelectorAll('li').forEach((li) => {
            const val = li.textContent?.trim().slice(0, 80);
            if (val && val.length > 2) add('Service', val, 'HTML', `${heading.tagName} > list > li`, val);
          });
          break;
        }
        el = el.nextElementSibling;
        depth++;
      }
    }
  });

  // Meta keywords as services fallback
  const keywords = page.metaTags.get('keywords');
  if (keywords && stations.length < 3) {
    keywords.split(',').slice(0, 5).forEach((k) => {
      const val = k.trim();
      if (val.length > 2) add('Keyword', val, 'Meta', 'keywords', keywords);
    });
  }

  return stations;
}
