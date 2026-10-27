// Our own scores, worked out from her raw ring readings. They follow the same
// ideas Oura publishes (sleep amount/quality/timing, HRV and resting HR vs her
// own normal, temperature, activity balance) but are not Oura's formulas.
// `Calibration` nudges each score toward Oura's numbers once we have her history.
import type { Baseline, Cycle, DayData, DayScores, Level } from './types';
import { addDays, daysBetween, dayKey } from './dates';

export type Calibration = Partial<Record<'sleep' | 'readiness' | 'activity', { a: number; b: number }>>;

const clamp = (v: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, v));
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / (xs.length || 1);
const sd = (xs: number[]) => {
  if (xs.length < 2) return undefined;
  const m = mean(xs);
  return Math.sqrt(mean(xs.map((x) => (x - m) ** 2)));
};
// Closeness to a target band, 0..1.
const band = (v: number, lo: number, hi: number, slack: number) =>
  v >= lo && v <= hi ? 1 : clamp(1 - (v < lo ? lo - v : v - hi) / slack, 0, 1);

export function level(score?: number): Level | undefined {
  if (score === undefined) return undefined;
  if (score >= 85) return 'Optimal';
  if (score >= 70) return 'Good';
  if (score >= 60) return 'Fair';
  return 'Pay attention';
}

const midOfSleep = (s: { start: number; end: number }) => {
  const mid = new Date((s.start + s.end) / 2);
  let m = mid.getHours() * 60 + mid.getMinutes();
  if (m > 12 * 60) m -= 24 * 60; // evening = negative, keeps midnight continuous
  return m;
};

/** Her personal normal, from the 30 days before `upTo` (not including it). */
export function baselineFor(days: DayData[], upTo: number): Baseline {
  const win = days.slice(Math.max(0, upTo - 30), upTo);
  const rhr = win.map((d) => d.restingHr).filter((v): v is number => v !== undefined);
  const hrv = win.map((d) => d.hrvMs).filter((v): v is number => v !== undefined);
  const resp = win.map((d) => d.respRate).filter((v): v is number => v !== undefined);
  const sleeps = win.map((d) => d.sleep).filter((s) => !!s) as NonNullable<DayData['sleep']>[];
  return {
    restingHr: rhr.length ? mean(rhr) : undefined,
    restingHrSd: sd(rhr),
    hrvMs: hrv.length ? mean(hrv) : undefined,
    hrvSd: sd(hrv),
    respRate: resp.length ? mean(resp) : undefined,
    sleepMid: sleeps.length ? mean(sleeps.map(midOfSleep)) : undefined,
    sleepMin: sleeps.length ? mean(sleeps.map((s) => s.totalMin)) : undefined,
  };
}

export function sleepScore(d: DayData, b: Baseline): number | undefined {
  const s = d.sleep;
  if (!s) return undefined;
  const staged = s.deepMin + s.remMin > 0;
  const total = Math.min(1, s.totalMin / (8 * 60)) ** 1.5 * band(s.totalMin, 0, 9.5 * 60, 120); // 35%
  const efficiency = clamp((s.totalMin / Math.max(1, s.inBedMin) - 0.7) / 0.25, 0, 1); // 10%
  const deep = staged ? Math.min(1, s.deepMin / s.totalMin / 0.2) : 0.7; // 15%
  const rem = staged ? Math.min(1, s.remMin / s.totalMin / 0.25) : 0.7; // 15%
  const latency = band(s.latencyMin, 10, 20, 30); // 10%
  const timing = b.sleepMid === undefined ? 0.8 : band(Math.abs(midOfSleep(s) - b.sleepMid), 0, 15, 90); // 15%
  return Math.round(clamp(100 * (0.35 * total + 0.1 * efficiency + 0.15 * deep + 0.15 * rem + 0.1 * latency + 0.15 * timing)));
}

export function activityScore(d: DayData, goal: number, recent: DayData[]): number {
  const today = clamp(d.steps / goal, 0, 1.3) / 1.3; // 60%
  const week = recent.length ? clamp(mean(recent.map((x) => x.steps)) / goal, 0, 1.2) / 1.2 : today; // 25%
  const moved = band(d.activeCal, 250, 900, 400); // 15%
  return Math.round(clamp(100 * (0.6 * today + 0.25 * week + 0.15 * moved) + 8));
}

export function readinessScore(d: DayData, b: Baseline, sleep: number | undefined, prevActivity: number | undefined): number | undefined {
  if (sleep === undefined && d.hrvMs === undefined && d.restingHr === undefined) return undefined;
  let s = 82;
  if (d.hrvMs !== undefined && b.hrvMs) s += clamp(((d.hrvMs - b.hrvMs) / (b.hrvSd || b.hrvMs * 0.15)) * 5, -18, 8);
  if (d.restingHr !== undefined && b.restingHr) s += clamp(((b.restingHr - d.restingHr) / (b.restingHrSd || 3)) * 4, -15, 6);
  if (d.tempDeltaC !== undefined) s -= clamp((Math.abs(d.tempDeltaC) - 0.3) * 25, 0, 15);
  if (sleep !== undefined) s += (sleep - 75) * 0.35;
  if (prevActivity !== undefined && prevActivity > 95) s -= 3; // big day yesterday
  return Math.round(clamp(s));
}

/** Minutes of the waking day where heart rate sat well above resting while she wasn't moving. */
export function stressMinutes(d: DayData, restingHr?: number): number {
  if (!restingHr || !d.hr.length) return 0;
  const wakeAt = d.sleep?.end ?? 0;
  let min = 0;
  for (let i = 1; i < d.hr.length; i++) {
    const s = d.hr[i];
    if (s.t < wakeAt) continue;
    const gap = (s.t - d.hr[i - 1].t) / 60000;
    if (gap > 15) continue;
    if (s.bpm > restingHr * 1.5 && s.bpm < restingHr * 2) min += gap; // above ~2x is likely exercise
  }
  return Math.round(min);
}

export function scoreDay(days: DayData[], i: number, goal: number, cal: Calibration = {}): DayScores {
  const d = days[i];
  const b = baselineFor(days, i);
  const adj = (k: keyof Calibration, v?: number) => (v === undefined || !cal[k] ? v : Math.round(clamp(cal[k]!.a * v + cal[k]!.b)));
  const sleep = adj('sleep', sleepScore(d, b));
  const prev = i > 0 ? activityScore(days[i - 1], goal, days.slice(Math.max(0, i - 8), i - 1)) : undefined;
  const activity = adj('activity', activityScore(d, goal, days.slice(Math.max(0, i - 7), i)))!;
  const readiness = adj('readiness', readinessScore(d, b, sleep, prev));
  const stressMin = stressMinutes(d, d.restingHr ?? b.restingHr);

  const last14 = days.slice(Math.max(0, i - 13), i + 1);
  const need = 8 * 60;
  const sleepDebtMin = Math.max(0, Math.round(last14.reduce((acc, x) => acc + (x.sleep ? need - x.sleep.totalMin : 0), 0) / 2));
  const mids = last14.filter((x) => x.sleep).map((x) => midOfSleep(x.sleep!));
  const spread = sd(mids) ?? 0;
  const midDiff = d.sleep && b.sleepMid !== undefined ? midOfSleep(d.sleep) - b.sleepMid : 0;
  const respSpread = sd(last14.map((x) => x.respRate).filter((v): v is number => v !== undefined)) ?? 0;
  const hrvTrend = b.hrvMs && d.hrvMs ? d.hrvMs / b.hrvMs : 1;

  return {
    sleep,
    readiness,
    activity,
    stressMin,
    stressWord: stressMin > 180 ? 'Stressed' : stressMin > 60 ? 'Engaged' : stressMin > 20 ? 'Relaxed' : 'Restored',
    resilience: hrvTrend > 1.05 ? 'Strong' : hrvTrend > 0.95 ? 'Solid' : hrvTrend > 0.85 ? 'Adequate' : 'Limited',
    sleepDebtMin,
    regularity: spread < 30 ? 'Good' : spread < 60 ? 'Fair' : 'Irregular',
    bodyClock: Math.abs(midDiff) < 20 ? 'Aligned' : midDiff < 0 ? 'Ahead' : 'Behind',
    breathing: respSpread < 1 ? 'Steady' : 'Variable',
  };
}

/** Cycle day from her logged period starts, phase from day + temperature shift. */
export function cycleFor(days: DayData[], loggedStarts: string[]): Cycle {
  const today = dayKey(Date.now());
  const fromRing = days.filter((d, i) => d.periodLogged && !days[i - 1]?.periodLogged).map((d) => d.date);
  const starts = [...new Set([...loggedStarts, ...fromRing])].sort();
  const tempSeries = days.slice(-16).map((d) => (d.tempDeltaC ?? 0) * 1.8);
  if (!starts.length) return { tempSeries };
  const lengths = starts.slice(1).map((s, k) => daysBetween(starts[k], s)).filter((n) => n >= 21 && n <= 40);
  const avgLen = lengths.length ? Math.round(mean(lengths)) : 28;
  const last = starts[starts.length - 1];
  const day = daysBetween(last, today) + 1;

  // Temperature rises ~0.3°C after ovulation; use that when we have it.
  const recentTemp = days.slice(-3).map((d) => d.tempDeltaC).filter((v): v is number => v !== undefined);
  const raised = recentTemp.length >= 2 && mean(recentTemp) > 0.2;
  const ovuDay = avgLen - 14;
  const phase: Cycle['phase'] =
    day <= 5 ? 'Menstrual' : raised || day > ovuDay + 1 ? 'Luteal' : day >= ovuDay - 1 ? 'Ovulation' : 'Follicular';

  const next = addDays(last, avgLen);
  return { day, phase, nextPeriodFrom: addDays(next, -2), nextPeriodTo: addDays(next, 2), tempSeries };
}

/** Least-squares fit of Oura's score against ours, for `Calibration`. */
export function fitLinear(pairs: { ours: number; oura: number }[]): { a: number; b: number } | undefined {
  if (pairs.length < 10) return undefined;
  const mx = mean(pairs.map((p) => p.ours));
  const my = mean(pairs.map((p) => p.oura));
  const sxx = pairs.reduce((s, p) => s + (p.ours - mx) ** 2, 0);
  if (!sxx) return undefined;
  const a = pairs.reduce((s, p) => s + (p.ours - mx) * (p.oura - my), 0) / sxx;
  return { a, b: my - a * mx };
}
