// Made-up days shown before Health Connect is connected, so every screen has something in it.
import type { DayData } from './types';
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
        latencyMin: 8 + r() * 30,
      },
      naps: isToday ? [{ start: now.getTime() - 90 * 60000, end: now.getTime() - 71 * 60000, minutes: 19 }] : [],
      restingHr: Math.round(55 + r() * 5),
      hrvMs: 38 + r() * 14,
      respRate: 14 + r() * 0.8,
      tempDeltaC: (cycleDay > 14 ? 0.15 : -0.15) + (r() - 0.5) * 0.25,
      spo2: 96 + r() * 2,
      steps: isToday ? 13237 : Math.round(7000 + r() * 7000),
      activeCal: Math.round(300 + r() * 400),
      hr,
      periodLogged: cycleDay <= 4,
    });
  }
  return out;
}
