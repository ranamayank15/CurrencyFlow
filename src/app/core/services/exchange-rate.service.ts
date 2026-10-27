import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map, of, shareReplay } from 'rxjs';

export interface Currency {
  iso_code: string;
  name: string;
  symbol: string | null;
}

export interface Rate {
  date: string;
  base: string;
  quote: string;
  rate: number;
}

/** Daily USD -> currency series, aligned on a shared list of dates. */
export interface History {
  dates: string[];
  usd: Record<string, number[]>;
}

// Frankfurter v2: free, no API key, mid-market rates from central banks.
const API = 'https://api.frankfurter.dev/v2';
const isoDay = (d: Date) => d.toISOString().slice(0, 10);

@Injectable({ providedIn: 'root' })
export class ExchangeRateService {
  private readonly http = inject(HttpClient);
  private readonly cache = new Map<string, Observable<unknown>>();

  currencies(): Observable<Currency[]> {
    return this.cached('currencies', `${API}/currencies`);
  }

  rate(from: string, to: string): Observable<Rate> {
    return this.cached(`${from}/${to}`, `${API}/rate/${from}/${to}`);
  }

  /** One request returns every currency's USD series for the last `days` days. */
  history(codes: string[], days: number): Observable<History> {
    const quotes = [...new Set(codes)].filter((c) => c !== 'USD').sort();
    if (!quotes.length) return of({ dates: [], usd: {} });

    const to = isoDay(new Date());
    const from = isoDay(new Date(Date.now() - days * 86_400_000));
    const group = days > 120 ? '&group=week' : ''; // keeps 1Y responses small
    const url = `${API}/rates?from=${from}&to=${to}&base=USD&quotes=${quotes.join(',')}${group}`;
    return this.cached<Rate[]>(`hist:${quotes}:${days}:${to}`, url).pipe(
      map((rows) => alignSeries(rows, codes)),
    );
  }

  // Rates are daily, so caching per request for the session is safe.
  // shareReplay resets on error, so a failed request is retried next time.
  private cached<T>(key: string, url: string): Observable<T> {
    let req = this.cache.get(key) as Observable<T> | undefined;
    if (!req) {
      req = this.http.get<T>(url).pipe(shareReplay({ bufferSize: 1, refCount: false }));
      this.cache.set(key, req);
    }
    return req;
  }
}

/** Pivot flat rows into per-currency arrays on common dates (gaps are carried over). */
export function alignSeries(rows: Rate[], codes: string[]): History {
  const dates = [...new Set(rows.map((r) => r.date))].sort();
  const byCode = new Map<string, Map<string, number>>();
  for (const r of rows) {
    if (!byCode.has(r.quote)) byCode.set(r.quote, new Map());
    byCode.get(r.quote)!.set(r.date, r.rate);
  }
  const usd: Record<string, number[]> = { USD: dates.map(() => 1) };
  for (const code of new Set(codes)) {
    const m = byCode.get(code);
    if (!m) continue;
    let last = dates.map((d) => m.get(d)).find((v) => v !== undefined); // back-fill the start
    usd[code] = dates.map((d) => {
      last = m.get(d) ?? last;
      return last as number;
    });
  }
  return { dates, usd };
}
