import { Component, computed, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { catchError, map, of, startWith, switchMap } from 'rxjs';
import { Currency, ExchangeRateService } from '../../core/services/exchange-rate.service';
import { ThemeService } from '../../core/services/theme.service';
import { NumberSystem, toCompactWords, toFullWords } from '../../core/utils/number-words';

type RateState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ok'; rate: number; date: string };

// Currencies where people naturally say lakh / crore.
const LAKH_CURRENCIES = new Set(['INR', 'PKR', 'NPR', 'BDT', 'LKR']);

@Component({
  selector: 'app-converter',
  templateUrl: './converter.html',
  styleUrl: './converter.scss',
})
export class Converter {
  private readonly fx = inject(ExchangeRateService);
  protected readonly theme = inject(ThemeService);

  protected readonly currencies = toSignal(
    this.fx.currencies().pipe(catchError(() => of([] as Currency[]))),
    { initialValue: [] as Currency[] },
  );
  protected readonly amountText = signal('1000000');
  protected readonly from = signal('SGD');
  protected readonly to = signal('INR');
  private readonly systemOverride = signal<NumberSystem | null>(null);

  protected readonly amount = computed(() => Number(this.amountText().replace(/,/g, '')) || 0);

  protected readonly state = toSignal(
    toObservable(computed(() => [this.from(), this.to()] as const)).pipe(
      switchMap(([from, to]) =>
        from === to
          ? of<RateState>({ status: 'ok', rate: 1, date: '' })
          : this.fx.rate(from, to).pipe(
              map((r): RateState => ({ status: 'ok', rate: r.rate, date: r.date })),
              startWith<RateState>({ status: 'loading' }),
              catchError(() => of<RateState>({ status: 'error' })),
            ),
      ),
    ),
    { initialValue: { status: 'loading' } as RateState },
  );

  protected readonly converted = computed(() => {
    const s = this.state();
    return s.status === 'ok' ? this.amount() * s.rate : null;
  });

  protected readonly targetSystem = computed(() => this.systemFor(this.to()));

  protected readonly convertedText = computed(() => {
    const v = this.converted();
    if (v === null) return '';
    const locale = this.targetSystem() === 'indian' ? 'en-IN' : 'en-US';
    return new Intl.NumberFormat(locale, { style: 'currency', currency: this.to() }).format(v);
  });

  protected readonly sourceWords = computed(() => this.words(this.amount(), this.from()));
  protected readonly resultWords = computed(() => this.words(this.converted(), this.to()));
  protected readonly resultFullWords = computed(() => {
    const v = this.converted();
    return v !== null && v >= 1000 ? toFullWords(v, this.targetSystem()) : '';
  });

  protected readonly rateText = computed(() => {
    const s = this.state();
    if (s.status !== 'ok') return '';
    const r = s.rate.toLocaleString(undefined, { maximumFractionDigits: 4 });
    return `1 ${this.from()} = ${r} ${this.to()}${s.date ? ` · rates of ${s.date}` : ''}`;
  });

  protected pick(e: Event): string {
    return (e.target as HTMLSelectElement).value;
  }

  protected onAmount(e: Event): void {
    this.amountText.set((e.target as HTMLInputElement).value);
  }

  protected swap(): void {
    const f = this.from();
    this.from.set(this.to());
    this.to.set(f);
  }

  protected setSystem(s: NumberSystem): void {
    this.systemOverride.set(s);
  }

  private systemFor(code: string): NumberSystem {
    return this.systemOverride() ?? (LAKH_CURRENCIES.has(code) ? 'indian' : 'international');
  }

  private words(value: number | null, code: string): string {
    return value !== null && value >= 1000 ? `${toCompactWords(value, this.systemFor(code))} ${code}` : '';
  }
}
