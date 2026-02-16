import type { ScanResult, Line, Station, Transfer } from '../types';
import { createEmptyLine } from '../constants/lines';
import { fetchPage, discoverSitemapUrls, probeApis, probeResources } from './fetcher';
import { parsePage } from './parser';
import type { ParsedPage } from './parser';

type ProgressCallback = (status: string, progress: number) => void;

interface ScanOptions {
  maxPages?: number;
  maxDepth?: number;
  requestBudget?: number;
  devMode?: boolean;
  maxContentLengthBytes?: number;
  concurrency?: number;
}

type BaseLineId = 'identity' | 'language' | 'contacts' | 'services' | 'products' | 'pages' | 'tech' | 'social' | 'branding' | 'schema';

interface SchemaObject {
  '@type'?: string | string[];
  title?: string;
  headline?: string;
  name?: string;
  jobTitle?: string;
  description?: string;
  url?: string;
  [key: string]: unknown;
}

function makeEvidence(source: string, selector: string, raw: string) {
  return { source, selector, raw };
}

function addStation(
  bucket: Station[],
  lineId: BaseLineId,
  label: string,
  value: string,
  confidence: number,
  evidence: ReturnType<typeof makeEvidence>[]
) {
  if (!value) return;
  const key = `${lineId}:${label}:${value}`.toLowerCase();
  const existing = bucket.find((s) => `${s.lineId}:${s.label}:${s.value}`.toLowerCase() === key);
  if (existing) {
    existing.confidence = Math.min(1, existing.confidence + confidence * 0.2);
    existing.evidence.push(...evidence);
    return;
  }
  bucket.push({
    id: key,
    lineId,
    label,
    value,
    confidence,
    evidence,
  });
}

function scoreSource(source: string) {
  if (/ld\+json|schema|json-ld/i.test(source)) return 0.9;
  if (/meta|og|twitter/i.test(source)) return 0.7;
  if (/link|nav|footer/i.test(source)) return 0.55;
  if (/body|text/i.test(source)) return 0.45;
  return 0.4;
}

function stationsFromPage(page: ParsedPage): Station[] {
  const stations: Station[] = [];
  const add = (
    lineId: BaseLineId,
    label: string,
    value: string,
    source: string,
    selector: string,
    confidence: number = 0.8 // Default confidence for scraped data
  ) => addStation(stations, lineId, label, value, scoreSource(source) * confidence, [makeEvidence(source, selector, value)]);

  // Helper function to extract clean titles from URLs and content
  function extractCleanTitle(url: string, pageTitle?: string, microdata?: { name?: string; title?: string }): string {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      const hostname = urlObj.hostname;
      
      // Try to get title from microdata first
      if (microdata && microdata.name) {
        return microdata.name;
      }
      
      // Try to get title from page title
      if (pageTitle && pageTitle !== url) {
        // Clean up the page title
        const cleanTitle = pageTitle
          .replace(/\s*[-|]\s*.+$/, '') // Remove " - Site Name" suffix
          .replace(/\s*\|.+\s*$/, '') // Remove "| Site Name" suffix
          .trim();
        if (cleanTitle && cleanTitle.length > 0 && cleanTitle.length < 100) {
          return cleanTitle;
        }
      }
      
      // Handle CDN and library URLs
      if (hostname.includes('cdn.jsdelivr.net') || hostname.includes('unpkg.com') || hostname.includes('cdnjs.cloudflare.com')) {
        return extractLibraryTitle(pathname);
      }
      
      // Handle GitHub and other code hosting
      if (hostname.includes('github.com') || hostname.includes('gitlab.com') || hostname.includes('bitbucket.org')) {
        return extractCodeHostingTitle(pathname, hostname);
      }
      
      // Handle common script and resource patterns
      if (pathname.includes('.js') || pathname.includes('.css') || pathname.includes('.min')) {
        return extractResourceTitle(pathname);
      }
      
      // Extract title from URL path
      const pathSegments = pathname.split('/').filter(segment => segment.length > 0);
      const lastSegment = pathSegments[pathSegments.length - 1];
      
      if (lastSegment) {
        // Convert URL segment to readable title
        let title = lastSegment
          .replace(/[_-]/g, ' ') // Replace underscores and dashes with spaces
          .replace(/\.(php|html|htm|aspx|jsp|js|css|json|xml|txt)$/i, '') // Remove file extensions
          .replace(/([A-Z])/g, ' $1') // Add space before capital letters
          .replace(/\.(min|prod|dev|test|latest)$/i, '') // Remove min/prod/dev/test/latest suffixes
          .trim();
        
        // Capitalize words properly
        title = title.split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
          .join(' ');
        
        // Remove common suffixes
        title = title.replace(/\s+(Page|Index|Main)$/i, '');
        
        if (title.length > 0 && title.length < 80) {
          return title;
        }
      }
      
      // Fallback to hostname
      return hostname.replace(/^www\./, '');
    } catch {
      return url;
    }
  }

  // Extract titles from CDN URLs (jsdelivr, unpkg, cdnjs)
  function extractLibraryTitle(pathname: string): string {
    // Remove query parameters first
    const cleanPathname = pathname.split('?')[0];
    
    // Pattern: /npm/package@version/dist/file.js
    const npmMatch = cleanPathname.match(/\/npm\/([^@]+)@([^/]+)\/(.+)/);
    if (npmMatch) {
      const [, packageName, , filePath] = npmMatch;
      const fileName = filePath.split('/').pop()?.replace(/\.(js|css|min)$/i, '') || '';
      return `${packageName} ${fileName ? `(${fileName})` : ''}`;
    }
    
    // Pattern: /package@version/file.js
    const simpleMatch = cleanPathname.match(/\/([^@]+)@([^/]+)\/(.+)/);
    if (simpleMatch) {
      const [, packageName, , filePath] = simpleMatch;
      const fileName = filePath.split('/').pop()?.replace(/\.(js|css|min)$/i, '') || '';
      return `${packageName} ${fileName ? `(${fileName})` : ''}`;
    }
    
    // Pattern: /package/file.js
    const noVersionMatch = cleanPathname.match(/\/([^/]+)\/(.+)/);
    if (noVersionMatch) {
      const [, packageName, filePath] = noVersionMatch;
      const fileName = filePath.split('/').pop()?.replace(/\.(js|css|min)$/i, '') || '';
      return `${packageName} ${fileName ? `(${fileName})` : ''}`;
    }
    
    // Handle media directories and other common patterns
    if (cleanPathname.includes('/media/') || cleanPathname.includes('/js/') || cleanPathname.includes('/css/')) {
      const pathParts = cleanPathname.split('/');
      const fileName = pathParts[pathParts.length - 1];
      const cleanFileName = fileName?.replace(/\.(js|css|min)$/i, '') || fileName;
      
      // Handle common library names in media directories
      const libraryNames: Record<string, string> = {
        'jquery': 'jQuery',
        'jquery-migrate': 'jQuery Migrate',
        'bootstrap': 'Bootstrap',
        'bootstrap5': 'Bootstrap 5',
        'popper': 'Popper.js',
        'fontawesome': 'Font Awesome',
        'slick': 'Slick Carousel',
        'owl': 'Owl Carousel',
        'moment': 'Moment.js',
        'lodash': 'Lodash',
        'axios': 'Axios',
        'swiper': 'Swiper',
        'gsap': 'GSAP',
        'three': 'Three.js',
        'chart': 'Chart.js',
        'leaflet': 'Leaflet',
        'mapbox': 'Mapbox',
        'd3': 'D3.js',
        'select2': 'Select2',
        'datatables': 'DataTables',
        'ckeditor': 'CKEditor',
        'tinymce': 'TinyMCE',
      };
      
      const lowerFileName = cleanFileName.toLowerCase();
      for (const [key, value] of Object.entries(libraryNames)) {
        if (lowerFileName.includes(key)) {
          return value;
        }
      }
      
      return cleanFileName || fileName;
    }
    
    return cleanPathname.split('/').pop()?.replace(/\.(js|css|min)$/i, '') || cleanPathname;
  }

  // Extract titles from code hosting (GitHub, GitLab, Bitbucket)
  function extractCodeHostingTitle(pathname: string, hostname: string): string {
    // GitHub: /user/repo/blob/branch/path
    if (hostname.includes('github.com')) {
      const match = pathname.match(/\/([^/]+)\/([^/]+)\/blob\/([^/]+)\/(.+)/);
      if (match) {
        const [, user, repo, , filePath] = match;
        const fileName = filePath.split('/').pop()?.replace(/\.(js|css|md|txt)$/i, '') || filePath;
        return `${user}/${repo} ${fileName ? `(${fileName})` : ''}`;
      }
    }
    
    // GitLab: /user/repo/-/blob/branch/path
    if (hostname.includes('gitlab.com')) {
      const match = pathname.match(/\/([^/]+)\/([^/]+)\/-\/blob\/([^/]+)\/(.+)/);
      if (match) {
        const [, user, repo, , filePath] = match;
        const fileName = filePath.split('/').pop()?.replace(/\.(js|css|md|txt)$/i, '') || filePath;
        return `${user}/${repo} ${fileName ? `(${fileName})` : ''}`;
      }
    }
    
    return pathname.split('/').slice(-2).join('/');
  }

  // Extract titles from common resources
  function extractResourceTitle(pathname: string): string {
    const fileName = pathname.split('/').pop() || pathname;
    
    // Remove common extensions and suffixes
    let title = fileName
      .replace(/\.(js|css|json|xml|html|htm|php|aspx|jsp|ts|tsx|jsx|vue|svelte)$/i, '')
      .replace(/\.min\./g, '.') // Remove .min. 
      .replace(/\.prod\./g, '.') // Remove .prod.
      .replace(/\.dev\./g, '.') // Remove .dev.
      .replace(/\.test\./g, '.') // Remove .test.
      .replace(/\.latest\./g, '.'); // Remove .latest.
    
    // Convert kebab-case to title case
    title = title
      .replace(/[-_]/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());
    
    // Handle common library names
    const libraryNames: Record<string, string> = {
      'bootstrap': 'Bootstrap',
      'jquery': 'jQuery',
      'react': 'React',
      'vue': 'Vue.js',
      'angular': 'Angular',
      'lodash': 'Lodash',
      'moment': 'Moment.js',
      'axios': 'Axios',
      'webpack': 'Webpack',
      'babel': 'Babel',
      'eslint': 'ESLint',
      'prettier': 'Prettier',
      'typescript': 'TypeScript',
      'tailwind': 'Tailwind CSS',
      'bsky': 'Bluesky',
      'bsky-embed': 'Bluesky Embed',
      'bsky-embed.es': 'Bluesky Embed ES Module',
    };
    
    const lowerTitle = title.toLowerCase();
    for (const [key, value] of Object.entries(libraryNames)) {
      if (lowerTitle.includes(key)) {
        return value;
      }
    }
    
    return title || fileName;
  }

  // Identity / branding - high confidence for structured data
  if (page.title) add('identity', 'Title', page.title, 'meta-title', 'title', 0.95);
  const ogTitle = page.openGraph['og:title'] || page.twitter['twitter:title'];
  if (ogTitle) add('identity', 'OG Title', ogTitle, 'opengraph', 'meta[property="og:title"]', 0.9);
  const desc = page.metaTags.get('description') || page.openGraph['og:description'] || page.twitter['twitter:description'];
  if (desc) add('identity', 'Description', desc, 'meta-description', 'meta[name="description"]', 0.85);
  
  // Language - separate from branding
  if (page.lang) add('language', 'Language', page.lang, 'html-lang', 'html[lang]', 0.95);
  
  // Branding - colors, logos, CSS variables
  page.assets.logos.forEach((logo, i) => add('branding', 'Logo', logo, 'asset-logo', `img.logo#${i}`, 0.8));
  Object.entries(page.styles.cssVars).forEach(([k, v]) => add('branding', k, v, 'css-var', k, 0.7));
  page.styles.colors.slice(0, 10).forEach((c, i) => add('branding', `Color ${i + 1}`, c, 'css-color', 'style', 0.6));

  // Contacts / social - high confidence for structured data
  page.contacts.emails.slice(0, 3).forEach((e, i) => add('contacts', 'Email', e, 'body-email', `email#${i}`, 0.85));
  page.contacts.phones.slice(0, 2).forEach((p, i) => add('contacts', 'Phone', p, 'body-phone', `phone#${i}`, 0.9));
  page.contacts.addresses.slice(0, 2).forEach((a, i) => add('contacts', 'Address', a, 'body-address', `addr#${i}`, 0.85));
  page.contacts.hours.slice(0, 2).forEach((h, i) => add('contacts', 'Hours', h, 'body-hours', `hours#${i}`, 0.8));
  
  // Social links - medium confidence
  page.contacts.socials.slice(0, 8).forEach((s, i) => {
    const platform = s.match(/(facebook|twitter|instagram|linkedin|youtube|tiktok|pinterest|reddit|github|discord|slack|telegram|whatsapp)/i)?.[1] || 'Social';
    const uniqueLabel = `${platform.charAt(0).toUpperCase() + platform.slice(1)} ${i + 1}`;
    add('social', uniqueLabel, s, 'social-link', `social#${i}`, 0.75);
  });
  
  page.contacts.maps.slice(0, 1).forEach((m, i) => add('contacts', 'Map', m, 'map-link', `map#${i}`, 0.8));

  // Services / products / pages - medium confidence with better titles
  page.pricingBlocks.slice(0, 6).forEach((block, i) => {
    const val = [block.title, block.price].filter(Boolean).join(' | ');
    add('services', 'Pricing', val, 'pricing-block', `pricing#${i}`, 0.8);
    block.features.slice(0, 4).forEach((f, fi) => add('services', 'Feature', f, 'pricing-feature', `pricing#${i}-f#${fi}`, 0.7));
  });
  if (page.heroText) add('pages', 'Hero', page.heroText, 'hero', 'h1', 0.9);
  page.ctas.slice(0, 8).forEach((c, i) => add('pages', 'CTA', c, 'cta', `cta#${i}`, 0.75));
  page.faqItems.slice(0, 10).forEach((faq, i) => add('pages', 'FAQ', `${faq.question} :: ${faq.answer}`, 'faq', `faq#${i}`, 0.8));
  page.testimonials.slice(0, 5).forEach((t, i) => add('pages', 'Testimonial', `${t.quote} ${t.author ?? ''}`.trim(), 'testimonial', `test#${i}`, 0.7));
  
  // Links - lower confidence, prioritize important ones with better titles
  const importantLinks = page.links.slice(0, 50);
  importantLinks.forEach((l, i) => {
    const cleanTitle = extractCleanTitle(l.href, l.text);
    const displayValue = l.text && l.text !== l.href ? `${cleanTitle} -> ${l.href}` : cleanTitle;
    console.log(`Link ${i}: extracted title "${cleanTitle}" from URL "${l.href}"`);
    add('pages', 'Link', displayValue, 'link', `a#${i}`, 0.6);
  });
  
  page.navLinks.slice(0, 15).forEach((l, i) => {
    const cleanTitle = extractCleanTitle(l.href, l.text);
    const displayValue = l.text && l.text !== l.href ? `${cleanTitle} -> ${l.href}` : cleanTitle;
    add('pages', 'Nav', displayValue, 'nav', `nav#${i}`, 0.75);
  });
  page.footerLinks.slice(0, 10).forEach((l, i) => {
    const cleanTitle = extractCleanTitle(l.href, l.text);
    const displayValue = l.text && l.text !== l.href ? `${cleanTitle} -> ${l.href}` : cleanTitle;
    add('pages', 'Footer', displayValue, 'footer', `footer#${i}`, 0.7);
  });

  // Tech / performance - medium confidence
  page.scripts.slice(0, 10).forEach((s, i) => {
    const cleanTitle = extractCleanTitle(s, s);
    console.log(`Script ${i}: extracted title "${cleanTitle}" from URL "${s}"`);
    add('tech', cleanTitle, s, 'script', `script#${i}`, 0.7);
  });
  page.stylesheets.slice(0, 5).forEach((s, i) => add('tech', 'Stylesheet', s, 'stylesheet', `style#${i}`, 0.75));
  page.perf.preloads.slice(0, 5).forEach((p, i) => add('tech', 'Preload', p, 'preload', `preload#${i}`, 0.6));
  page.perf.criticalCss.slice(0, 3).forEach((c, i) => add('tech', 'Critical CSS', c, 'critical-css', `css#${i}`, 0.7));
  page.perf.lazyImages.slice(0, 5).forEach((l, i) => add('tech', 'Lazy Image', l, 'lazy-image', `lazy#${i}`, 0.6));

  // Schema / app state - high confidence for structured data
  page.jsonLd.slice(0, 5).forEach((j, i) => {
    const schemaType = (j as SchemaObject)['@type'];
    const title = (j as SchemaObject).title || (j as SchemaObject).headline || (j as SchemaObject).name || `${schemaType} ${i + 1}`;
    const content = JSON.stringify(j).slice(0, 200);
    
    // Enhanced confidence for structured data
    let confidence = 0.9;
    if (schemaType && typeof schemaType === 'string') {
      // Higher confidence for well-known schema types
      if (schemaType.includes('schema.org')) {
        confidence = 0.95;
      }
    }
    
    // Create more detailed station content
    let detailedContent = content;
    if (schemaType === 'http://schema.org/Person' || schemaType === 'Person') {
      const person = j as SchemaObject;
      const personDetails = [
        person.name && `Name: ${person.name}`,
        person.jobTitle && `Title: ${person.jobTitle}`,
        person.description && `Description: ${person.description}`,
        person.url && `URL: ${person.url}`,
        person.email && `Email: ${person.email}`,
        person.telephone && `Phone: ${person.telephone}`,
        person.address && `Address: ${person.address}`,
        person.sameAs && `Profiles: ${person.sameAs}`
      ].filter(Boolean).join(' | ');
      
      if (personDetails) {
        detailedContent = personDetails.slice(0, 200);
        confidence = 0.95; // Very high confidence for detailed Person schema
      }
    }
    
    add('schema', title, detailedContent, 'json-ld', `ld#${i}`, confidence);
  });
  
  page.microdata.slice(0, 3).forEach((m, i) => {
    const schemaType = (m as SchemaObject)['@type'];
    const title = (m as SchemaObject).title || (m as SchemaObject).name || `Microdata ${i + 1}`;
    const content = JSON.stringify(m).slice(0, 200);
    
    // Enhanced confidence for microdata
    let confidence = 0.85;
    if (schemaType && typeof schemaType === 'string') {
      if (schemaType.includes('schema.org')) {
        confidence = 0.9;
      }
    }
    
    // Create more detailed station content for microdata
    let detailedContent = content;
    if (schemaType === 'http://schema.org/Person' || schemaType === 'Person') {
      const person = m as SchemaObject;
      const personDetails = [
        person.name && `Name: ${person.name}`,
        person.jobTitle && `Title: ${person.jobTitle}`,
        person.description && `Description: ${person.description}`,
        person.url && `URL: ${person.url}`,
        person.email && `Email: ${person.email}`,
        person.telephone && `Phone: ${person.telephone}`,
        person.address && `Address: ${person.address}`,
        person.sameAs && `Profiles: ${person.sameAs}`
      ].filter(Boolean).join(' | ');
      
      if (personDetails) {
        detailedContent = personDetails.slice(0, 200);
        confidence = 0.9; // High confidence for detailed Person microdata
      }
    }
    
    add('schema', title, detailedContent, 'microdata', `md#${i}`, confidence);
  });
  
  page.rdfa.slice(0, 3).forEach((r, i) => add('schema', `RDFa ${r.property}`, r.content, 'rdfa', `rdfa#${i}`, 0.85));
  page.embeddedJson.slice(0, 3).forEach((j, i) => {
    const title = (j as SchemaObject).title || (j as SchemaObject).name || `Embedded JSON ${i + 1}`;
    const content = JSON.stringify(j).slice(0, 200);
    add('schema', title, content, 'application/json', `json#${i}`, 0.8);
  });
  Object.entries(page.appState).slice(0, 5).forEach(([k, v], i) => add('schema', `AppState ${k}`, JSON.stringify(v).slice(0, 200), 'app-state', `state#${i}`, 0.8));

  // Limit stations per line to prevent overcrowding and "circles" effect
  const maxStationsPerLine = 25;
  const stationsByLine = new Map<string, Station[]>();
  
  stations.forEach(station => {
    const lineStations = stationsByLine.get(station.lineId) || [];
    if (lineStations.length < maxStationsPerLine) {
      lineStations.push(station);
      stationsByLine.set(station.lineId, lineStations);
    }
  });

  return Array.from(stationsByLine.values()).flat();
}

function mergeStations(stations: Station[]): Station[] {
  const merged = new Map<string, Station>();
  for (const s of stations) {
    const key = `${s.lineId}:${s.label}:${s.value}`.toLowerCase();
    const existing = merged.get(key);
    if (!existing) {
      merged.set(key, { ...s, evidence: [...s.evidence] });
      continue;
    }
    existing.evidence.push(...s.evidence);
    const baseBoost = 0.1;
    const schemaBoost = s.evidence.some((e) => /json-ld|schema|rdfa|microdata|app-state/i.test(e.source)) ? 0.1 : 0;
    existing.confidence = Math.min(1, Math.max(existing.confidence, s.confidence) + baseBoost + schemaBoost);
  }
  return Array.from(merged.values());
}

// Smart page prioritization function
function prioritizePages(urls: string[], baseUrl: string, maxPages: number): string[] {
  const baseUrlObj = new URL(baseUrl);
  const hostname = baseUrlObj.hostname;
  
  // Priority scoring system
  const scored = urls.map(url => {
    try {
      const urlObj = new URL(url);
      
      // Must be same domain
      if (urlObj.hostname !== hostname) return { url, score: -1 };
      
      let score = 0;
      const path = urlObj.pathname.toLowerCase();
      
      // High priority pages
      if (path === '/' || path === '/index.html' || path === '/home') score += 100;
      else if (path.includes('/about') || path.includes('/contact')) score += 90;
      else if (path.includes('/services') || path.includes('/products')) score += 80;
      else if (path.includes('/pricing') || path.includes('/team')) score += 70;
      else if (path.includes('/blog') || path.includes('/news')) score += 60;
      else if (path.includes('/faq') || path.includes('/help')) score += 50;
      else if (path.includes('/api') || path.includes('/docs')) score += 40;
      
      // Prefer shorter URLs (higher level pages)
      score -= path.length * 0.1;
      
      // Penalize common unwanted patterns
      if (/\.(pdf|doc|jpg|png|css|js)$/i.test(path)) score -= 50;
      if (path.includes('/admin') || path.includes('/login')) score -= 40;
      if (path.includes('/cart') || path.includes('/checkout')) score -= 30;
      if (path.includes('/search') || path.includes('/feed')) score -= 20;
      
      return { url, score };
    } catch {
      return { url, score: -1 };
    }
  });
  
  // Filter out invalid URLs and sort by score
  return scored
    .filter(item => item.score >= 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxPages)
    .map(item => item.url);
}

export async function runScan(url: string, onProgress?: ProgressCallback, options: ScanOptions = {}): Promise<ScanResult> {
  // Normalize URL
  if (!url.startsWith('http')) url = 'https://' + url;
  const { maxPages = 12, maxDepth = 2, requestBudget = 4_000_000, devMode = false, maxContentLengthBytes = 1_200_000, concurrency = 3 } = options;

  console.log('Starting scan for URL:', url);

  // Discover URLs with smart filtering
  onProgress?.('Discovering pages...', 0.05);
  const simpleProgress = onProgress ? ((msg: string) => {
    console.log('Progress:', msg);
    onProgress(msg, 0);
  }) : undefined;
  
  let candidates: string[] = [];
  try {
    candidates = (await discoverSitemapUrls(url, { respectRobots: !devMode, devMode, requestBudget, onProgress: simpleProgress }))
      .slice(0, maxPages * maxDepth);
    console.log('Discovered candidates:', candidates.length);
    
    // Smart prioritization for the right amount of pages
    if (candidates.length > maxPages) {
      const prioritized = prioritizePages(candidates, url, maxPages);
      candidates = prioritized;
      console.log(`Prioritized to ${candidates.length} pages for scanning`);
    }
  } catch (err) {
    console.error('Error discovering sitemap URLs:', err);
    throw err;
  }

  const pages: ParsedPage[] = [];
  let budgetRemaining = requestBudget;

  for (let start = 0; start < candidates.length && pages.length < maxPages; start += concurrency) {
    const batch = candidates.slice(start, start + concurrency);
    onProgress?.(`Fetching pages ${start + 1}-${Math.min(start + batch.length, candidates.length)}/${candidates.length}`, 0.1 + (start / candidates.length) * 0.2);
    const results = await Promise.allSettled(
      batch.map(async (target: string) => {
        if (budgetRemaining <= 0) throw new Error('Request budget exceeded');
        const html = await fetchPage(target, { requestBudget: budgetRemaining, respectRobots: !devMode, devMode, onProgress: simpleProgress, maxContentLengthBytes });
        if (budgetRemaining - html.length < 0) throw new Error('Request budget exceeded');
        budgetRemaining -= html.length;
        return parsePage(html, target);
      })
    );
    for (const r of results) {
      if (r.status === 'fulfilled') {
        pages.push(r.value);
      }
      if (pages.length >= maxPages) break;
    }
  }

  // API/resource probes on base URL
  onProgress?.('Probing APIs/resources...', 0.32);
  const apiResults = await probeApis(url, { requestBudget: budgetRemaining, respectRobots: !devMode, devMode, onProgress: simpleProgress });
  const resourceResults = await probeResources(url, { requestBudget: budgetRemaining, respectRobots: !devMode, devMode, onProgress: simpleProgress });

  // Normalize all pages into stations
  onProgress?.('Normalizing data...', 0.6);
  const allStations = mergeStations(pages.flatMap(stationsFromPage));

  // Add API probe results into tech/schema lines
  apiResults.forEach((res, i) => addStation(allStations as Station[], 'tech', 'API', res.url, 0.6, [makeEvidence('api-probe', `api#${i}`, res.bodySnippet || '')]));
  resourceResults.forEach((res, i) => addStation(allStations as Station[], 'tech', 'Resource', res.url, 0.55, [makeEvidence('resource-probe', `res#${i}`, res.bodySnippet || '')]));

  const baseLines: Array<{ id: BaseLineId; name: string }> = [
    { id: 'identity', name: 'Identity' },
    { id: 'language', name: 'Language' },
    { id: 'contacts', name: 'Contacts' },
    { id: 'services', name: 'Services' },
    { id: 'products', name: 'Products' },
    { id: 'pages', name: 'Pages' },
    { id: 'tech', name: 'Tech' },
    { id: 'social', name: 'Social' },
    { id: 'branding', name: 'Branding' },
    { id: 'schema', name: 'Schema' },
  ];

  const lines: Line[] = baseLines.map((def) => {
    // Use the proper color system instead of placeholder colors
    const line = createEmptyLine({ 
      id: def.id, 
      name: def.name, 
      colorDark: '#FF6B6B', // Will be overridden by getLineColor
      colorLight: '#E74C3C'   // Will be overridden by getLineColor
    });
    line.stations = allStations.filter((s) => s.lineId === def.id);
    return line;
  }).filter((l) => l.stations.length > 0);

  // Debug: Check total lines created
  console.log(`Created ${lines.length} lines total`);

  onProgress?.('Detecting connections...', 0.8);
  
  // Transfers will be detected in the layout system based on actual line intersections
  const transfers: Transfer[] = [];

  onProgress?.('Done!', 1.0);

  return {
    url,
    timestamp: Date.now(),
    lines,
    transfers,
    title: pages[0]?.title || url,
    favicon: pages[0]?.metaTags.get('og:image') || undefined,
  };
}
