# CurrencyFlow

A fluid, day/night currency converter that also says the amount in words
(`1,000,000 SGD` → `7 Crore 52 Lakh 20 Thousand INR`). Pure Angular, no backend, no database.

## Run

```bash
npm install
npm start          # http://localhost:4200
npm test           # Vitest unit tests
npm run build      # output in dist/currency-flow/browser
```

Needs Node 22.22.3+ or 24.15+ (Angular 22 requirement).

## Structure

```
src/app/
  core/services/    exchange-rate.service.ts (Frankfurter v2 + cache), theme.service.ts (system/light/dark)
  core/utils/       number-words.ts (+ spec): lakh/crore and million/billion
  features/converter/  converter.ts / .html / .scss (signals-based UI)
  shared/background/   background.ts (drifting blobs, sun/moon, stars)
src/styles.scss     theme tokens; @property makes sky colours cross-fade day <-> night
```

## Roadmap

1. PPP view (World Bank PPP data, ship as a yearly JSON snapshot)
2. Searchable currency picker with flags, favourites in localStorage
3. Trend sparkline via Frankfurter time series (`/v2/rates?from=...&quotes=...`)
4. Shareable URLs (`?amount=1000000&from=SGD&to=INR`)
5. PWA / offline last-known rate, i18n, e2e with Playwright
6. Deploy: GitHub Pages / Cloudflare Pages, or S3 + CloudFront (`ng build`, sync `dist/.../browser`)
