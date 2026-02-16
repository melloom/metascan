const PROXIES = [
  (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  (url: string) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
  (url: string) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
];

const IS_BROWSER = typeof window !== 'undefined';

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 13_4) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:122.0) Gecko/20100101 Firefox/122.0',
];

export interface FetchOptions {
  timeoutMs?: number;
  retries?: number;
  backoffMs?: number;
  respectRobots?: boolean;
  devMode?: boolean;
  useProxies?: boolean;
  onProgress?: (msg: string) => void;
  maxContentLengthBytes?: number;
  requestBudget?: number; // total bytes allowed
}

// --- Sitemap + URL discovery -------------------------------------------------
const SITEMAP_CANDIDATES = ['sitemap.xml', '.sitemap.xml', 'sitemap_index.xml'];

export async function discoverSitemapUrls(baseUrl: string, options: FetchOptions = {}): Promise<string[]> {
  const { onProgress, ...fetchOpts } = options;
  const roots: string[] = [];
  
  onProgress?.('Looking for sitemap...');
  
  // Try sitemap candidates with smart timeout and retries
  const sitemapOpts = { ...fetchOpts, timeoutMs: 6000, retries: 2, backoffMs: 300 };
  
  // Check sitemap.xml first - most common
  for (const candidate of SITEMAP_CANDIDATES) {
    const sitemapUrl = new URL(candidate, baseUrl).toString();
    try {
      onProgress?.(`Checking ${candidate}...`);
      const xml = await fetchPage(sitemapUrl, sitemapOpts);
      
      if (!xml || xml.length < 100) {
        onProgress?.(`${candidate} not found or empty`);
        continue;
      }
      
      // Parse URLs from sitemap
      const urls: string[] = [];
      const locMatches = [...xml.matchAll(/<loc>([^<]+)<\/loc>/gi)];
      for (const m of locMatches) {
        if (m[1]) {
          const cleanUrl = m[1].trim();
          // Only include URLs from the same domain
          if (cleanUrl.includes(new URL(baseUrl).hostname)) {
            urls.push(cleanUrl);
          }
        }
      }
      
      if (urls.length) {
        // Smart filtering - get the most important pages
        const filteredUrls = filterImportantPages(urls, baseUrl);
        roots.push(...filteredUrls.slice(0, 50)); // Limit to 50 from sitemap
        onProgress?.(`Found ${urls.length} URLs in ${candidate}, filtered to ${filteredUrls.length}`);
        break; // Stop after finding first valid sitemap
      }
    } catch (err) {
      onProgress?.(`${candidate} failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
      continue; // ignore and continue to next candidate
    }
  }
  
  // If no sitemap found, use smart fallback pages
  if (!roots.length) {
    onProgress?.('No sitemap found, using smart page discovery...');
    const fallbackUrls = generateSmartFallbackPages(baseUrl);
    roots.push(...fallbackUrls);
  }
  
  return Array.from(new Set(roots)); // Remove duplicates
}

// Filter important pages from sitemap results
function filterImportantPages(urls: string[], baseUrl: string): string[] {
  const baseUrlObj = new URL(baseUrl);
  const hostname = baseUrlObj.hostname;
  
  // Priority patterns for important pages
  const priorityPatterns = [
    /^\/$/, // Homepage
    /\/(index|home|main)(\.[a-z]+)?\/?$/i, // Index/home pages
    /\/(about|about-us)(\.[a-z]+)?\/?$/i, // About pages
    /\/(contact|contact-us)(\.[a-z]+)?\/?$/i, // Contact pages
    /\/(services|service)(\.[a-z]+)?\/?$/i, // Services
    /\/(products|product)(\.[a-z]+)?\/?$/i, // Products
    /\/(pricing|price)(\.[a-z]+)?\/?$/i, // Pricing
    /\/(team|staff)(\.[a-z]+)?\/?$/i, // Team pages
    /\/(blog|news)(\.[a-z]+)?\/?$/i, // Blog/news
    /\/(faq|help)(\.[a-z]+)?\/?$/i, // FAQ/Help
    /\/(api|docs)(\.[a-z]+)?\/?$/i, // API/Docs
  ];
  
  // Filter out unwanted patterns
  const excludePatterns = [
    /\.(pdf|doc|docx|xls|xlsx|zip|tar|gz)$/i, // Files
    /\.(jpg|jpeg|png|gif|svg|webp)$/i, // Images
    /\.(css|js|json|xml)$/i, // Assets
    /\/(wp-admin|wp-login|admin|login)/i, // Admin pages
    /\/(cart|checkout|payment)/i, // E-commerce checkout
    /\/(search|s\?)/i, // Search pages
    /\/(feed|rss|atom)/i, // Feeds
    /\?utm_/i, // Tracking parameters
    /\/(tag|category)\/[^/]+\/$/i, // Tag/category pages (too specific)
  ];
  
  const filtered = urls.filter(url => {
    try {
      const urlObj = new URL(url);
      
      // Must be same domain
      if (urlObj.hostname !== hostname) return false;
      
      // Exclude unwanted patterns
      for (const pattern of excludePatterns) {
        if (pattern.test(urlObj.pathname)) return false;
      }
      
      return true;
    } catch {
      return false;
    }
  });
  
  // Sort by priority
  const prioritized = filtered.sort((a, b) => {
    const aPath = new URL(a).pathname;
    const bPath = new URL(b).pathname;
    
    let aPriority = 100;
    let bPriority = 100;
    
    // Check priority patterns
    priorityPatterns.forEach((pattern, index) => {
      if (pattern.test(aPath)) aPriority = index;
      if (pattern.test(bPath)) bPriority = index;
    });
    
    // Prefer shorter URLs (higher level pages)
    if (aPriority === bPriority) {
      return aPath.length - bPath.length;
    }
    
    return aPriority - bPriority;
  });
  
  return prioritized;
}

// Generate smart fallback pages
function generateSmartFallbackPages(baseUrl: string): string[] {
  const baseUrlObj = new URL(baseUrl);
  const commonPages = [
    '/', // Homepage
    '/index.html',
    '/index.htm',
    '/home',
    '/about',
    '/about-us',
    '/contact',
    '/contact-us',
    '/services',
    '/service',
    '/products',
    '/product',
    '/pricing',
    '/price',
    '/team',
    '/staff',
    '/blog',
    '/news',
    '/faq',
    '/help',
    '/api',
    '/docs',
    '/documentation',
    '/support',
    '/resources',
    '/portfolio',
    '/gallery',
    '/testimonials',
    '/reviews',
    '/locations',
    '/careers',
    '/jobs',
    '/privacy',
    '/terms',
  ];
  
  return commonPages
    .map(page => new URL(page, baseUrl).toString())
    .filter(url => {
      // Only return URLs that are valid and from the same domain
      try {
        const urlObj = new URL(url);
        return urlObj.hostname === baseUrlObj.hostname;
      } catch {
        return false;
      }
    });
}

// --- Resource + API probes ---------------------------------------------------

export interface ProbeResult {
  url: string;
  status: number;
  ok: boolean;
  bodySnippet?: string;
}

const RESOURCE_PROBES = ['/manifest.json', '/.well-known/security.txt', '/.well-known/assetlinks.json'];
const API_PROBES = ['/api/config', '/api/navigation', '/api/search?q=site', '/api/products?limit=20', '/wp-json/wp/v2/pages'];

async function safeProbe(url: string, options: FetchOptions, snippetBytes = 800): Promise<ProbeResult | null> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(options.timeoutMs ?? 8000),
      method: 'GET',
      headers: {
        'User-Agent': pickUserAgent(),
        Accept: 'application/json,text/html;q=0.8,*/*;q=0.5',
      },
    });
    const contentType = res.headers.get('content-type') || '';
    if (/image|audio|video|pdf|zip|tar|gzip|octet-stream/i.test(contentType)) {
      return null; // skip binaries
    }
    const contentLength = Number(res.headers.get('content-length') || '0');
    const maxLen = options.maxContentLengthBytes ?? 800_000;
    if (contentLength && contentLength > maxLen) return null;
    const text = await res.text();
    const limited = text.slice(0, Math.min(snippetBytes, maxLen));
    return { url, status: res.status, ok: res.ok, bodySnippet: limited };
  } catch {
    return null;
  }
}

export async function probeResources(baseUrl: string, options: FetchOptions = {}): Promise<ProbeResult[]> {
  const results: ProbeResult[] = [];
  const { onProgress, ...fetchOpts } = options;
  for (const path of RESOURCE_PROBES) {
    const full = new URL(path, baseUrl).toString();
    onProgress?.(`Probing resource ${full}`);
    const res = await safeProbe(full, fetchOpts);
    if (res && res.ok) results.push(res);
  }
  return results;
}

export async function probeApis(baseUrl: string, options: FetchOptions = {}): Promise<ProbeResult[]> {
  const results: ProbeResult[] = [];
  const { onProgress, ...fetchOpts } = options;
  for (const path of API_PROBES) {
    const full = new URL(path, baseUrl).toString();
    onProgress?.(`Probing API ${full}`);
    const res = await safeProbe(full, fetchOpts);
    if (res && res.ok) results.push(res);
  }
  return results;
}

function pickUserAgent(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

async function isAllowedByRobots(url: string, devMode: boolean, useProxies: boolean, onProgress?: (msg: string) => void): Promise<boolean> {
  if (devMode) return true;
  try {
    const robotsUrl = new URL('/robots.txt', url).toString();
    onProgress?.('Checking robots.txt...');
    // In browser mode, always try proxies first for robots.txt
    const targets = IS_BROWSER && useProxies ? 
      PROXIES.map((p) => p(robotsUrl)).concat(robotsUrl) : 
      [robotsUrl];
    let text: string | null = null;
    for (let i = 0; i < targets.length; i++) {
      const target = targets[i];
      try {
        // Faster timeout for robots.txt
        const res = await fetch(target, { signal: AbortSignal.timeout(3000) });
        if (!res.ok) continue;
        text = await res.text();
        break;
      } catch {
        continue;
      }
    }
    if (!text) {
      onProgress?.('No robots.txt found, continuing...');
      return true; // assume allowed if missing
    }
    // Very lightweight parser: block if any Disallow matches path root
    const lines = text.split('\n').map((l) => l.trim());
    const disallows = lines.filter((l) => l.toLowerCase().startsWith('disallow:'))
      .map((l) => l.split(':')[1]?.trim() || '')
      .filter(Boolean);
    const path = new URL(url).pathname;
    return !disallows.some((rule) => rule !== '/' && path.startsWith(rule));
  } catch {
    // Fail open to avoid blocking scans for bad robots
    onProgress?.('robots.txt check failed, continuing');
    return true;
  }
}

async function tryFetch(targetUrl: string, timeoutMs: number, onProgress?: (msg: string) => void, maxContentLengthBytes = 1_500_000) {
  const ua = pickUserAgent();
  onProgress?.(`Fetching ${targetUrl} with UA rotation...`);
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    
    const res = await fetch(targetUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': ua,
        'Accept-Language': 'en-US,en;q=0.9',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      method: 'GET',
    });
    
    clearTimeout(timeoutId);
    
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const contentType = res.headers.get('content-type') || '';
    if (/image|audio|video|pdf|zip|tar|gzip|octet-stream/i.test(contentType)) {
      throw new Error(`Blocked binary content-type: ${contentType}`);
    }
    const contentLength = Number(res.headers.get('content-length') || '0');
    if (contentLength && contentLength > maxContentLengthBytes) throw new Error('Content too large');
    return res.text();
  } catch (err) {
    // Better CORS error detection
    if (err instanceof Error) {
      if (err.message.includes('Failed to fetch') || 
          err.message.includes('CORS') || 
          err.message.includes('NetworkError') ||
          err.message.includes('cross-origin') ||
          err.name === 'AbortError') {
        throw new Error(`CORS_ERROR: ${err.message}`);
      }
    }
    throw err;
  }
}

export async function fetchPage(url: string, options: FetchOptions = {}): Promise<string> {
  const {
    timeoutMs = 8000, // Reduced from 15000
    retries = 2, // Reduced from 3
    backoffMs = 300, // Reduced from 500
    respectRobots = true,
    devMode = false,
    useProxies = true,
    onProgress,
    maxContentLengthBytes = 1_500_000,
    requestBudget,
  } = options;

  if (respectRobots) {
    const allowed = await isAllowedByRobots(url, devMode, useProxies, onProgress);
    if (!allowed) throw new Error('Blocked by robots.txt');
  }

  let lastError: Error | null = null;
  let budgetRemaining = requestBudget ?? Infinity;

  const preferProxyFirst = IS_BROWSER && useProxies;

  const attemptDirect = async () => {
    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const html = await tryFetch(url, timeoutMs, onProgress, maxContentLengthBytes);
        if (html.length < 100) throw new Error('Response too short');
        budgetRemaining -= html.length;
        if (budgetRemaining < 0) throw new Error('Request budget exceeded');
        return html;
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        // If it's a CORS error and we're in browser, don't retry direct
        if (IS_BROWSER && lastError.message.includes('CORS_ERROR')) {
          onProgress?.('Direct fetch blocked by CORS, switching to proxies...');
          break;
        }
        onProgress?.(`Direct fetch failed (attempt ${attempt + 1}/${retries}): ${lastError.message}`);
        await new Promise((r) => setTimeout(r, backoffMs * (attempt + 1)));
      }
    }
    throw lastError ?? new Error('Direct fetch failed');
  };

  const attemptProxies = async () => {
    for (let i = 0; i < PROXIES.length; i++) {
      const proxyUrl = PROXIES[i](url);
      onProgress?.(`Trying proxy ${i + 1}/${PROXIES.length}...`);
      try {
        const html = await tryFetch(proxyUrl, timeoutMs, onProgress, maxContentLengthBytes);
        if (html.length < 100) throw new Error('Response too short');
        budgetRemaining -= html.length;
        if (budgetRemaining < 0) throw new Error('Request budget exceeded');
        onProgress?.(`Proxy ${i + 1} succeeded!`);
        return html;
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        onProgress?.(`Proxy ${i + 1} failed: ${lastError.message}`);
      }
    }
    throw lastError ?? new Error('Proxy fetch failed');
  };

  const sequences = preferProxyFirst && useProxies ? [attemptProxies, attemptDirect] : [attemptDirect, attemptProxies];

  for (const fn of sequences) {
    try {
      return await fn();
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (fn === attemptProxies && !useProxies) break;
    }
  }

  throw new Error(`All fetch attempts failed: ${lastError?.message ?? 'Unknown error'}`);
}
