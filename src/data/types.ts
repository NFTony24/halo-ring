// One calendar day of her ring data, keyed by the morning she woke up.
export type HrSample = { t: number; bpm: number }; // t = epoch ms

export type SleepNight = {
  start: number; // epoch ms
  end: number;
  totalMin: number; // time actually asleep
  inBedMin: number;
  deepMin: number;
  remMin: number;
  lightMin: number;
  awakeMin: number;
  latencyMin: number; // in bed until first sleep stage
};

export type Nap = { start: number; end: number; minutes: number };

export type DayData = {
  date: string; // YYYY-MM-DD (local)
  sleep?: SleepNight;
  naps: Nap[];
  restingHr?: number;
  hrvMs?: number; // overnight RMSSD
  respRate?: number;
  tempDeltaC?: number; // skin temperature vs her baseline, from the ring
  spo2?: number;
  steps: number;
  activeCal: number;
  hr: HrSample[];
  periodLogged?: boolean;
};

export type Baseline = {
  restingHr?: number;
  restingHrSd?: number;
  hrvMs?: number;
  hrvSd?: number;
  sleepMid?: number; // minutes after midnight, wraps
  sleepMin?: number;
  respRate?: number;
};

export type Level = 'Optimal' | 'Good' | 'Fair' | 'Pay attention';

export type DayScores = {
  sleep?: number;
  readiness?: number;
  activity: number;
  stressMin: number; // minutes of high daytime stress
  stressWord: 'Relaxed' | 'Restored' | 'Engaged' | 'Stressed';
  resilience: 'Limited' | 'Adequate' | 'Solid' | 'Strong';
  sleepDebtMin: number;
  regularity: 'Good' | 'Fair' | 'Irregular';
  bodyClock: 'Aligned' | 'Ahead' | 'Behind';
  breathing: 'Steady' | 'Variable';
};

export type Cycle = {
  day?: number;
  phase?: 'Menstrual' | 'Follicular' | 'Ovulation' | 'Luteal';
  nextPeriodFrom?: string;
  nextPeriodTo?: string;
  tempSeries: number[]; // last ~16 days of temperature deltas (°F)
};

export type Snapshot = {
  source: 'health-connect' | 'sample';
  days: DayData[]; // oldest -> newest, last item is today
  baseline: Baseline;
  scores: Record<string, DayScores>;
  cycle: Cycle;
  stepGoal: number;
  updatedAt: number;
};
