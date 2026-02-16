import type { Station, Evidence } from '../../types';
import type { ParsedPage } from '../parser';
import { PHONE_REGEX, EMAIL_REGEX, ADDRESS_REGEX, HOURS_REGEX } from '../../constants/patterns';

let counter = 0;
function makeStation(label: string, value: string, evidence: Evidence[]): Station {
  return { id: `contacts-${++counter}`, lineId: 'contacts', label, value, confidence: 0, evidence };
}

export function extractContacts(page: ParsedPage): Station[] {
  counter = 0;
  const stations: Station[] = [];
  const seen = new Set<string>();

  function add(label: string, value: string, source: string, selector: string, raw: string) {
    const key = `${label}:${value}`;
    if (seen.has(key) || !value.trim()) return;
    seen.add(key);
    stations.push(makeStation(label, value.trim(), [{ source, selector, raw }]));
  }

  // JSON-LD contacts
  for (const ld of page.jsonLd) {
    if (typeof ld.telephone === 'string') add('Phone', ld.telephone, 'JSON-LD', 'telephone', ld.telephone);
    if (typeof ld.email === 'string') add('Email', ld.email, 'JSON-LD', 'email', ld.email);
    const addr = ld.address as Record<string, unknown> | undefined;
    if (addr && typeof addr.streetAddress === 'string') {
      const parts = [addr.streetAddress, addr.addressLocality, addr.addressRegion, addr.postalCode].filter(Boolean);
      add('Address', parts.join(', '), 'JSON-LD', 'address', JSON.stringify(addr).slice(0, 200));
    }
    const hours = ld.openingHoursSpecification;
    if (Array.isArray(hours) && hours.length > 0) {
      const formatted = hours.slice(0, 3).map((h: Record<string, unknown>) =>
        `${h.dayOfWeek}: ${h.opens}-${h.closes}`
      ).join('; ');
      add('Hours', formatted, 'JSON-LD', 'openingHoursSpecification', JSON.stringify(hours).slice(0, 200));
    }
  }

  // tel: links
  page.doc.querySelectorAll('a[href^="tel:"]').forEach((a) => {
    const phone = a.getAttribute('href')!.replace('tel:', '').trim();
    if (phone) add('Phone', phone, 'HTML', 'a[href^="tel:"]', a.outerHTML.slice(0, 150));
  });

  // mailto: links
  page.doc.querySelectorAll('a[href^="mailto:"]').forEach((a) => {
    const email = a.getAttribute('href')!.replace('mailto:', '').split('?')[0].trim();
    if (email) add('Email', email, 'HTML', 'a[href^="mailto:"]', a.outerHTML.slice(0, 150));
  });

  // Regex fallbacks on body text
  const phones = page.bodyText.match(PHONE_REGEX);
  if (phones) {
    for (const p of [...new Set(phones)].slice(0, 3)) {
      add('Phone', p, 'Regex', 'body text', p);
    }
  }

  const emails = page.bodyText.match(EMAIL_REGEX);
  if (emails) {
    for (const e of [...new Set(emails)].slice(0, 3)) {
      if (!e.includes('example.com') && !e.includes('sentry'))
        add('Email', e, 'Regex', 'body text', e);
    }
  }

  const addresses = page.bodyText.match(ADDRESS_REGEX);
  if (addresses) {
    for (const a of [...new Set(addresses)].slice(0, 2)) {
      add('Address', a, 'Regex', 'body text', a);
    }
  }

  const hours = page.bodyText.match(HOURS_REGEX);
  if (hours) {
    add('Hours', [...new Set(hours)].slice(0, 4).join('; '), 'Regex', 'body text', hours.join(' '));
  }

  return stations;
}
