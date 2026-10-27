import { alignSeries } from './exchange-rate.service';

describe('alignSeries', () => {
  it('aligns by date, forward-fills gaps and back-fills the start', () => {
    const rows = [
      { date: '2026-10-01', base: 'USD', quote: 'INR', rate: 83 },
      { date: '2026-10-02', base: 'USD', quote: 'INR', rate: 84 },
      { date: '2026-10-02', base: 'USD', quote: 'SGD', rate: 1.3 },
      { date: '2026-10-03', base: 'USD', quote: 'INR', rate: 85 },
    ];
    const h = alignSeries(rows, ['INR', 'SGD', 'USD']);
    expect(h.dates).toEqual(['2026-10-01', '2026-10-02', '2026-10-03']);
    expect(h.usd['INR']).toEqual([83, 84, 85]);
    expect(h.usd['SGD']).toEqual([1.3, 1.3, 1.3]);
    expect(h.usd['USD']).toEqual([1, 1, 1]);
  });
});
