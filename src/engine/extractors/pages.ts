import type { Station, Evidence } from '../../types';
import type { ParsedPage } from '../parser';
import { PAGE_CATEGORIES } from '../../constants/patterns';

let counter = 0;
function makeStation(label: string, value: string, evidence: Evidence[]): Station {
  return { id: `pages-${++counter}`, lineId: 'pages', label, value, confidence: 0, evidence };
}

function classifyUrl(pathname: string): string {
  const clean = pathname.toLowerCase().replace(/^\/|\/$/g, '').split('/')[0];
  for (const [cat, patterns] of Object.entries(PAGE_CATEGORIES)) {
    if (patterns.some((p) => clean === p || clean.includes(p))) return cat;
  }
  return 'Page';
}

export function extractPages(page: ParsedPage): Station[] {
  counter = 0;
  const stations: Station[] = [];
  const seen = new Set<string>();

  for (const link of page.links) {
    let href = link.href;
    if (href.startsWith('/')) href = page.baseUrl + href;

    let parsed: URL;
    try {
      parsed = new URL(href, page.url);
    } catch {
      continue;
    }

    // Only same-domain links
    if (parsed.origin !== page.baseUrl) continue;

    const pathname = parsed.pathname;
    if (pathname === '/' || pathname === '') continue;
    if (seen.has(pathname)) continue;
    if (/\.(jpg|jpeg|png|gif|svg|pdf|css|js|ico|woff|woff2|ttf|eot)$/i.test(pathname)) continue;

    seen.add(pathname);
    const category = classifyUrl(pathname);
    const displayName = link.text.trim().slice(0, 50) || pathname;

    stations.push(makeStation(category, displayName, [{
      source: 'HTML',
      selector: `a[href="${link.href}"]`,
      raw: pathname,
    }]));

    if (stations.length >= 15) break;
  }

  return stations;
}
