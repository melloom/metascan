export interface ParsedPage {
  doc: Document;
  url: string;
  baseUrl: string;
  title: string;
  metaTags: Map<string, string>;
  jsonLd: Record<string, unknown>[];
  bodyText: string;
  links: Array<{ href: string; text: string }>;
  scripts: string[];
  stylesheets: string[];
}

export function parsePage(html: string, url: string): ParsedPage {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const baseUrl = new URL(url).origin;

  const title = doc.querySelector('title')?.textContent?.trim() ?? '';

  const metaTags = new Map<string, string>();
  doc.querySelectorAll('meta').forEach((m) => {
    const name = m.getAttribute('name') || m.getAttribute('property') || '';
    const content = m.getAttribute('content') || '';
    if (name && content) metaTags.set(name.toLowerCase(), content);
  });

  const jsonLd: Record<string, unknown>[] = [];
  doc.querySelectorAll('script[type="application/ld+json"]').forEach((s) => {
    try {
      const data = JSON.parse(s.textContent ?? '');
      if (Array.isArray(data)) jsonLd.push(...data);
      else jsonLd.push(data);
    } catch { /* skip malformed JSON-LD */ }
  });

  const bodyText = doc.body?.textContent?.replace(/\s+/g, ' ').trim() ?? '';

  const links: Array<{ href: string; text: string }> = [];
  doc.querySelectorAll('a[href]').forEach((a) => {
    const href = a.getAttribute('href') ?? '';
    const text = a.textContent?.trim() ?? '';
    if (href && !href.startsWith('#') && !href.startsWith('javascript:')) {
      links.push({ href, text });
    }
  });

  const scripts: string[] = [];
  doc.querySelectorAll('script[src]').forEach((s) => {
    scripts.push(s.getAttribute('src') ?? '');
  });

  const stylesheets: string[] = [];
  doc.querySelectorAll('link[rel="stylesheet"]').forEach((l) => {
    stylesheets.push(l.getAttribute('href') ?? '');
  });

  return { doc, url, baseUrl, title, metaTags, jsonLd, bodyText, links, scripts, stylesheets };
}
