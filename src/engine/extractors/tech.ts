import type { Station, Evidence } from '../../types';
import type { ParsedPage } from '../parser';
import { TECH_SIGNATURES } from '../../constants/patterns';

let counter = 0;
function makeStation(label: string, value: string, evidence: Evidence[]): Station {
  return { id: `tech-${++counter}`, lineId: 'tech', label, value, confidence: 0, evidence };
}

export function extractTech(page: ParsedPage): Station[] {
  counter = 0;
  const stations: Station[] = [];
  const seen = new Set<string>();

  function add(label: string, value: string, source: string, selector: string, raw: string) {
    if (seen.has(value) || !value.trim()) return;
    seen.add(value);
    stations.push(makeStation(label, value, [{ source, selector, raw }]));
  }

  // Meta generator
  const generator = page.metaTags.get('generator');
  if (generator) add('CMS', generator, 'Meta', 'meta[name="generator"]', generator);

  // Combine all source strings to scan
  const allSources = [
    ...page.scripts,
    ...page.stylesheets,
    page.bodyText.slice(0, 5000),
  ].join(' ').toLowerCase();

  // Check tech signatures
  for (const [tech, signatures] of Object.entries(TECH_SIGNATURES)) {
    for (const sig of signatures) {
      if (allSources.includes(sig.toLowerCase())) {
        const label = tech.includes('Analytics') || tech.includes('Pixel') || tech.includes('Tag Manager') || tech.includes('Hotjar')
          ? 'Analytics'
          : tech.includes('Stripe')
          ? 'Payment'
          : tech.includes('Intercom') || tech.includes('HubSpot') || tech.includes('Mailchimp')
          ? 'Marketing'
          : tech.includes('Cloudflare')
          ? 'CDN'
          : 'Framework';
        add(label, tech, 'Script analysis', `signature: ${sig}`, sig);
        break;
      }
    }
  }

  // Check for viewport meta (responsive)
  if (page.metaTags.has('viewport')) {
    add('Design', 'Responsive Design', 'Meta', 'meta[name="viewport"]', page.metaTags.get('viewport')!);
  }

  // Check for manifest (PWA)
  const hasManifest = page.doc.querySelector('link[rel="manifest"]');
  if (hasManifest) add('Feature', 'PWA Manifest', 'HTML', 'link[rel="manifest"]', 'manifest.json');

  return stations;
}
