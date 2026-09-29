import { Component, inject } from '@angular/core';
import { ThemeService } from './core/services/theme.service';
import { Background } from './shared/background/background';
import { Converter } from './features/converter/converter';

@Component({
  selector: 'app-root',
  imports: [Background, Converter],
  template: `<app-background /><app-converter />`,
})
export class App {
  // Instantiate early so data-theme is set on <html> before first paint.
  private readonly theme = inject(ThemeService);
}
