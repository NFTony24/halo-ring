import { Platform } from 'react-native';
import {
  getSdkStatus,
  initialize,
  readRecords,
  requestPermission,
  getGrantedPermissions,
  openHealthConnectSettings,
  SdkAvailabilityStatus,
  SleepStageType,
} from 'react-native-health-connect';
import type { DayData, Nap, SleepNight, Stage } from './types';
import { dayKey } from './dates';

const READ_TYPES = [
  'SleepSession',
  'HeartRate',
  'RestingHeartRate',
  'HeartRateVariabilityRmssd',
  'Steps',
  'ActiveCaloriesBurned',
  'OxygenSaturation',
  'RespiratoryRate',
  'SkinTemperature',
  'MenstruationFlow',
] as const;

type ReadType = (typeof READ_TYPES)[number];

export type HcStatus = 'unsupported' | 'needs-install' | 'needs-permission' | 'ready';

export async function healthConnectStatus(): Promise<HcStatus> {
  if (Platform.OS !== 'android') return 'unsupported';
  const sdk = await getSdkStatus();
  if (sdk !== SdkAvailabilityStatus.SDK_AVAILABLE) return 'needs-install';
  await initialize();
  const granted = await getGrantedPermissions();
  const hasSleep = granted.some((p) => p.recordType === 'SleepSession');
  return hasSleep ? 'ready' : 'needs-permission';
}

export async function askForAccess(): Promise<boolean> {
  await initialize();
  const granted = await requestPermission([
    ...READ_TYPES.map((recordType) => ({ accessType: 'read' as const, recordType })),
    { accessType: 'read', recordType: 'ReadHealthDataHistory' },
  ]);
  return granted.some((p) => p.recordType === 'SleepSession');
}

export { openHealthConnectSettings };

async function readAll(type: ReadType, start: Date, end: Date): Promise<any[]> {
  const out: any[] = [];
  let pageToken: string | undefined;
  do {
    try {
      const res = await readRecords(type, {
        timeRangeFilter: { operator: 'between', startTime: start.toISOString(), endTime: end.toISOString() },
        pageSize: 5000,
        pageToken,
      });
      out.push(...res.records);
      pageToken = res.pageToken || undefined;
    } catch {
      // A type she didn't allow (or Oura doesn't write) just comes back empty.
      return out;
    }
  } while (pageToken);
  return out;
}

const ms = (iso: string) => new Date(iso).getTime();
const minutes = (a: number, b: number) => Math.max(0, (b - a) / 60000);

function toSleep(rec: any): SleepNight {
  const start = ms(rec.startTime);
  const end = ms(rec.endTime);
  let deep = 0, rem = 0, light = 0, awake = 0, firstSleep: number | undefined;
  const stages: Stage[] = [];
  for (const s of rec.stages ?? []) {
    const a = ms(s.startTime), b = ms(s.endTime), m = minutes(a, b);
    if (s.stage === SleepStageType.DEEP) (deep += m), stages.push({ s: a, e: b, k: 'deep' });
    else if (s.stage === SleepStageType.REM) (rem += m), stages.push({ s: a, e: b, k: 'rem' });
    else if (s.stage === SleepStageType.LIGHT || s.stage === SleepStageType.SLEEPING) (light += m), stages.push({ s: a, e: b, k: 'light' });
    else if (s.stage === SleepStageType.AWAKE || s.stage === SleepStageType.OUT_OF_BED) (awake += m), stages.push({ s: a, e: b, k: 'awake' });
    if (s.stage !== SleepStageType.AWAKE && s.stage !== SleepStageType.OUT_OF_BED && s.stage !== SleepStageType.UNKNOWN) {
      firstSleep = firstSleep === undefined ? a : Math.min(firstSleep, a);
    }
  }
  const inBed = minutes(start, end);
  const asleep = deep + rem + light || Math.max(0, inBed - awake);
  return {
    start,
    end,
    inBedMin: inBed,
    totalMin: asleep,
    deepMin: deep,
    remMin: rem,
    lightMin: light,
    awakeMin: awake,
    latencyMin: firstSleep ? minutes(start, firstSleep) : 0,
    stages: stages.sort((x, y) => x.s - y.s),
  };
}

/** Reads the last `days` days from Health Connect and groups them by local day. */
export async function readDays(days: number): Promise<DayData[]> {
  await initialize();
  const end = new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - days);
  start.setHours(0, 0, 0, 0);

  const [sleep, hr, rhr, hrv, steps, cal, spo2, resp, temp, flow] = await Promise.all(
    READ_TYPES.map((t) => readAll(t, start, end)),
  );

  const map = new Map<string, DayData>();
  const day = (key: string): DayData => {
    let d = map.get(key);
    if (!d) {
      d = { date: key, naps: [], steps: 0, activeCal: 0, hr: [] };
      map.set(key, d);
    }
    return d;
  };
  for (let t = new Date(start); t <= end; t.setDate(t.getDate() + 1)) day(dayKey(t.getTime()));

  // Main sleep = longest session ending on that day; anything short is a nap.
  for (const rec of sleep) {
    const s = toSleep(rec);
    const d = day(dayKey(s.end));
    if (s.inBedMin < 90) {
      const nap: Nap = { start: s.start, end: s.end, minutes: Math.round(s.totalMin) };
      d.naps.push(nap);
    } else if (!d.sleep || s.inBedMin > d.sleep.inBedMin) {
      d.sleep = s;
    }
  }
  for (const rec of hr) for (const s of rec.samples ?? []) day(dayKey(ms(s.time))).hr.push({ t: ms(s.time), bpm: s.beatsPerMinute });
  for (const rec of rhr) day(dayKey(ms(rec.time))).restingHr = rec.beatsPerMinute;
  const avgInto = (recs: any[], pick: (r: any) => number, set: (d: DayData, v: number) => void) => {
    const acc = new Map<string, number[]>();
    for (const r of recs) {
      const k = dayKey(ms(r.time ?? r.startTime));
      acc.set(k, [...(acc.get(k) ?? []), pick(r)]);
    }
    acc.forEach((vals, k) => set(day(k), vals.reduce((a, b) => a + b, 0) / vals.length));
  };
  avgInto(hrv, (r) => r.heartRateVariabilityMillis, (d, v) => (d.hrvMs = v));
  for (const r of hrv) {
    const d = day(dayKey(ms(r.time)));
    (d.hrvSeries ??= []).push({ t: ms(r.time), v: r.heartRateVariabilityMillis });
  }
  avgInto(spo2, (r) => r.percentage, (d, v) => (d.spo2 = v));
  avgInto(resp, (r) => r.rate, (d, v) => (d.respRate = v));
  for (const rec of temp) {
    const deltas = (rec.deltas ?? []).map((x: any) => x.delta?.inCelsius ?? 0);
    if (deltas.length) day(dayKey(ms(rec.endTime))).tempDeltaC = deltas.reduce((a: number, b: number) => a + b, 0) / deltas.length;
  }
  for (const rec of steps) {
    const d = day(dayKey(ms(rec.endTime)));
    d.steps += rec.count ?? 0;
    (d.stepSeries ??= []).push({ t: ms(rec.startTime), v: rec.count ?? 0 });
  }
  for (const rec of cal) day(dayKey(ms(rec.endTime))).activeCal += rec.energy?.inKilocalories ?? 0;
  for (const rec of flow) day(dayKey(ms(rec.time))).periodLogged = true;

  for (const d of map.values()) {
    d.hr.sort((a, b) => a.t - b.t);
    d.hrvSeries?.sort((a, b) => a.t - b.t);
    d.stepSeries?.sort((a, b) => a.t - b.t);
  }
  return [...map.values()].sort((a, b) => a.date.localeCompare(b.date));
}
