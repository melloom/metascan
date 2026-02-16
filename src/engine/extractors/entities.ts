import type { Station, Evidence } from '../../types';
import type { ParsedPage } from '../parser';

let counter = 0;
function makeStation(label: string, value: string, evidence: Evidence[]): Station {
  return { id: `entities-${++counter}`, lineId: 'entities', label, value, confidence: 0, evidence };
}

export function extractEntities(page: ParsedPage): Station[] {
  counter = 0;
  const stations: Station[] = [];
  const seen = new Set<string>();

  function add(label: string, value: string, source: string, selector: string, raw: string) {
    const key = value.toLowerCase();
    if (seen.has(key) || !value.trim()) return;
    seen.add(key);
    stations.push(makeStation(label, value.trim(), [{ source, selector, raw }]));
  }

  // JSON-LD entities
  for (const ld of page.jsonLd) {
    if (typeof ld.brand === 'object' && ld.brand !== null) {
      const brand = ld.brand as Record<string, unknown>;
      if (typeof brand.name === 'string') add('Brand', brand.name, 'JSON-LD', 'brand.name', brand.name);
    }
    if (typeof ld.brand === 'string') add('Brand', ld.brand, 'JSON-LD', 'brand', ld.brand);
    if (typeof ld.author === 'object' && ld.author !== null) {
      const author = ld.author as Record<string, unknown>;
      if (typeof author.name === 'string') add('Person', author.name, 'JSON-LD', 'author.name', author.name);
    }
    if (typeof ld.author === 'string') add('Person', ld.author, 'JSON-LD', 'author', ld.author);
    if (typeof ld.founder === 'object' && ld.founder !== null) {
      const founder = ld.founder as Record<string, unknown>;
      if (typeof founder.name === 'string') add('Person', founder.name, 'JSON-LD', 'founder.name', founder.name);
    }
    if (typeof ld.employee === 'object' && Array.isArray(ld.employee)) {
      for (const emp of ld.employee.slice(0, 5)) {
        if (typeof emp === 'object' && emp !== null && typeof emp.name === 'string') {
          add('Person', emp.name, 'JSON-LD', 'employee.name', emp.name);
        }
      }
    }
    if (typeof ld['@type'] === 'string' && ld['@type'] === 'Product' && typeof ld.name === 'string') {
      add('Product', ld.name, 'JSON-LD', 'Product.name', ld.name);
    }
  }

  // Schema.org itemtype Person
  page.doc.querySelectorAll('[itemtype*="Person"]').forEach((el) => {
    const name = el.querySelector('[itemprop="name"]')?.textContent?.trim();
    if (name) add('Person', name, 'Schema.org', '[itemtype="Person"]', name);
  });

  // Common partner/client logos with alt text
  page.doc.querySelectorAll('img[alt]').forEach((img) => {
    const alt = img.getAttribute('alt')?.trim() ?? '';
    const src = img.getAttribute('src') ?? '';
    if (alt.length > 2 && alt.length < 40 && (src.includes('logo') || src.includes('partner') || src.includes('client') || src.includes('brand'))) {
      add('Partner', alt, 'HTML', `img[alt="${alt}"]`, alt);
    }
  });

  return stations;
}
