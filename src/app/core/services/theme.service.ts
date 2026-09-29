import { Injectable, computed, effect, signal } from '@angular/core';

export type ThemeMode = 'system' | 'light' | 'dark';
const KEY = 'currency-flow:theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly media = matchMedia('(prefers-color-scheme: dark)');
  private readonly systemDark = signal(this.media.matches);

  readonly mode = signal<ThemeMode>(this.stored());
  readonly theme = computed<'light' | 'dark'>(() => {
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
    const order: ThemeMode[] = ['system', 'light', 'dark'];
    this.mode.update((m) => order[(order.indexOf(m) + 1) % order.length]);
  }

  private stored(): ThemeMode {
    try {
      const v = localStorage.getItem(KEY);
      if (v === 'light' || v === 'dark' || v === 'system') return v;
    } catch {
      /* ignore */
    }
    return 'system';
  }
}
