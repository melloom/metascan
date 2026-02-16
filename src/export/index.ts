import type { ScanResult } from '../types';

export function exportJSON(result: ScanResult): string {
  const data = {
    url: result.url,
    scannedAt: new Date(result.timestamp).toISOString(),
    title: result.title,
    lines: result.lines.map((line) => ({
      name: line.name,
      stations: line.stations.map((s) => ({
        label: s.label,
        value: s.value,
        confidence: s.confidence,
        evidence: s.evidence,
      })),
    })),
    transfers: result.transfers.map((t) => ({
      lines: t.lineIds,
      reason: t.reason,
    })),
  };
  return JSON.stringify(data, null, 2);
}

export function exportCSV(result: ScanResult): string {
  const rows: string[][] = [['Line', 'Label', 'Value', 'Confidence', 'Source']];

  for (const line of result.lines) {
    for (const station of line.stations) {
      rows.push([
        line.name,
        station.label,
        station.value,
        String(Math.round(station.confidence * 100)) + '%',
        station.evidence.map((e) => e.source).join('; '),
      ]);
    }
  }

  return rows.map((row) =>
    row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(',')
  ).join('\n');
}

export function exportCRM(result: ScanResult): string {
  const findLine = (keywords: string[]) => {
    const lowerKeywords = keywords.map((k) => k.toLowerCase());

    return (
      result.lines.find((l) => lowerKeywords.includes(l.id.toLowerCase())) ||
      result.lines.find((l) => lowerKeywords.some((k) => l.id.toLowerCase().includes(k))) ||
      result.lines.find((l) => lowerKeywords.some((k) => l.name.toLowerCase().includes(k)))
    );
  };

  const identity = findLine(['identity']);
  const contacts = findLine(['contact', 'contacts']);
  const services = findLine(['service', 'services']);

  const findValue = (stations: typeof identity extends undefined ? never : NonNullable<typeof identity>['stations'], label: string) => {
    if (!stations) return '';
    const lowered = label.toLowerCase();
    return stations.find((s) => s.label.toLowerCase() === lowered)?.value ?? '';
  };

  const filterValues = (
    stations: typeof contacts extends undefined ? never : NonNullable<typeof contacts>['stations'],
    label: string,
  ) => (stations ? stations.filter((s) => s.label.toLowerCase() === label.toLowerCase()).map((s) => s.value) : []);

  const crm = {
    company: {
      name: identity ? findValue(identity.stations, 'Business Name') || findValue(identity.stations, 'Company Name') : '',
      type: identity ? findValue(identity.stations, 'Business Type') : '',
      description: identity ? findValue(identity.stations, 'Description') : '',
      location: identity ? findValue(identity.stations, 'Location') : '',
      website: result.url,
    },
    contacts: {
      phone: filterValues(contacts?.stations ?? [], 'Phone'),
      email: filterValues(contacts?.stations ?? [], 'Email'),
      address: contacts ? findValue(contacts.stations, 'Address') : '',
      hours: contacts ? findValue(contacts.stations, 'Hours') : '',
    },
    services: services ? services.stations.map((s) => s.value) : [],
    scannedAt: new Date(result.timestamp).toISOString(),
    source: 'MetroScan',
  };

  return JSON.stringify(crm, null, 2);
}
