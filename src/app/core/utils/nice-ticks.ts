/** Round axis values (1, 2, 5 x 10^n) covering [min, max], about `count` of them. */
export function niceTicks(min: number, max: number, count = 5): number[] {
  const raw = (max - min) / (count - 1);
  if (!(raw > 0)) return [min];
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 5, 10].reduce((a, b) => (Math.abs(b * mag - raw) < Math.abs(a * mag - raw) ? b : a)) * mag;
  const ticks: number[] = [];
  for (let k = Math.ceil(min / step - 1e-9); k * step <= max + step * 1e-9; k++) {
    ticks.push(Number((k * step).toPrecision(12)) + 0); // "+ 0" turns -0 into 0
  }
  return ticks;
}
