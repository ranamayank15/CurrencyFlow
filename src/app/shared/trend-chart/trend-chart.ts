import { Component, DestroyRef, ElementRef, afterNextRender, computed, inject, input, signal, viewChild } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { catchError, map, of, startWith, switchMap } from 'rxjs';
import { ExchangeRateService, History } from '../../core/services/exchange-rate.service';
import { niceTicks } from '../../core/utils/nice-ticks';

type Data = { status: 'loading' } | { status: 'error' } | { status: 'ok'; history: History };
type Mode = 'pct' | 'rate';
interface Series { code: string; color: string; pct: number[]; rate: number[]; }
interface Panel {
  label: string | null; // currency name above the panel (Rate mode only)
  color: string;
  labelY: number;
  zero: number | null; // y of the 0% line (% mode only)
  yTicks: { y: number; label: string }[];
  paths: { code: string; color: string; d: string }[];
}

const PALETTE = ['#ff7a59', '#2ec4b6', '#ffbf3c', '#6c8cff', '#e056a0', '#7bd36b', '#b38cff', '#4cc9f0', '#f4845f', '#9ad1d4'];
const tail = (a: number[]) => a[a.length - 1];
const fmtPct = (v: number, digits = 2) => `${v > 0 ? '+' : ''}${v.toFixed(digits)}%`;
const fmtFixed = (v: number, digits: number) =>
  v.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });
const fmtRate = (v: number) => v.toLocaleString('en-US', { maximumSignificantDigits: 5 });
/** Decimal places needed to show an axis step exactly: 0.005 -> 3, 0.2 -> 1, 5 -> 0. */
const decimals = (step: number) => Math.max(0, Math.ceil(-Math.log10(step) - 1e-9));

/**
 * Trend of every currency against `base` over a period, in two views:
 *  - % change: all lines on one axis, comparable with each other.
 *  - Rate: the actual value of 1 `base`. Currencies differ hugely in size (65 INR vs 0.77 USD),
 *    so each one gets its own small panel and scale.
 * Currencies can be hidden from the graph without touching the converter table.
 */
@Component({
  selector: 'app-trend-chart',
  templateUrl: './trend-chart.html',
  styleUrl: './trend-chart.scss',
})
export class TrendChart {
  private readonly fx = inject(ExchangeRateService);

  readonly codes = input.required<string[]>();
  readonly base = input.required<string>();

  private readonly H = 260; // chart height in % mode
  private readonly PH = 84; // height of one panel in Rate mode
  protected readonly L = 56;
  protected readonly R = 12;
  protected readonly T = 12;
  protected readonly B = 28;
  protected readonly width = signal(600); // updated from the real element width

  protected readonly modes = [
    { value: 'pct', label: '% change' },
    { value: 'rate', label: 'Rate' },
  ] as const;
  protected readonly mode = signal<Mode>('pct');

  protected readonly ranges = [
    { label: '7D', days: 7 },
    { label: '1M', days: 30 },
    { label: '3M', days: 90 },
    { label: '1Y', days: 365 },
  ] as const;
  protected readonly days = signal(30);
  private readonly hidden = signal<ReadonlySet<string>>(new Set());
  private readonly hover = signal<number | null>(null);
  private readonly tick = signal(0);
  private readonly plot = viewChild.required<ElementRef<HTMLElement>>('plot');

  // The key ignores the base currency and the mode, so switching them never refetches.
  private readonly key = computed(
    () => `${[...new Set(this.codes())].sort().join(',')}|${this.days()}|${this.tick()}`,
  );

  // Keeps showing the previous data while a new range loads, so the chips don't flicker.
  private last: Data = { status: 'loading' };
  protected readonly data = toSignal(
    toObservable(this.key).pipe(
      switchMap((key) => {
        const [codes, days] = key.split('|');
        return this.fx.history(codes.split(','), Number(days)).pipe(
          map((history): Data => (this.last = { status: 'ok', history })),
          startWith<Data>(this.last),
          catchError(() => of<Data>({ status: 'error' })),
        );
      }),
    ),
    { initialValue: { status: 'loading' } as Data },
  );

  private readonly dates = computed(() => {
    const d = this.data();
    return d.status === 'ok' ? d.history.dates : [];
  });

  private readonly all = computed<Series[]>(() => {
    const d = this.data();
    if (d.status !== 'ok') return [];
    const { usd } = d.history;
    const base = usd[this.base()];
    if (!base || !d.history.dates.length) return [];
    return [...new Set(this.codes())].flatMap((code, i): Series[] => {
      const s = usd[code];
      if (code === this.base() || !s) return [];
      const rate = s.map((v, j) => v / base[j]); // 1 base = <rate> code, on each day
      const pct = rate.map((v) => (v / rate[0] - 1) * 100);
      return [{ code, color: PALETTE[i % PALETTE.length], pct, rate }];
    });
  });

  protected readonly chips = computed(() => {
    const rateMode = this.mode() === 'rate';
    return this.all().map((s) => {
      const change = tail(s.pct);
      return {
        code: s.code,
        color: s.color,
        up: change >= 0, // colour always shows direction, in both modes
        off: this.hidden().has(s.code),
        text: rateMode ? fmtRate(tail(s.rate)) : fmtPct(change),
      };
    });
  });
  private readonly lines = computed(() => this.all().filter((s) => !this.hidden().has(s.code)));

  protected readonly geo = computed(() => {
    const lines = this.lines();
    const dates = this.dates();
    const n = dates.length;
    if (!lines.length || n < 2) return null;

    const w = this.width();
    const x = (i: number) => this.L + (i / (n - 1)) * (w - this.L - this.R);
    const path = (vals: number[], y: (v: number) => number) =>
      vals.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join('');

    let height: number;
    let panels: Panel[];
    let dotsAt: (i: number) => { code: string; color: string; cy: number }[];

    if (this.mode() === 'pct') {
      const vals = lines.flatMap((l) => l.pct);
      let min = Math.min(0, ...vals);
      let max = Math.max(0, ...vals);
      const pad = (max - min) * 0.12 || 1;
      min -= pad;
      max += pad;
      const y = (v: number) => this.T + ((max - v) / (max - min)) * (this.H - this.T - this.B);
      const ticks = niceTicks(min, max);
      const digits = decimals(ticks.length > 1 ? ticks[1] - ticks[0] : 1);

      height = this.H;
      panels = [{
        label: null, color: '', labelY: 0, zero: y(0),
        yTicks: ticks.map((v) => ({ y: y(v), label: fmtPct(v, digits) })),
        paths: lines.map((l) => ({ code: l.code, color: l.color, d: path(l.pct, y) })),
      }];
      dotsAt = (i) => lines.map((l) => ({ code: l.code, color: l.color, cy: y(l.pct[i]) }));
    } else {
      // One panel per currency, each with its own y scale built from its own min/max.
      height = this.T + lines.length * this.PH + this.B;
      const scales = lines.map((l, k) => {
        const top = this.T + k * this.PH;
        const y0 = top + 18; // room for the currency label above the plot
        const y1 = top + this.PH - 10;
        let min = Math.min(...l.rate);
        let max = Math.max(...l.rate);
        const pad = (max - min) * 0.15 || max * 0.005; // pegged currencies are a flat line
        min -= pad;
        max += pad;
        return { top, min, max, y: (v: number) => y0 + ((max - v) / (max - min)) * (y1 - y0) };
      });
      panels = lines.map((l, k) => {
        const { top, min, max, y } = scales[k];
        let ticks = niceTicks(min, max, 3);
        if (ticks.length < 2) ticks = niceTicks(min, max, 5); // a lone label is hard to read
        const digits = decimals(ticks.length > 1 ? ticks[1] - ticks[0] : max - min);
        return {
          label: l.code, color: l.color, labelY: top + 10, zero: null,
          yTicks: ticks.map((v) => ({ y: y(v), label: fmtFixed(v, digits) })),
          paths: [{ code: l.code, color: l.color, d: path(l.rate, y) }],
        };
      });
      dotsAt = (i) => lines.map((l, k) => ({ code: l.code, color: l.color, cy: scales[k].y(l.rate[i]) }));
    }

    const longRange = this.days() > 120;
    const label = (iso: string) =>
      new Date(`${iso}T00:00:00`).toLocaleDateString('en-GB', {
        day: 'numeric', month: 'short', ...(longRange ? { year: '2-digit' } : {}),
      });

    return {
      n, x, height, panels, dotsAt,
      xTicks: (w < 420 ? [0, 0.5, 1] : [0, 1 / 3, 2 / 3, 1]).map((f) => {
        const i = Math.round(f * (n - 1));
        return { x: x(i), label: label(dates[i]) };
      }),
    };
  });

  protected readonly cursor = computed(() => {
    const g = this.geo();
    const h = this.hover();
    if (!g || h === null || h >= g.n) return null;
    return { x: g.x(h), dots: g.dotsAt(h) };
  });

  /** Shows the hovered day, or the latest day when nothing is hovered. */
  protected readonly readout = computed(() => {
    const dates = this.dates();
    if (dates.length < 2) return null;
    const i = Math.min(this.hover() ?? dates.length - 1, dates.length - 1);
    const rateMode = this.mode() === 'rate';
    return {
      date: new Date(`${dates[i]}T00:00:00`).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }),
      items: this.lines().map((l) => ({
        code: l.code,
        color: l.color,
        text: rateMode ? fmtRate(l.rate[i]) : fmtPct(l.pct[i]),
      })),
    };
  });

  constructor() {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      const ro = new ResizeObserver(([entry]) => this.width.set(Math.max(280, Math.round(entry.contentRect.width))));
      ro.observe(this.plot().nativeElement);
      destroyRef.onDestroy(() => ro.disconnect());
    });
  }

  protected toggle(code: string): void {
    this.hidden.update((h) => {
      const next = new Set(h);
      if (!next.delete(code)) next.add(code);
      return next;
    });
  }

  protected setMode(mode: Mode): void {
    this.hover.set(null);
    this.mode.set(mode);
  }

  protected setRange(days: number): void {
    this.hover.set(null);
    this.days.set(days);
  }

  protected retry(): void {
    this.tick.update((n) => n + 1);
  }

  protected onMove(e: PointerEvent): void {
    const g = this.geo();
    if (!g) return;
    const rect = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * this.width();
    const i = Math.round(((px - this.L) / (this.width() - this.L - this.R)) * (g.n - 1));
    this.hover.set(Math.max(0, Math.min(g.n - 1, i)));
  }

  protected clearHover(): void {
    this.hover.set(null);
  }
}