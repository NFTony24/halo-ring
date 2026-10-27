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
  const variability = lengths.length > 1 ? Math.round(Math.max(...lengths) - Math.min(...lengths)) / 2 : 0;
  const runs: number[] = [];
  days.forEach((d, i) => {
    if (d.periodLogged && !days[i - 1]?.periodLogged) runs.push(0);
    if (d.periodLogged) runs[runs.length - 1]++;
  });
  const periodLen = runs.length ? Math.round(mean(runs)) : 5;
  return { day, phase, nextPeriodFrom: addDays(next, -2), nextPeriodTo: addDays(next, 2), tempSeries, starts, avgLen, variability, periodLen };
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

// ---- Contributors: the rows under each score on the detail screens ----

export type Contributor = { label: string; value: string; frac: number };

/** Word for a contributor bar, same bands as the scores. */
export const word = (frac: number) => (frac >= 0.85 ? 'Optimal' : frac >= 0.7 ? 'Good' : frac >= 0.55 ? 'Fair' : 'Pay attention');
const hmText = (m: number) => (m >= 60 ? `${Math.floor(m / 60)} h ${Math.round(m % 60)} min` : `${Math.round(m)} min`);

/** Rough waking-hour inactivity and hourly "move" gaps from heart rate, since steps come in coarse chunks. */
function inactivity(d: DayData, resting = 60) {
  const wakeAt = d.sleep?.end ?? 0;
  const byHour = new Map<number, number[]>();
  for (const s of d.hr) {
    if (s.t < wakeAt) continue;
    const h = new Date(s.t).getHours();
    byHour.set(h, [...(byHour.get(h) ?? []), s.bpm]);
  }
  let idleMin = 0, alerts = 0;
  byHour.forEach((v, h) => {
    const still = v.filter((b) => b < resting * 1.2).length / v.length;
    idleMin += still * 60;
    if (h >= 8 && h <= 21 && still > 0.95) alerts++;
  });
  return { idleMin, alerts };
}

/** Minutes with heart rate in exercise zones (0-5). 183 is the max heart rate set in her Oura settings. */
export function zoneMinutes(d: DayData, max = 183): number[] {
  const out = [0, 0, 0, 0, 0, 0];
  for (let i = 1; i < d.hr.length; i++) {
    const gap = (d.hr[i].t - d.hr[i - 1].t) / 60000;
    if (gap > 15) continue;
    const pct = d.hr[i].bpm / max;
    if (pct < 0.5) continue;
    out[Math.min(5, Math.floor((pct - 0.5) / 0.1) + 1)] += gap;
  }
  return out.map(Math.round);
}

export function readinessParts(days: DayData[], i: number, goal: number, scores: Record<string, DayScores>): Contributor[] {
  const d = days[i];
  const b = baselineFor(days, i);
  const sc = scores[d.date];
  const out: Contributor[] = [];
  if (d.restingHr !== undefined) {
    const f = b.restingHr ? clamp(0.85 - ((d.restingHr - b.restingHr) / (b.restingHrSd || 3)) * 0.12, 0.1, 1) : 0.8;
    out.push({ label: 'Resting heart rate', value: `${Math.round(d.restingHr)} bpm`, frac: f });
  }
  if (d.hrvMs !== undefined) {
    const f = b.hrvMs ? clamp(0.8 + ((d.hrvMs - b.hrvMs) / (b.hrvSd || b.hrvMs * 0.15)) * 0.1, 0.1, 1) : 0.8;
    out.push({ label: 'HRV balance', value: word(f), frac: f });
  }
  if (d.tempDeltaC !== undefined) {
    const f = clamp(1 - Math.max(0, Math.abs(d.tempDeltaC) - 0.2) * 1.2, 0.1, 1);
    out.push({ label: 'Body temperature', value: word(f), frac: f });
  }
  if (d.sleep && d.hr.length) {
    // Recovery index: how early in the night her heart rate bottomed out.
    const night = d.hr.filter((s) => s.t >= d.sleep!.start && s.t <= d.sleep!.end);
    if (night.length) {
      const low = night.reduce((a, s) => (s.bpm < a.bpm ? s : a));
      const f = clamp(1.15 - (low.t - d.sleep.start) / (d.sleep.end - d.sleep.start), 0.1, 1);
      out.push({ label: 'Recovery index', value: word(f), frac: f });
    }
  }
  if (sc?.sleep !== undefined) out.push({ label: 'Sleep', value: word(sc.sleep / 100 + 0.05), frac: sc.sleep / 100 });
  if (sc) {
    const f = clamp(1 - sc.sleepDebtMin / 600, 0.1, 1);
    out.push({ label: 'Sleep balance', value: word(f), frac: f });
    const r = sc.regularity === 'Good' ? 0.8 : sc.regularity === 'Fair' ? 0.6 : 0.4;
    out.push({ label: 'Sleep regularity', value: word(r), frac: r });
  }
  if (i > 0) {
    const p = days[i - 1];
    const f = clamp(p.steps / goal, 0.2, 1);
    out.push({ label: 'Previous day activity', value: word(f), frac: f });
  }
  const week = days.slice(Math.max(0, i - 7), i);
  if (week.length) {
    const f = band(mean(week.map((x) => x.steps)) / goal, 0.7, 1.6, 0.6);
    out.push({ label: 'Activity balance', value: word(f), frac: Math.max(0.1, f) });
  }
  return out;
}

export function sleepParts(d: DayData, b: Baseline): Contributor[] {
  const s = d.sleep;
  if (!s) return [];
  const pct = (m: number) => Math.round((m / s.totalMin) * 100);
  const total = Math.min(1, s.totalMin / (8 * 60));
  const eff = s.totalMin / Math.max(1, s.inBedMin);
  const effF = clamp((eff - 0.65) / 0.3, 0.1, 1);
  const wakeups = (s.stages ?? []).filter((x, k, all) => x.k === 'awake' && k > 0 && k < all.length - 1).length;
  const rest = clamp(1 - s.awakeMin / s.inBedMin - wakeups * 0.02, 0.1, 1);
  const rem = clamp(s.remMin / s.totalMin / 0.22, 0.1, 1);
  const deep = clamp(s.deepMin / s.totalMin / 0.17, 0.1, 1);
  const lat = band(s.latencyMin, 10, 20, 30);
  const timing = b.sleepMid === undefined ? 0.85 : band(Math.abs(midOfSleep(s) - b.sleepMid), 0, 30, 120);
  return [
    { label: 'Total sleep', value: hmText(s.totalMin), frac: total },
    { label: 'Efficiency', value: `${Math.round(eff * 100)}%`, frac: effF },
    { label: 'Restfulness', value: word(rest), frac: rest },
    { label: 'REM sleep', value: `${hmText(s.remMin)}, ${pct(s.remMin)}%`, frac: rem },
    { label: 'Deep sleep', value: `${hmText(s.deepMin)}, ${pct(s.deepMin)}%`, frac: deep },
    { label: 'Latency', value: `${Math.round(s.latencyMin)} min`, frac: Math.max(0.15, lat) },
    { label: 'Timing', value: word(timing), frac: Math.max(0.1, timing) },
  ];
}

export function activityParts(days: DayData[], i: number, goal: number): Contributor[] {
  const d = days[i];
  const { idleMin, alerts } = inactivity(d, d.restingHr ?? baselineFor(days, i).restingHr);
  const week = days.slice(Math.max(0, i - 6), i + 1);
  const met = week.filter((x) => x.steps >= goal).length;
  const trainingDays = week.filter((x) => x.activeCal > 450).length;
  const weekCal = week.reduce((a, x) => a + x.activeCal, 0);
  const restDays = week.filter((x) => x.activeCal < 300).length;
  const idleF = clamp(1 - Math.max(0, idleMin - 300) / 400, 0.1, 1);
  const goalsF = clamp(met / 4 + 0.15, 0.1, 1);
  const freqF = clamp(trainingDays / 3, 0.1, 1);
  const volF = clamp(weekCal / 2800, 0.1, 1);
  const recF = restDays >= 1 || trainingDays < 5 ? 1 : 0.5;
  return [
    { label: 'Stay active', value: `${hmText(idleMin)} inactivity`, frac: idleF },
    { label: 'Move every hour', value: `${alerts} alert${alerts === 1 ? '' : 's'}`, frac: clamp(1 - alerts * 0.15, 0.1, 1) },
    { label: 'Meet daily goals', value: word(goalsF), frac: goalsF },
    { label: 'Training frequency', value: word(freqF), frac: freqF },
    { label: 'Training volume', value: word(volF), frac: volF },
    { label: 'Recovery time', value: word(recF), frac: recF },
  ];
}

/** Median of the last 14 sleep scores, for Sleep Health. */
export function typicalSleep(days: DayData[], scores: Record<string, DayScores>, upTo = days.length): number | undefined {
  const v = days.slice(Math.max(0, upTo - 14), upTo).map((d) => scores[d.date]?.sleep).filter((x): x is number => x !== undefined).sort((a, b) => a - b);
  return v.length ? v[Math.floor(v.length / 2)] : undefined;
}
