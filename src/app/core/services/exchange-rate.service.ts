import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, shareReplay } from 'rxjs';

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

// Frankfurter v2: free, no API key, mid-market rates from central banks.
const API = 'https://api.frankfurter.dev/v2';

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

  // Rates are daily, so caching per pair for the session is safe.
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
