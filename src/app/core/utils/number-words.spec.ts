import { toCompactWords, toFullWords } from './number-words';

describe('number-words', () => {
  it('formats compact Indian units', () => {
    expect(toCompactWords(75_220_000, 'indian')).toBe('7 Crore 52 Lakh 20 Thousand');
    expect(toCompactWords(752_200, 'indian')).toBe('7 Lakh 52 Thousand 200');
  });

  it('formats compact international units', () => {
    expect(toCompactWords(1_000_000, 'international')).toBe('1 Million');
  });

  it('spells numbers out', () => {
    expect(toFullWords(752_200, 'indian')).toBe('Seven Lakh Fifty-Two Thousand Two Hundred');
    expect(toFullWords(100_000_000_000, 'indian')).toBe('Ten Thousand Crore');
  });
});
