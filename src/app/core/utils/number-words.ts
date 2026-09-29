export type NumberSystem = 'indian' | 'international';

const SCALES: Record<NumberSystem, ReadonlyArray<readonly [number, string]>> = {
  indian: [[1e7, 'Crore'], [1e5, 'Lakh'], [1e3, 'Thousand']],
  international: [[1e12, 'Trillion'], [1e9, 'Billion'], [1e6, 'Million'], [1e3, 'Thousand']],
};

const ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
  'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

/** 75220000 -> "7 Crore 52 Lakh 20 Thousand" (whole units only). */
export function toCompactWords(value: number, system: NumberSystem): string {
  let rest = Math.floor(Math.abs(value));
  if (rest === 0 || rest > Number.MAX_SAFE_INTEGER) return '';
  const locale = system === 'indian' ? 'en-IN' : 'en-US';
  const parts: string[] = [];
  for (const [size, name] of SCALES[system]) {
    if (rest >= size) {
      parts.push(`${Math.floor(rest / size).toLocaleString(locale)} ${name}`);
      rest %= size;
    }
  }
  if (rest > 0) parts.push(String(rest));
  return parts.join(' ');
}

/** 752200 -> "Seven Lakh Fifty-Two Thousand Two Hundred". */
export function toFullWords(value: number, system: NumberSystem): string {
  let rest = Math.floor(Math.abs(value));
  if (rest === 0) return 'Zero';
  if (rest > Number.MAX_SAFE_INTEGER) return '';
  const parts: string[] = [];
  for (const [size, name] of SCALES[system]) {
    if (rest >= size) {
      const count = Math.floor(rest / size);
      // Counts >= 1000 recurse, e.g. 10,000 crore -> "Ten Thousand Crore".
      parts.push(`${count < 1000 ? belowThousand(count) : toFullWords(count, system)} ${name}`);
      rest %= size;
    }
  }
  if (rest > 0) parts.push(belowThousand(rest));
  return parts.join(' ');
}

function belowThousand(n: number): string {
  const hundreds = Math.floor(n / 100);
  const r = n % 100;
  const parts: string[] = [];
  if (hundreds) parts.push(`${ONES[hundreds]} Hundred`);
  if (r) parts.push(r < 20 ? ONES[r] : TENS[Math.floor(r / 10)] + (r % 10 ? `-${ONES[r % 10]}` : ''));
  return parts.join(' ');
}
