import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { DayScores, Snapshot } from './types';
import { readDays, healthConnectStatus, askForAccess, type HcStatus } from './healthConnect';
import { sampleDays } from './sample';
import { baselineFor, cycleFor, scoreDay, type Calibration } from './scores';
import { dayKey } from './dates';

const KEYS = { periods: 'halo.periodStarts', goal: 'halo.stepGoal', cal: 'halo.calibration', tags: 'halo.tags' };

async function getJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const v = await AsyncStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
}

export type Tag = { t: number; kind: 'tag' | 'activity' | 'meal'; text: string };

export function useRingData() {
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [status, setStatus] = useState<HcStatus | 'loading'>('loading');
  const [tags, setTags] = useState<Tag[]>([]);

  const load = useCallback(async () => {
    const [periods, stepGoal, cal, savedTags] = await Promise.all([
      getJson<string[]>(KEYS.periods, []),
      getJson<number>(KEYS.goal, 10000),
      getJson<Calibration>(KEYS.cal, {}),
      getJson<Tag[]>(KEYS.tags, []),
    ]);
    setTags(savedTags);
    let st: HcStatus;
    try {
      st = await healthConnectStatus();
    } catch {
      st = 'unsupported';
    }
    setStatus(st);
    let days = st === 'ready' ? await readDays(60).catch(() => []) : [];
    const source: Snapshot['source'] = days.some((d) => d.sleep || d.steps) ? 'health-connect' : 'sample';
    if (source === 'sample') days = sampleDays();
    const scores: Record<string, DayScores> = {};
    days.forEach((d, i) => (scores[d.date] = scoreDay(days, i, stepGoal, cal)));
    setSnap({
      source,
      days,
      baseline: baselineFor(days, days.length - 1),
      scores,
      cycle: cycleFor(days, source === 'sample' ? [] : periods),
      stepGoal,
      updatedAt: Date.now(),
    });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const connect = useCallback(async () => {
    await askForAccess().catch(() => false);
    await load();
  }, [load]);

  const logPeriod = useCallback(async () => {
    const periods = await getJson<string[]>(KEYS.periods, []);
    const today = dayKey(Date.now());
    if (!periods.includes(today)) await AsyncStorage.setItem(KEYS.periods, JSON.stringify([...periods, today]));
    await load();
  }, [load]);

  const addTag = useCallback(async (tag: Tag) => {
    const next = [...(await getJson<Tag[]>(KEYS.tags, [])), tag];
    await AsyncStorage.setItem(KEYS.tags, JSON.stringify(next));
    setTags(next);
  }, []);

  const setStepGoal = useCallback(
    async (goal: number) => {
      await AsyncStorage.setItem(KEYS.goal, JSON.stringify(goal));
      await load();
    },
    [load],
  );

  return { snap, status, tags, reload: load, connect, logPeriod, addTag, setStepGoal };
}
