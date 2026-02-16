const PROXIES = [
  (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  (url: string) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
];

export async function fetchPage(url: string, onProgress?: (msg: string) => void): Promise<string> {
  let lastError: Error | null = null;

  for (let i = 0; i < PROXIES.length; i++) {
    const proxyUrl = PROXIES[i](url);
    onProgress?.(`Trying proxy ${i + 1}/${PROXIES.length}...`);

    try {
      const res = await fetch(proxyUrl, {
        signal: AbortSignal.timeout(15000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const html = await res.text();
      if (html.length < 100) throw new Error('Response too short');
      return html;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
    }
  }

  throw new Error(`All proxies failed: ${lastError?.message ?? 'Unknown error'}`);
}
