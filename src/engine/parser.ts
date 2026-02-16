export interface ParsedPage {
  doc: Document;
  url: string;
  baseUrl: string;
  title: string;
  metaTags: Map<string, string>;
  openGraph: Record<string, string>;
  twitter: Record<string, string>;
  canonical?: string;
  lang?: string;
  charset?: string;
  jsonLd: Record<string, unknown>[];
  microdata: Array<Record<string, unknown>>;
  rdfa: Array<{ property: string; content: string }>;
  embeddedJson: Array<Record<string, unknown>>;
}

interface SchemaObject {
  '@type'?: string | string[];
  title?: string;
  headline?: string;
  name?: string;
  jobTitle?: string;
  role?: string;
  description?: string;
  url?: string;
  email?: string;
  telephone?: string;
  address?: string | Record<string, unknown>;
  sameAs?: string | string[];
  [key: string]: unknown;
}

export interface ParsedPage {
  doc: Document;
  url: string;
  baseUrl: string;
  title: string;
  metaTags: Map<string, string>;
  openGraph: Record<string, string>;
  twitter: Record<string, string>;
  canonical?: string;
  lang?: string;
  charset?: string;
  jsonLd: Record<string, unknown>[];
  microdata: Array<Record<string, unknown>>;
  rdfa: Array<{ property: string; content: string }>;
  embeddedJson: Array<Record<string, unknown>>;
  appState: Record<string, unknown>;
  bodyText: string;
  links: Array<{ href: string; text: string }>;
  navLinks: Array<{ href: string; text: string }>;
  footerLinks: Array<{ href: string; text: string }>;
  breadcrumbs: Array<{ href: string; text: string }>;
  contacts: { emails: string[]; phones: string[]; addresses: string[]; hours: string[]; socials: string[]; maps: string[] };
  heroText?: string;
  faqItems: Array<{ question: string; answer: string }>;
  pricingBlocks: Array<{ title: string; price?: string; features: string[] }>;
  testimonials: Array<{ quote: string; author?: string }>;
  ctas: string[];
  assets: { logos: string[]; icons: string[]; images: Array<{ src: string; alt: string }> };
  styles: { colors: string[]; fonts: string[]; cssVars: Record<string, string> };
  perf: { preloads: string[]; criticalCss: string[]; lazyImages: string[] };
  scripts: string[];
  stylesheets: string[];
}

function extractEmbeddedJson(doc: Document) {
  const blocks: Array<Record<string, unknown>> = [];
  doc.querySelectorAll('script[type="application/json"]').forEach((s) => {
    try {
      const data = JSON.parse(s.textContent || '');
      if (Array.isArray(data)) {
        data.forEach((d) => typeof d === 'object' && d !== null && blocks.push(d as Record<string, unknown>));
      } else if (typeof data === 'object' && data !== null) {
        blocks.push(data as Record<string, unknown>);
      }
    } catch {
      /* ignore malformed */
    }
  });
  return blocks;
}

function extractAppState(doc: Document) {
  // Try common frameworks: Next.js __NEXT_DATA__, Remix, Astro, Shopify storefront, WP embedded data
  const state: Record<string, unknown> = {};

  const nextData = doc.querySelector('#__NEXT_DATA__');
  if (nextData?.textContent) {
    try {
      state.next = JSON.parse(nextData.textContent);
    } catch { /* ignore */ }
  }

  const remixData = doc.querySelector('script[data-remix-entry]');
  if (remixData?.textContent) {
    try { state.remix = JSON.parse(remixData.textContent); } catch { /* ignore */ }
  }

  const astroData = doc.querySelector('script[type="application/astro"]');
  if (astroData?.textContent) {
    try { state.astro = JSON.parse(astroData.textContent); } catch { /* ignore */ }
  }

  const shopifyData = doc.querySelector('script[data-shopify-api-key], script[data-storefront-api-key]');
  if (shopifyData?.textContent) {
    try { state.shopify = JSON.parse(shopifyData.textContent); } catch { /* ignore */ }
  }

  const wpData = doc.querySelector('script[id^="__wordpress__"]');
  if (wpData?.textContent) {
    try { state.wordpress = JSON.parse(wpData.textContent); } catch { /* ignore */ }
  }

  return state;
}

function extractOpenGraph(doc: Document) {
  const og: Record<string, string> = {};
  doc.querySelectorAll('meta[property^="og:"]').forEach((m) => {
    const name = m.getAttribute('property');
    const content = m.getAttribute('content') || '';
    if (name && content) og[name.toLowerCase()] = content;
  });
  return og;
}

function extractTwitter(doc: Document) {
  const tw: Record<string, string> = {};
  doc.querySelectorAll('meta[name^="twitter:"]').forEach((m) => {
    const name = m.getAttribute('name');
    const content = m.getAttribute('content') || '';
    if (name && content) tw[name.toLowerCase()] = content;
  });
  return tw;
}

function extractMicrodata(doc: Document) {
  const items: Array<Record<string, unknown>> = [];
  doc.querySelectorAll('[itemscope]').forEach((el) => {
    const item: Record<string, unknown> = {};
    const type = el.getAttribute('itemtype');
    if (type) item['@type'] = type;
    
    // Extract all itemprop attributes with better content handling
    el.querySelectorAll('[itemprop]').forEach((p) => {
      const key = p.getAttribute('itemprop') || '';
      if (!key) return;
      
      let value: string | unknown = p.getAttribute('content') || '';
      
      // If no content attribute, try to get text content
      if (!value) {
        const textContent = p.textContent?.trim() || '';
        // For structured content, try to parse it
        if (textContent && (textContent.includes('{') || textContent.includes('['))) {
          try {
            value = JSON.parse(textContent);
          } catch {
            value = textContent;
          }
        } else {
          value = textContent;
        }
      }
      
      // Clean up the value
      if (typeof value === 'string') {
        value = value.replace(/\s+/g, ' ').trim();
      }
      
      item[key] = value;
    });
    
    // Also extract from nested itemscope elements
    const nestedItems = el.querySelectorAll('[itemscope] [itemscope]');
    nestedItems.forEach((nestedEl) => {
      const nestedItem: Record<string, unknown> = {};
      const nestedType = nestedEl.getAttribute('itemtype');
      if (nestedType) nestedItem['@type'] = nestedType;
      
      nestedEl.querySelectorAll('[itemprop]').forEach((p) => {
        const key = p.getAttribute('itemprop') || '';
        if (!key) return;
        
        let value: string | unknown = p.getAttribute('content') || '';
        
        // If no content attribute, try to get text content
        if (!value) {
          const textContent = p.textContent?.trim() || '';
          // For structured content, try to parse it
          if (textContent && (textContent.includes('{') || textContent.includes('['))) {
            try {
              value = JSON.parse(textContent);
            } catch {
              value = textContent;
            }
          } else {
            value = textContent;
          }
        }
        
        // Clean up the value
        if (typeof value === 'string') {
          value = value.replace(/\s+/g, ' ').trim();
        }
        
        nestedItem[key] = value;
      });
      
      if (Object.keys(nestedItem).length > 1) {
        items.push(nestedItem);
      }
    });
    
    if (Object.keys(item).length > 1) items.push(item);
  });
  return items;
}

function extractRdfa(doc: Document) {
  const items: Array<{ property: string; content: string }> = [];
  doc.querySelectorAll('[property]').forEach((el) => {
    const property = el.getAttribute('property');
    const content = el.getAttribute('content') || el.textContent?.trim() || '';
    if (property && content) items.push({ property, content });
  });
  return items;
}

function extractContacts(doc: Document) {
  const text = doc.body?.textContent || '';

  const emailPatterns = [
    /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi,
    /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}\.[a-z]{2,}/gi,
    /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi
  ];

  const emails = new Set<string>();
  emailPatterns.forEach(pattern => {
    const matches = text.match(pattern) || [];
    matches.forEach(email => {
      const cleanEmail = email.trim().toLowerCase();
      if (cleanEmail.length > 6 && cleanEmail.includes('@') && cleanEmail.includes('.')) {
        emails.add(cleanEmail);
      }
    });
  });

  const phonePatterns = [
    // Very strict phone patterns - avoid false positives
    /\+?[1-9]\d{1,4}[-.\s]?\(?\d{1,4}\)?[-.\s]?\d{1,4}[-.\s]?\d{1,9}/g, // International with proper structure
    /\b\(\d{3}\)[-.\s]?\d{3}[-.\s]?\d{4}\b/g, // US: (123) 456-7890
    /\b\d{3}[-.\s]\d{3}[-.\s]\d{4}\b/g, // US: 123-456-7890 (must have separators)
    /\b\d{2,4}[-.\s]\d{2,4}[-.\s]\d{3,4}\b/g // European: 1234-567-890 (must have separators)
  ];

  const phones = new Set<string>();
  phonePatterns.forEach(pattern => {
    const matches = text.match(pattern) || [];
    matches.forEach(phone => {
      const cleanPhone = phone.trim().replace(/\s+/g, ' ');
      
      // Additional validation to filter out false positives
      if (isValidPhoneNumber(cleanPhone)) {
        phones.add(cleanPhone);
      }
    });
  });

  // Helper function to validate phone numbers
  function isValidPhoneNumber(phone: string): boolean {
    // Remove all non-digit characters except + for validation
    const digitsOnly = phone.replace(/[^\d+]/g, '');
    
    // Must have at least 7 digits and no more than 15 (international standard)
    if (digitsOnly.length < 7 || digitsOnly.length > 15) return false;
    
    // Filter out obvious false positives
    if (digitsOnly.length <= 6) return false; // Too short for any phone number
    if (digitsOnly.length === 4 && /^\d{4}$/.test(digitsOnly)) return false; // Years like 2025, 1999
    if (digitsOnly.length === 5 && /^\d{5}$/.test(digitsOnly)) return false; // ZIP codes
    if (digitsOnly.length === 6 && /^\d{6}$/.test(digitsOnly)) return false; // Random 6-digit numbers
    
    // Must contain at least some phone-like formatting
    const hasPhonePattern = 
      phone.includes('(') && phone.includes(')') || // Has parentheses
      phone.includes('-') && phone.split('-').length >= 2 || // Has at least 2 parts with dashes
      phone.includes('.') && phone.split('.').length >= 2 || // Has at least 2 parts with dots  
      phone.includes(' ') && phone.split(' ').filter(p => p.length > 0).length >= 2 || // Has at least 2 parts with spaces
      phone.startsWith('+'); // Has country code
    
    // Additional checks for common false positives
    if (phone.match(/^\d{4}$/)) return false; // Standalone years
    if (phone.match(/^\d{5}$/)) return false; // Standalone ZIP codes
    if (phone.match(/^\d{6}$/)) return false; // Standalone 6-digit numbers
    if (phone.match(/^(19|20)\d{2}$/)) return false; // Years from 1900s or 2000s
    if (phone.includes('2025') && phone.length <= 6) return false; // Year 2025 specifically
    
    return hasPhonePattern;
  }

  const addressPatterns = [
    /\d+\s+[^,\n]+,\s*[^,\n]+,\s*[A-Z]{2}\s*\d{5}/gi,
    /\d+\s+[^,\n]+,\s*[^,\n]+,\s*[A-Z]{2}\s*\d{5}-\d{4}/gi,
    /\d+\s+[^,\n]+,\s*[^,\n]+,\s*[A-Za-z]{2,}\s*\d{4,}/gi
  ];

  const addresses = new Set<string>();
  addressPatterns.forEach(pattern => {
    const matches = text.match(pattern) || [];
    matches.forEach(address => {
      const cleanAddress = address.trim();
      if (cleanAddress.length > 10) {
        addresses.add(cleanAddress);
      }
    });
  });

  const hoursPatterns = [
    /(mon|tue|wed|thu|fri|sat|sun)[^\n]{0,60}?\d{1,2}:\d{2}\s?(am|pm)?/gi,
    /\d{1,2}:\d{2}\s?(am|pm)?\s*-\s*\d{1,2}:\d{2}\s?(am|pm)?/gi,
    /(mon|tue|wed|thu|fri|sat|sun)(day)?[\s:]*\d{1,2}:\d{2}\s?(am|pm)?[\s-]*\d{1,2}:\d{2}\s?(am|pm)?/gi
  ];

  const hours = new Set<string>();
  hoursPatterns.forEach(pattern => {
    const matches = text.match(pattern) || [];
    matches.forEach(hour => {
      const cleanHour = hour.trim();
      if (cleanHour.length > 5) {
        hours.add(cleanHour);
      }
    });
  });

  const socials: string[] = [];
  const maps: string[] = [];
  const links = doc.querySelectorAll('a[href]');
  
  // Get the current website's domain for better social media detection
  const currentDomain = window.location?.hostname || '';
  const domainParts = currentDomain.split('.');
  const websiteName = domainParts[0]; // e.g., "themelvins" from "themelvins.net"
  
  links.forEach((link) => {
    const href = link.getAttribute('href');
    if (!href) return;
    
    // Check for social media links - focus on official accounts
    if (/(facebook|twitter|instagram|linkedin|youtube|tiktok|pinterest|reddit|github|discord|slack|telegram|whatsapp|x\.com)\.com/i.test(href) ||
        /(fb\.me|t\.co|lnkd\.in|youtu\.be|ig\.me)/i.test(href)) {
      
      // Clean up the URL - remove tracking parameters, keep full https://
      let cleanUrl = href.trim();
      cleanUrl = cleanUrl.split('?')[0].split('#')[0];
      
      // Ensure it has proper protocol
      if (cleanUrl.startsWith('//')) {
        cleanUrl = 'https:' + cleanUrl;
      } else if (cleanUrl.startsWith('/')) {
        // Skip relative URLs for social links
        return;
      } else if (!cleanUrl.startsWith('http')) {
        cleanUrl = 'https://' + cleanUrl;
      }
      
      // Check if this looks like the website's official social account
      const url = new URL(cleanUrl);
      const socialDomain = url.hostname.toLowerCase();
      const socialPath = url.pathname.toLowerCase();
      const linkText = (link.textContent || '').toLowerCase();
      
      // Priority indicators for official accounts
      const isOfficialAccount = 
        // URL contains the website name
        socialPath.includes(websiteName) ||
        // Link text contains website name
        linkText.includes(websiteName) ||
        // Link is in header/footer (likely official)
        link.closest('header') || 
        link.closest('footer') ||
        link.closest('.social') ||
        link.closest('.social-media') ||
        link.closest('.contact') ||
        // Link has appropriate attributes
        link.getAttribute('rel') === 'me' ||
        link.classList.contains('social') ||
        link.classList.contains('social-link') ||
        link.classList.contains('official');
      
      // Prioritize official accounts, but include others if we don't have many
      if (isOfficialAccount || socials.length < 3) {
        // Check for duplicates
        if (!socials.some(s => new URL(s).hostname === socialDomain && new URL(s).pathname === socialPath)) {
          socials.push(cleanUrl);
        }
      }
    }
    
    // Check for map links separately
    if (/goo\.gl\/maps|maps\.google\.com|geo:\/\//i.test(href)) {
      let cleanMapUrl = href.trim();
      
      // Ensure proper protocol for map URLs
      if (cleanMapUrl.startsWith('//')) {
        cleanMapUrl = 'https:' + cleanMapUrl;
      } else if (cleanMapUrl.startsWith('/')) {
        return; // Skip relative map URLs
      } else if (!cleanMapUrl.startsWith('http') && !cleanMapUrl.startsWith('geo:')) {
        cleanMapUrl = 'https://' + cleanMapUrl;
      }
      
      maps.push(cleanMapUrl);
    }
  });

  // Also look for social media in structured data (JSON-LD, meta tags)
  const structuredSocials: string[] = [];
  
  // Check meta tags for social media
  const metaSelectors = [
    'meta[property="og:site_name"]',
    'meta[name="twitter:site"]',
    'meta[property="fb:app_id"]',
    'link[rel="me"]'
  ];
  
  metaSelectors.forEach(selector => {
    const element = doc.querySelector(selector);
    if (element) {
      const content = element.getAttribute('content') || element.getAttribute('href');
      if (content && (content.includes('facebook.com') || content.includes('twitter.com') || content.includes('instagram.com'))) {
        if (!structuredSocials.includes(content)) {
          structuredSocials.push(content);
        }
      }
    }
  });
  
  // Add structured social media to the list
  structuredSocials.forEach(social => {
    if (!socials.some(s => s === social)) {
      socials.push(social);
    }
  });

  return { 
    emails: Array.from(emails), 
    phones: Array.from(phones), 
    addresses: Array.from(addresses), 
    hours: Array.from(hours), 
    socials, 
    maps 
  };
}

function extractNav(doc: Document) {
  const navLinks: Array<{ href: string; text: string }> = [];
  
  // More comprehensive navigation extraction
  const navSelectors = [
    'nav a[href]',
    '.nav a[href]', 
    '.navigation a[href]',
    '.menu a[href]',
    '.navbar a[href]',
    'header a[href]',
    '.header a[href]',
    '[role="navigation"] a[href]'
  ];
  
  navSelectors.forEach(selector => {
    doc.querySelectorAll(selector).forEach((a) => {
      const href = a.getAttribute('href') || '';
      const text = a.textContent?.trim() || '';
      if (href && text && !href.startsWith('tel:') && !href.startsWith('mailto:')) {
        // Avoid duplicates
        const exists = navLinks.some(link => link.href === href && link.text === text);
        if (!exists) {
          navLinks.push({ href, text });
        }
      }
    });
  });
  
  // Also extract from common menu structures
  doc.querySelectorAll('ul li a[href], ol li a[href]').forEach((a) => {
    const href = a.getAttribute('href') || '';
    const text = a.textContent?.trim() || '';
    const parent = a.closest('ul, ol');
    const isMenu = parent && (parent.classList.contains('menu') || 
                            parent.classList.contains('nav') ||
                            parent.parentElement?.classList.contains('menu') ||
                            parent.parentElement?.classList.contains('nav'));
    
    if (href && text && isMenu && !href.startsWith('tel:') && !href.startsWith('mailto:')) {
      const exists = navLinks.some(link => link.href === href && link.text === text);
      if (!exists) {
        navLinks.push({ href, text });
      }
    }
  });
  
  return navLinks;
}

function extractFooter(doc: Document) {
  const footerLinks: Array<{ href: string; text: string }> = [];
  doc.querySelectorAll('footer a[href]').forEach((a) => {
    const href = a.getAttribute('href') || '';
    const text = a.textContent?.trim() || '';
    if (href && text) footerLinks.push({ href, text });
  });
  return footerLinks;
}

function extractBreadcrumbs(doc: Document) {
  const crumbs: Array<{ href: string; text: string }> = [];
  doc.querySelectorAll('[itemtype*="Breadcrumb"] a[href]').forEach((a) => {
    const href = a.getAttribute('href') || '';
    const text = a.textContent?.trim() || '';
    if (href && text) crumbs.push({ href, text });
  });
  return crumbs;
}

function extractHero(doc: Document) {
  const hero = doc.querySelector('main h1') || doc.querySelector('header h1') || doc.querySelector('h1');
  return hero?.textContent?.trim();
}

function extractFaq(doc: Document) {
  const faqs: Array<{ question: string; answer: string }> = [];
  doc.querySelectorAll('[itemtype*="FAQPage"] [itemprop="mainEntity"]').forEach((faq) => {
    const q = faq.querySelector('[itemprop="name"]')?.textContent?.trim() || '';
    const a = faq.querySelector('[itemprop="acceptedAnswer"]')?.textContent?.trim() || '';
    if (q || a) faqs.push({ question: q, answer: a });
  });
  return faqs;
}

function extractPricing(doc: Document) {
  const blocks: Array<{ title: string; price?: string; features: string[] }> = [];
  doc.querySelectorAll('[class*="pricing"], [data-pricing]').forEach((el) => {
    const title = el.querySelector('h2, h3')?.textContent?.trim() || '';
    const price = el.textContent?.match(/[$€£]\s?\d[\d.,]*/)?.[0];
    const features: string[] = [];
    el.querySelectorAll('li').forEach((li) => {
      const txt = li.textContent?.trim();
      if (txt) features.push(txt);
    });
    if (title || price || features.length) blocks.push({ title, price, features });
  });
  return blocks;
}

function extractTestimonials(doc: Document) {
  const items: Array<{ quote: string; author?: string }> = [];
  doc.querySelectorAll('[class*="testimonial"], blockquote').forEach((el) => {
    const quote = el.textContent?.trim() || '';
    const author = el.querySelector('cite, .author, .name')?.textContent?.trim();
    if (quote) items.push({ quote, author });
  });
  return items;
}

function extractCtas(doc: Document) {
  const ctas: string[] = [];
  doc.querySelectorAll('a, button').forEach((el) => {
    const txt = el.textContent?.trim() || '';
    if (/get started|sign up|contact|buy|book|demo|start/i.test(txt)) ctas.push(txt);
  });
  return Array.from(new Set(ctas));
}

function extractAssets(doc: Document, baseUrl: string) {
  const logos: string[] = [];
  const icons: string[] = [];
  const images: Array<{ src: string; alt: string }> = [];
  doc.querySelectorAll('img').forEach((img) => {
    const src = img.getAttribute('src') || '';
    const alt = img.getAttribute('alt') || '';
    if (src) images.push({ src: new URL(src, baseUrl).toString(), alt });
    if (/logo/i.test(alt) || /logo/i.test(src)) logos.push(new URL(src, baseUrl).toString());
  });
  doc.querySelectorAll('link[rel*="icon"]').forEach((l) => {
    const href = l.getAttribute('href') || '';
    if (href) icons.push(new URL(href, baseUrl).toString());
  });
  return { logos: Array.from(new Set(logos)), icons: Array.from(new Set(icons)), images };
}

function extractStyles(doc: Document) {
  const styles = getComputedStyle(doc.documentElement);
  const colors: string[] = [];
  const fonts: string[] = [];
  const cssVars: Record<string, string> = {};
  const colorProps = ['--color-primary', '--primary', '--brand', '--accent'];
  colorProps.forEach((p) => {
    const v = styles.getPropertyValue(p).trim();
    if (v) colors.push(v);
  });
  const bodyFont = getComputedStyle(doc.body || doc.documentElement).getPropertyValue('font-family');
  if (bodyFont) fonts.push(bodyFont.trim());
  Array.from(styles).forEach((key) => {
    if (key.startsWith('--')) {
      cssVars[key] = styles.getPropertyValue(key).trim();
    }
  });
  return { colors: Array.from(new Set(colors)), fonts: Array.from(new Set(fonts)), cssVars };
}

function extractPerf(doc: Document, baseUrl: string) {
  const preloads: string[] = [];
  const criticalCss: string[] = [];
  const lazyImages: string[] = [];
  doc.querySelectorAll('link[rel="preload"]').forEach((l) => {
    const href = l.getAttribute('href') || '';
    if (href) preloads.push(new URL(href, baseUrl).toString());
  });
  doc.querySelectorAll('link[rel="stylesheet"]').forEach((l) => {
    const href = l.getAttribute('href') || '';
    const media = l.getAttribute('media') || '';
    if (href && (!media || media === 'all')) criticalCss.push(new URL(href, baseUrl).toString());
  });
  doc.querySelectorAll('img[loading="lazy"], img[data-src], img[data-lazy]').forEach((img) => {
    const src = img.getAttribute('src') || img.getAttribute('data-src') || '';
    if (src) lazyImages.push(new URL(src, baseUrl).toString());
  });
  return { preloads: Array.from(new Set(preloads)), criticalCss: Array.from(new Set(criticalCss)), lazyImages: Array.from(new Set(lazyImages)) };
}

export function parsePage(html: string, url: string): ParsedPage {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const baseUrl = new URL(url).origin;

  const title = doc.querySelector('title')?.textContent?.trim() ?? '';
  const canonical = doc.querySelector('link[rel="canonical"]')?.getAttribute('href') || undefined;
  const lang = doc.documentElement.getAttribute('lang') || undefined;
  const charset = doc.querySelector('meta[charset]')?.getAttribute('charset') || undefined;

  const metaTags = new Map<string, string>();
  doc.querySelectorAll('meta').forEach((m) => {
    const name = m.getAttribute('name') || m.getAttribute('property') || '';
    const content = m.getAttribute('content') || '';
    if (name && content) metaTags.set(name.toLowerCase(), content);
  });

  const openGraph = extractOpenGraph(doc);
  const twitter = extractTwitter(doc);

  const jsonLd: Record<string, unknown>[] = [];
  doc.querySelectorAll('script[type="application/ld+json"]').forEach((s) => {
    try {
      const data = JSON.parse(s.textContent ?? '');
      if (Array.isArray(data)) jsonLd.push(...data);
      else jsonLd.push(data);
    } catch { /* skip malformed JSON-LD */ }
  });
  
  // Enhanced JSON-LD processing for better structured data extraction
  const processedJsonLd: Record<string, unknown>[] = [];
  jsonLd.forEach(item => {
    if (item && typeof item === 'object') {
      // Handle BlogPosting and other content types
      if (item['@type'] === 'https://schema.org/BlogPosting' && item.blogPost) {
        // Extract the blog post content and clean it up
        const blogContent = item.blogPost;
        if (typeof blogContent === 'string') {
          // Clean up the blog content
          const cleanContent = blogContent
            .replace(/\s+/g, ' ')
            .replace(/\n\s+/g, '\n')
            .trim();
          
          processedJsonLd.push({
            ...item,
            blogPost: cleanContent,
            title: item.headline || item.name || 'Blog Post',
            content: cleanContent
          });
        } else {
          processedJsonLd.push(item);
        }
      } else if (item['@type'] === 'https://schema.org/Article' && item.articleBody) {
        // Handle Article schema
        const articleContent = item.articleBody;
        if (typeof articleContent === 'string') {
          const cleanContent = articleContent
            .replace(/\s+/g, ' ')
            .replace(/\n\s+/g, '\n')
            .trim();
          
          processedJsonLd.push({
            ...item,
            articleBody: cleanContent,
            title: item.headline || item.name || 'Article',
            content: cleanContent
          });
        } else {
          processedJsonLd.push(item);
        }
      } else if (item['@type'] === 'https://schema.org/Person') {
        // Handle Person schema - extract detailed information
        const person = item as SchemaObject;
        const personDetails: Record<string, unknown> = {
          ...item,
          title: person.name || 'Person',
          // Extract all available person details
          name: person.name,
          jobTitle: person.jobTitle || person.title || person.role,
          description: person.description,
          url: person.url,
          email: person.email,
          telephone: person.telephone || person.phone,
          address: person.address,
          sameAs: person.sameAs,
          worksFor: person.worksFor,
          knowsLanguage: person.knowsLanguage,
          birthDate: person.birthDate,
          gender: person.gender,
          nationality: person.nationality,
          alumniOf: person.alumniOf,
          hasCredential: person.hasCredential,
          award: person.award,
          memberOf: person.memberOf,
          affiliation: person.affiliation
        };
        
        // Create a detailed content string
        const details = [
          personDetails.name && `Name: ${personDetails.name}`,
          personDetails.jobTitle && `Title: ${personDetails.jobTitle}`,
          personDetails.description && `Description: ${personDetails.description}`,
          personDetails.url && `URL: ${personDetails.url}`,
          personDetails.email && `Email: ${personDetails.email}`,
          personDetails.telephone && `Phone: ${personDetails.telephone}`,
          personDetails.address && `Address: ${personDetails.address}`,
          personDetails.worksFor && `Works for: ${personDetails.worksFor}`,
          personDetails.alumniOf && `Alumni of: ${personDetails.alumniOf}`,
          personDetails.memberOf && `Member of: ${personDetails.memberOf}`
        ].filter(Boolean).join(' | ');
        
        if (details) {
          personDetails.content = details.slice(0, 500); // Longer content for detailed person info
        }
        
        processedJsonLd.push(personDetails);
      } else if (item['@type'] === 'https://schema.org/WebPage' && item.description) {
        // Handle WebPage schema
        const description = item.description;
        if (typeof description === 'string') {
          const cleanDescription = description
            .replace(/\s+/g, ' ')
            .replace(/\n\s+/g, '\n')
            .trim();
          
          processedJsonLd.push({
            ...item,
            description: cleanDescription,
            title: item.name || item.title || 'Web Page'
          });
        } else {
          processedJsonLd.push(item);
        }
      } else if (item['@type'] === 'https://schema.org/Organization') {
        // Handle Organization schema
        const org = item as SchemaObject;
        const orgDetails: Record<string, unknown> = {
          ...item,
          title: org.name || 'Organization',
          name: org.name,
          description: org.description,
          url: org.url,
          email: org.email,
          telephone: org.telephone || org.phone,
          address: org.address,
          sameAs: org.sameAs,
          foundingDate: org.foundingDate,
          areaServed: org.areaServed,
          member: org.member,
          employee: org.employee,
          knowsAbout: org.knowsAbout,
          hasCredential: org.hasCredential,
          award: org.award
        };
        
        // Create detailed content for organization
        const details = [
          orgDetails.name && `Name: ${orgDetails.name}`,
          orgDetails.description && `Description: ${orgDetails.description}`,
          orgDetails.url && `URL: ${orgDetails.url}`,
          orgDetails.email && `Email: ${orgDetails.email}`,
          orgDetails.telephone && `Phone: ${orgDetails.telephone}`,
          orgDetails.address && `Address: ${orgDetails.address}`,
          orgDetails.foundingDate && `Founded: ${orgDetails.foundingDate}`,
          orgDetails.areaServed && `Area Served: ${orgDetails.areaServed}`
        ].filter(Boolean).join(' | ');
        
        if (details) {
          orgDetails.content = details.slice(0, 500);
        }
        
        processedJsonLd.push(orgDetails);
      } else {
        processedJsonLd.push(item);
      }
    } else {
      processedJsonLd.push(item);
    }
  });

  const microdata = extractMicrodata(doc);
  const rdfa = extractRdfa(doc);
  const embeddedJson = extractEmbeddedJson(doc);
  const appState = extractAppState(doc);

  const bodyText = doc.body?.textContent?.replace(/\s+/g, ' ').trim() ?? '';

  const links: Array<{ href: string; text: string }> = [];
  doc.querySelectorAll('a[href]').forEach((a) => {
    const href = a.getAttribute('href') ?? '';
    const text = a.textContent?.trim() ?? '';
    
    // Better filtering for quality links
    if (href && 
        !href.startsWith('#') && 
        !href.startsWith('javascript:') && 
        !href.startsWith('mailto:') && 
        !href.startsWith('tel:') &&
        text.length >= 2 && 
        text.length <= 100 &&
        !text.match(/^(click|here|learn|more|read)$/i)) { // Filter generic text
      links.push({ href, text });
    }
  });
  
  // Remove duplicates and limit to most relevant
  const uniqueLinks = Array.from(new Map(links.map(link => [`${link.href}-${link.text}`, link])).values());
  const limitedLinks = uniqueLinks.slice(0, 100);

  const scripts: string[] = [];
  doc.querySelectorAll('script[src]').forEach((s) => {
    scripts.push(s.getAttribute('src') ?? '');
  });

  const stylesheets: string[] = [];
  doc.querySelectorAll('link[rel="stylesheet"]').forEach((l) => {
    stylesheets.push(l.getAttribute('href') ?? '');
  });

  const navLinks = extractNav(doc);
  const footerLinks = extractFooter(doc);
  const breadcrumbs = extractBreadcrumbs(doc);
  const contacts = extractContacts(doc);
  const heroText = extractHero(doc);
  const faqItems = extractFaq(doc);
  const pricingBlocks = extractPricing(doc);
  const testimonials = extractTestimonials(doc);
  const ctas = extractCtas(doc);
  const assets = extractAssets(doc, baseUrl);
  const styles = extractStyles(doc);
  const perf = extractPerf(doc, baseUrl);

  return {
    doc,
    url,
    baseUrl,
    title,
    metaTags,
    openGraph,
    twitter,
    canonical,
    lang,
    charset,
    jsonLd,
    microdata,
    rdfa,
    embeddedJson,
    appState,
    bodyText,
    links: limitedLinks,
    navLinks,
    footerLinks,
    breadcrumbs,
    contacts,
    heroText,
    faqItems,
    pricingBlocks,
    testimonials,
    ctas,
    assets,
    styles,
    perf,
    scripts,
    stylesheets,
  };
}
