/** Dates are signed nanoseconds relative to the catalogue reference epoch.
 * Decimal serialization is lossless; only bounded orbital remainders become floats. */
export const TIME_VERSION = 'atlas-time-1';
export const NS = 1_000_000_000n;
export const YEAR_NS = 31_557_600n * NS;
export type OrbitTime = number | bigint;
export function parseDate(value: string | null): bigint {
  if (!value) return 0n;
  if (!/^-?\d{1,120}$/.test(value)) throw new Error('Invalid date');
  return BigInt(value);
}
export function yearsToDate(value: string): bigint {
  const m = /^([+-]?)(\d{1,80})(?:\.(\d{1,9}))?$/.exec(value.trim());
  if (!m) throw new Error('Enter years as a decimal number');
  const fraction = (m[3] || '').padEnd(9, '0');
  return (m[1] === '-' ? -1n : 1n) * (BigInt(m[2]) * YEAR_NS + BigInt(fraction) * YEAR_NS / NS);
}
export function dateYears(date: bigint): string {
  const sign=date<0n?'-':''; const n=date<0n?-date:date;
  const fraction=((n%YEAR_NS)*1_000_000n/YEAR_NS).toString().padStart(6,'0').replace(/0+$/,'');
  return sign+(n/YEAR_NS).toString()+(fraction?'.'+fraction:'');
}
export function dateRecord(date: bigint) { return {version:TIME_VERSION, reference:'catalogue', offsetNs:date.toString(), branchId:'baseline'}; }
export function phaseAt(time: OrbitTime, angularSpeed: number): number {
  if (typeof time === 'number') return angularSpeed * time;
  if (!Number.isFinite(angularSpeed) || angularSpeed <= 0) return 0;
  const period=BigInt(Math.max(1,Math.round(2*Math.PI/angularSpeed*1e9)));
  const remainder=((time%period)+period)%period;
  return Number(remainder)/Number(period)*2*Math.PI;
}
export function advanceDate(date: bigint, seconds: number, rate=1): bigint {
  if (!Number.isFinite(seconds*rate)) throw new Error('Invalid clock increment');
  return date+BigInt(Math.round(seconds*rate*1e9));
}
