import { Injectable, computed, effect, signal } from '@angular/core';

export type ThemeMode = 'system' | 'light' | 'dark' | 'cloudy';
export type ResolvedTheme = 'light' | 'dark' | 'cloudy';
const KEY = 'currency-flow:theme';
// Cloudy is the default; the cycle order follows this list.
const MODES: ThemeMode[] = ['cloudy', 'light', 'dark', 'system'];

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly media = matchMedia('(prefers-color-scheme: dark)');
  private readonly systemDark = signal(this.media.matches);

  readonly mode = signal<ThemeMode>(this.stored());
  readonly theme = computed<ResolvedTheme>(() => {
    const m = this.mode();
    return m === 'system' ? (this.systemDark() ? 'dark' : 'light') : m;
  });

  constructor() {
    this.media.addEventListener('change', (e) => this.systemDark.set(e.matches));
    effect(() => {
      document.documentElement.dataset['theme'] = this.theme();
      try {
        localStorage.setItem(KEY, this.mode());
      } catch {
        /* storage unavailable (private mode) - ignore */
      }
    });
  }

  cycle(): void {
    this.mode.update((m) => MODES[(MODES.indexOf(m) + 1) % MODES.length]);
  }

  private stored(): ThemeMode {
    try {
      const v = localStorage.getItem(KEY) as ThemeMode | null;
      if (v && MODES.includes(v)) return v;
    } catch {
      /* ignore */
    }
    return 'cloudy';
  }
}