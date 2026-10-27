// Made-up days shown before Health Connect is connected, so every screen has something in it.
import type { DayData, Reading, Stage } from './types';
import { dayKey } from './dates';

function rng(seed: number) {
  return () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
}

export function sampleDays(n = 45): DayData[] {
  const r = rng(42);
  const out: DayData[] = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const bed = new Date(day.getTime() - (2.9 + r() * 1.2) * 3600000); // ~8:50-10:00 PM the night before
    const totalMin = 440 + r() * 60;
    const awake = 20 + r() * 30;
    const end = bed.getTime() + (totalMin + awake + 15) * 60000;
    const hr: DayData['hr'] = [];
    const isToday = i === 0;
    const until = isToday ? now.getTime() : day.getTime() + 24 * 3600000;
    for (let t = day.getTime(); t < until; t += 5 * 60000) {
      const h = new Date(t).getHours();
      const asleep = t < end;
      const base = asleep ? 56 : 70 + 10 * Math.sin((h - 9) / 3);
      const spike = !asleep && r() > 0.93 ? 30 + r() * 25 : 0;
      hr.push({ t, bpm: Math.round(base + spike + (r() - 0.5) * 8) });
    }
    // Sleep stages in ~90 minute cycles: deep early in the night, more REM toward morning.
    const stages: Stage[] = [];
    const latency = 8 + r() * 30;
    let t = bed.getTime();
    const push = (k: Stage['k'], min: number) => {
      const e = Math.min(end, t + min * 60000);
      if (e > t) stages.push({ s: t, e, k });
      t = e;
    };
    push('awake', latency);
    for (let c = 0; t < end; c++) {
      push('light', 20 + r() * 25);
      push('deep', Math.max(4, 40 - c * 10 + r() * 10));
      push('light', 10 + r() * 15);
      push('rem', 8 + c * 6 + r() * 8);
      if (r() > 0.6) push('awake', 2 + r() * 6);
    }
    const hrvSeries: Reading[] = [];
    for (let h = bed.getTime(); h < end; h += 5 * 60000) hrvSeries.push({ t: h, v: Math.round(18 + r() * 14 + (r() > 0.92 ? 18 : 0)) });
    const stepSeries: Reading[] = [];
    for (let h = end; h < until; h += 15 * 60000) {
      const hr24 = new Date(h).getHours();
      if (hr24 < 21) stepSeries.push({ t: h, v: Math.round(r() > 0.5 ? r() * 900 : r() * 120) });
    }
    const cycleDay = (n - i + 8) % 28;
    out.push({
      date: dayKey(day.getTime()),
      sleep: {
        start: bed.getTime(),
        end,
        inBedMin: totalMin + awake + 15,
        totalMin,
        deepMin: totalMin * (0.13 + r() * 0.08),
        remMin: totalMin * (0.18 + r() * 0.08),
        lightMin: totalMin * 0.55,
        awakeMin: awake,
        latencyMin: latency,
        stages,
      },
      naps: isToday ? [{ start: now.getTime() - 90 * 60000, end: now.getTime() - 71 * 60000, minutes: 19 }] : [],
      restingHr: Math.round(55 + r() * 5),
      hrvMs: hrvSeries.reduce((a, x) => a + x.v, 0) / hrvSeries.length,
      respRate: 14 + r() * 0.8,
      tempDeltaC: (cycleDay > 14 ? 0.15 : -0.15) + (r() - 0.5) * 0.25,
      spo2: 96 + r() * 2,
      steps: isToday ? 13237 : Math.round(7000 + r() * 7000),
      activeCal: Math.round(300 + r() * 400),
      hr,
      hrvSeries,
      stepSeries,
      periodLogged: cycleDay <= 4,
    });
  }
  return out;
}
