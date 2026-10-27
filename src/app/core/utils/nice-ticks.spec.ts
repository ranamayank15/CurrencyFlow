import { niceTicks } from './nice-ticks';

describe('niceTicks', () => {
  it('returns round values inside the range', () => {
    expect(niceTicks(-5.8, 0.6)).toEqual([-4, -2, 0]);
    expect(niceTicks(-4.9, 20.8)).toEqual([0, 5, 10, 15, 20]);
  });

  it('handles small ranges without float noise', () => {
    expect(niceTicks(-0.25, 0.45)).toEqual([-0.2, 0, 0.2, 0.4]);
  });
});
