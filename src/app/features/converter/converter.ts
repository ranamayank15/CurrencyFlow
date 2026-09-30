import { Component, computed, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { catchError, forkJoin, of, switchMap, tap } from 'rxjs';
import { Currency, ExchangeRateService, Rate } from '../../core/services/exchange-rate.service';
import { ThemeService } from '../../core/services/theme.service';
import { NumberSystem, toCompactWords, toFullWords } from '../../core/utils/number-words';

interface Row { id: number; code: string; }
interface RowView {
  id: number; code: string; active: boolean; value: number | null;
  text: string; words: string; fullWords: string;
}
type SystemPref = 'auto' | NumberSystem;

// Currencies where people naturally say lakh / crore.
const LAKH_CURRENCIES = new Set(['INR', 'PKR', 'NPR', 'BDT', 'LKR']);
const DEFAULT_CODES = ['SGD', 'INR', 'USD', 'MYR'];
const SUGGESTED = ['EUR', 'GBP', 'JPY', 'AUD', 'AED', 'CAD', 'CHF', 'CNY', 'HKD', 'THB'];
const MAX_ROWS = 10;
const ROWS_KEY = 'currency-flow:rows';

@Component({
  selector: 'app-converter',
  templateUrl: './converter.html',
  styleUrl: './converter.scss',
})
export class Converter {
  private readonly fx = inject(ExchangeRateService);
  protected readonly theme = inject(ThemeService);

  protected readonly maxRows = MAX_ROWS;
  protected readonly systemOptions = [
    { value: 'auto', label: 'Auto' },
    { value: 'indian', label: 'Lakh / Crore' },
    { value: 'international', label: 'Million / Billion' },
  ] as const;

  protected readonly currencies = toSignal(
    this.fx.currencies().pipe(catchError(() => of([] as Currency[]))),
    { initialValue: [] as Currency[] },
  );

  private nextId = 1;
  protected readonly rows = signal<Row[]>(this.loadRows());
  protected readonly activeId = signal(this.rows()[0].id);
  protected readonly activeText = signal('1000000');
  protected readonly systemPref = signal<SystemPref>('auto');

  // All rates are fetched against USD once per currency, so switching the
  // active row needs no network call: rate(A -> B) = usd[B] / usd[A].
  private readonly usd = signal<Record<string, number>>({ USD: 1 });
  private readonly reloadTick = signal(0);
  protected readonly status = signal<'loading' | 'ok' | 'error'>('loading');
  protected readonly rateDate = signal('');

  protected readonly usedCodes = computed(() => new Set(this.rows().map((r) => r.code)));
  private readonly fetchKey = computed(
    () => `${[...this.usedCodes()].sort().join(',')}|${this.reloadTick()}`,
  );

  protected readonly amount = computed(() => Number(this.activeText().replace(/[,\s]/g, '')) || 0);

  protected readonly views = computed<RowView[]>(() => {
    const rates = this.usd();
    const rows = this.rows();
    const active = rows.find((r) => r.id === this.activeId()) ?? rows[0];
    const amount = this.amount();
    return rows.map((row) => {
      const isActive = row.id === active.id;
      const from = rates[active.code];
      const to = rates[row.code];
      const value = isActive ? amount : from && to ? (amount * to) / from : null;
      const system = this.systemFor(row.code);
      const big = value !== null && value >= 1000;
      return {
        id: row.id,
        code: row.code,
        active: isActive,
        value,
        text: isActive ? this.activeText() : value === null ? '' : this.fmt(value, system),
        words: big ? `${toCompactWords(value, system)} ${row.code}` : '',
        fullWords: big ? `${toFullWords(value, system)} ${row.code}` : '',
      };
    });
  });

  constructor() {
    toObservable(this.fetchKey)
      .pipe(
        tap(() => this.status.set('loading')),
        switchMap((key) => {
          const codes = key.split('|')[0].split(',').filter((c) => c && c !== 'USD');
          const req = codes.length
            ? forkJoin(codes.map((c) => this.fx.rate('USD', c)))
            : of([] as Rate[]);
          return req.pipe(catchError(() => of(null)));
        }),
        takeUntilDestroyed(),
      )
      .subscribe((list) => {
        if (!list) {
          this.status.set('error');
          return;
        }
        this.usd.update((prev) => ({ ...prev, ...Object.fromEntries(list.map((r) => [r.quote, r.rate])) }));
        if (list.length) this.rateDate.set(list[0].date);
        this.status.set('ok');
      });

    effect(() => {
      try {
        localStorage.setItem(ROWS_KEY, JSON.stringify(this.rows().map((r) => r.code)));
      } catch {
        /* storage unavailable - ignore */
      }
    });
  }

  protected pick(e: Event): string {
    return (e.target as HTMLSelectElement).value;
  }

  /** Typing in any row makes it the source; every other row is recalculated. */
  protected onInput(id: number, e: Event): void {
    this.activeId.set(id);
    this.activeText.set((e.target as HTMLInputElement).value);
  }

  protected setCode(id: number, code: string): void {
    this.rows.update((rs) => rs.map((r) => (r.id === id ? { ...r, code } : r)));
  }

  protected add(): void {
    const used = this.usedCodes();
    const code = SUGGESTED.find((c) => !used.has(c));
    if (code && this.rows().length < MAX_ROWS) {
      this.rows.update((rs) => [...rs, { id: this.nextId++, code }]);
    }
  }

  protected remove(id: number): void {
    if (this.rows().length <= 2) return;
    const rest = this.rows().filter((r) => r.id !== id);
    if (this.activeId() === id) {
      // Hand over to the first remaining row, keeping its current value.
      const next = this.views().find((v) => v.id === rest[0].id);
      this.activeId.set(rest[0].id);
      this.activeText.set(next?.value != null ? String(Math.round(next.value * 100) / 100) : '');
    }
    this.rows.set(rest);
  }

  protected reload(): void {
    this.reloadTick.update((n) => n + 1);
  }

  private systemFor(code: string): NumberSystem {
    const pref = this.systemPref();
    return pref !== 'auto' ? pref : LAKH_CURRENCIES.has(code) ? 'indian' : 'international';
  }

  private fmt(value: number, system: NumberSystem): string {
    return new Intl.NumberFormat(system === 'indian' ? 'en-IN' : 'en-US', {
      maximumFractionDigits: value !== 0 && Math.abs(value) < 1 ? 4 : 2,
    }).format(value);
  }

  private loadRows(): Row[] {
    let codes = DEFAULT_CODES;
    try {
      const saved: unknown = JSON.parse(localStorage.getItem(ROWS_KEY) ?? 'null');
      if (
        Array.isArray(saved) && saved.length >= 2 && saved.length <= MAX_ROWS &&
        saved.every((c) => typeof c === 'string' && /^[A-Z]{3}$/.test(c))
      ) {
        codes = saved;
      }
    } catch {
      /* fall back to defaults */
    }
    return codes.map((code) => ({ id: this.nextId++, code }));
  }
}