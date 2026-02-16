export function normalizeValue(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '').slice(-10);
}

export function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

export function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.pathname.replace(/\/+$/, '').toLowerCase();
  } catch {
    return url.toLowerCase().trim();
  }
}

export function tokenize(text: string): string[] {
  return normalizeValue(text).split(' ').filter((t) => t.length > 2);
}

export function similarity(a: string, b: string): number {
  const tokA = tokenize(a);
  const tokB = tokenize(b);
  if (tokA.length === 0 || tokB.length === 0) return 0;
  const setA = new Set(tokA);
  const intersection = tokB.filter((t) => setA.has(t));
  return intersection.length / Math.max(tokA.length, tokB.length);
}
