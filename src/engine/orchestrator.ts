import type { ScanResult, Line } from '../types';
import { LINE_DEFINITIONS, createEmptyLine } from '../constants/lines';
import { fetchPage } from './fetcher';
import { parsePage } from './parser';
import { extractIdentity, extractContacts, extractServices, extractPages, extractEntities, extractTech } from './extractors';
import { applyConfidenceScores } from './confidenceScorer';
import { detectTransfers } from './transferDetector';

type ProgressCallback = (status: string, progress: number) => void;

const EXTRACTORS = {
  identity: extractIdentity,
  contacts: extractContacts,
  services: extractServices,
  pages: extractPages,
  entities: extractEntities,
  tech: extractTech,
} as const;

export async function runScan(url: string, onProgress?: ProgressCallback): Promise<ScanResult> {
  // Normalize URL
  if (!url.startsWith('http')) url = 'https://' + url;

  onProgress?.('Fetching page...', 0.1);
  const html = await fetchPage(url);

  onProgress?.('Parsing HTML...', 0.3);
  const page = parsePage(html, url);

  onProgress?.('Extracting data...', 0.5);
  const lines: Line[] = LINE_DEFINITIONS.map((def) => {
    const line = createEmptyLine(def);
    const extractor = EXTRACTORS[def.id];
    const rawStations = extractor(page);
    line.stations = applyConfidenceScores(rawStations);
    return line;
  });

  onProgress?.('Detecting connections...', 0.8);
  const transfers = detectTransfers(lines);

  onProgress?.('Done!', 1.0);

  return {
    url,
    timestamp: Date.now(),
    lines,
    transfers,
    title: page.title || url,
    favicon: page.metaTags.get('og:image') || undefined,
  };
}
