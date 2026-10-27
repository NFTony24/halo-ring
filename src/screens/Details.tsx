// The pages behind each score: Readiness, Sleep, Activity, Heart rate, Stress, plus Sleep Health.
// Laid out like her app: score and summary, contributors with bars, key metrics, then charts.
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { colors } from '../theme';
import { Button, Glow, T } from '../ui/kit';
import { Icon, type IconName } from '../ui/Icon';
import { HeartRateChart, StressChart } from '../ui/charts';
import { BodyClock, DebtSlider, Hypnogram, MovementBars, NightLine, TrendLine, WeekBars, stageColor } from '../ui/detailCharts';
import { activityParts, baselineFor, level, readinessParts, sleepParts, typicalSleep, zoneMinutes, type Contributor } from '../data/scores';
import { dayKey, hm, shortDate } from '../data/dates';
import type { DayData, Reading, Snapshot } from '../data/types';
import type { Tag } from '../data/useRingData';

export type DetailKind = 'ready' | 'sleep' | 'act' | 'heart' | 'stress';

type Props = {
  kind: DetailKind;
  snap: Snapshot;
  tags: Tag[];
  onBack: () => void;
  onSwitch: (k: DetailKind) => void;
  onOpen: (screen: 'sleepHealth') => void;
  onAdd: () => void;
  onStepGoal: (goal: number) => void;
};

const titles: Record<DetailKind, string> = { ready: 'Readiness', sleep: 'Sleep', act: 'Activity', heart: 'Heart rate', stress: 'Stress' };
const navIcons: [DetailKind, IconName][] = [
  ['ready', 'sprout'],
  ['sleep', 'moon'],
  ['act', 'flame'],
  ['heart', 'heart'],
  ['stress', 'waves'],
];
const glowFor: Record<DetailKind, string> = { ready: '#20403a', sleep: '#1d3a3a', act: '#203347', heart: '#2a2f45', stress: '#2f2a45' };
const wordColor = (w?: string) => (w === 'Optimal' ? colors.sky : w === 'Good' ? colors.teal : w === 'Fair' ? colors.butter : colors.danger);

export function DetailBar({ title, onBack, close, right }: { title: string; onBack: () => void; close?: boolean; right?: React.ReactNode }) {
  return (
    <View style={st.bar}>
      <Pressable hitSlop={10} onPress={onBack} style={st.barBtn} accessibilityLabel={close ? 'Close' : 'Back'}>
        <Icon name={close ? 'x' : 'back'} />
      </Pressable>
      <T size={19} style={{ flex: 1, textAlign: 'center' }}>
        {title}
      </T>
      <View style={[st.barBtn, { alignItems: 'flex-end' }]}>{right}</View>
    </View>
  );
}

export function DayTabs({ idx, setIdx, labels = ['Yesterday', 'Today'] }: { idx: number; setIdx: (i: number) => void; labels?: string[] }) {
  return (
    <View style={{ flexDirection: 'row', paddingHorizontal: 16 }}>
      {labels.map((label, i) => {
        const v = labels.length - 1 - i;
        const on = idx === v;
        return (
          <Pressable key={label} onPress={() => setIdx(v)} style={[st.tab, on && { borderBottomColor: colors.ink }]}>
            <T size={17} color={on ? colors.ink : colors.ink3}>
              {label}
            </T>
            {i === labels.length - 1 ? <Icon name="cal" size={16} color={on ? colors.ink : colors.ink3} /> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const Caps = ({ children, right }: { children: string; right?: React.ReactNode }) => (
  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
    <T weight="bold" size={12} color={colors.ink2} style={{ letterSpacing: 1.6, flex: 1 }}>
      {children.toUpperCase()}
    </T>
    {right}
  </View>
);

function Box({ children, style }: { children: React.ReactNode; style?: object }) {
  return <View style={[st.box, style]}>{children}</View>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={st.metric}>
      <Caps>{label}</Caps>
      <T size={17} style={{ marginTop: 8 }}>
        {value}
      </T>
    </View>
  );
}

function Contributors({ title = 'Contributors', items }: { title?: string; items: Contributor[] }) {
  return (
    <View style={{ marginTop: 34 }}>
      <T size={24}>{title}</T>
      {items.map((c) => {
                const low = c.frac < 0.55;
        return (
          <View key={c.label} style={{ marginTop: 22 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <T size={17} style={{ flex: 1 }}>
                {c.label}
              </T>
              <T size={17} color={low || c.value === 'Pay attention' || (c.value.includes('bpm') && c.frac < 0.7) ? colors.danger : colors.ink2}>
                {c.value}
              </T>
              <Icon name="chev" size={18} color={colors.ink2} />
            </View>
            <View style={st.track}>
              <View style={[st.fill, { width: `${Math.round(Math.max(0.04, c.frac) * 100)}%` }, low && { backgroundColor: colors.danger }]} />
            </View>
          </View>
        );
      })}
    </View>
  );
}

function ScoreHead({ score, headline, text, crown }: { score?: number; headline: string; text: string; crown?: boolean }) {
  const [more, setMore] = useState(false);
  const l = level(score);
  return (
    <View style={{ marginTop: 22 }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 10 }}>
        <T serif size={64} style={{ lineHeight: 66 }}>
          {score ?? '–'}
        </T>
        {crown ? <Icon name="crown" size={18} color={colors.gold} /> : null}
        <T weight="bold" size={13} color={wordColor(l)} style={{ letterSpacing: 2, marginBottom: 10 }}>
          {l?.toUpperCase()}
        </T>
      </View>
      {headline ? (
        <T serif size={34} style={{ marginTop: 18 }}>
          {headline}
        </T>
      ) : null}
      <T size={16} color={colors.ink2} numberOfLines={more ? undefined : 3} style={{ marginTop: 10 }}>
        {text}
      </T>
      <Pressable onPress={() => setMore((m) => !m)} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 }}>
        <T size={16}>{more ? 'Show less' : 'Show more'}</T>
        <View style={{ transform: [{ rotate: more ? '-90deg' : '90deg' }] }}>
          <Icon name="chev" size={16} />
        </View>
      </Pressable>
    </View>
  );
}

function nightWindow(d: DayData) {
  const s = d.sleep;
  if (!s) return undefined;
  return { from: s.start, to: s.end };
}

function niceTicks(values: number[], step: number, minSpan: number) {
  if (!values.length) return [40, 50, 60, 70, 80];
  let lo = Math.floor(Math.min(...values) / step) * step;
  let hi = Math.ceil(Math.max(...values) / step) * step;
  if (hi - lo < minSpan) hi = lo + minSpan;
  lo = Math.max(0, lo);
  const out: number[] = [];
  for (let v = lo; v <= hi; v += step) out.push(v);
  return out;
}

function NightHr({ d, prev, title = 'Lowest heart rate' }: { d: DayData; prev?: DayData; title?: string }) {
  const w = nightWindow(d);
  if (!w) return null;
  // Bedtime falls on the previous calendar day, so look at both days' readings.
  const pts: Reading[] = [...(prev?.hr ?? []), ...d.hr].filter((s) => s.t >= w.from && s.t <= w.to).map((s) => ({ t: s.t, v: s.bpm }));
  if (!pts.length) return null;
  const low = Math.min(...pts.map((p) => p.v));
  const avg = Math.round(pts.reduce((a, p) => a + p.v, 0) / pts.length);
  return (
    <Box>
      <Caps>{title}</Caps>
      <T size={28} style={{ marginTop: 6 }}>
        {low} bpm
      </T>
      <T size={14} color={colors.ink2}>
        Average {avg} bpm
      </T>
      <NightLine points={pts} from={w.from} to={w.to} ticks={niceTicks(pts.map((p) => p.v), 10, 40)} markLow />
    </Box>
  );
}

function NightHrv({ d }: { d: DayData }) {
  const w = nightWindow(d);
  const pts = (d.hrvSeries ?? []).filter((p) => w && p.t >= w.from && p.t <= w.to);
  if (!w || d.hrvMs === undefined) return null;
  return (
    <Box>
      <Caps>Average HRV</Caps>
      <T size={28} style={{ marginTop: 6 }}>
        {Math.round(d.hrvMs)} ms
      </T>
      {pts.length > 1 ? (
        <>
          <T size={14} color={colors.ink2}>
            Max {Math.max(...pts.map((p) => p.v))} ms
          </T>
          <NightLine points={pts} from={w.from} to={w.to} ticks={niceTicks(pts.map((p) => p.v), 20, 60)} />
        </>
      ) : (
        <T size={14} color={colors.ink2}>
          Your ring shared one overnight average for this night.
        </T>
      )}
    </Box>
  );
}

// ---------- Readiness ----------

function Readiness({ snap, i }: { snap: Snapshot; i: number }) {
  const d = snap.days[i];
  const sc = snap.scores[d.date];
  const parts = readinessParts(snap.days, i, snap.stepGoal, snap.scores);
  const r = sc.readiness;
  const headline = r === undefined ? 'Wear your ring tonight' : r >= 85 ? "You're ready to go" : r >= 70 ? 'Check in with yourself' : 'Take it easy today';
  const weak = parts.filter((p) => p.frac < 0.6).map((p) => p.label.toLowerCase());
  const text =
    r === undefined
      ? 'There is no readiness for this day yet.'
      : weak.length
        ? `Your Readiness Score suggests you're holding steady, but ${weak.join(' and ')} could use some attention. Listen to your body and keep today's plans flexible if you're not feeling your best.`
        : 'Your body has recovered well. Your heart rate, HRV and temperature all look like your normal, so it is a good day to take on whatever you have planned.';
  return (
    <>
      <ScoreHead score={r} headline={headline} text={text} />
      <Contributors items={parts} />
      <T size={24} style={{ marginTop: 40, marginBottom: 14 }}>
        Key metrics
      </T>
      <View style={st.grid}>
        <Metric label="Resting heart rate" value={d.restingHr ? `${Math.round(d.restingHr)} bpm` : '–'} />
        <Metric label="Heart rate variability" value={d.hrvMs ? `${Math.round(d.hrvMs)} ms` : '–'} />
        <Metric label="Body temperature" value={d.tempDeltaC !== undefined ? `${d.tempDeltaC >= 0 ? '+' : ''}${(d.tempDeltaC * 1.8).toFixed(1)}°F` : '–'} />
        <Metric label="Respiratory rate" value={d.respRate ? `${d.respRate.toFixed(1)} /min` : '–'} />
      </View>
      <T size={24} style={{ marginTop: 40, marginBottom: 14 }}>
        Details
      </T>
      <View style={{ gap: 12 }}>
        <NightHr d={d} prev={snap.days[i - 1]} />
        <NightHrv d={d} />
      </View>
    </>
  );
}

// ---------- Sleep ----------

function Sleep({ snap, i, onOpen }: { snap: Snapshot; i: number; onOpen: Props['onOpen'] }) {
  const d = snap.days[i];
  const sc = snap.scores[d.date];
  const b = baselineFor(snap.days, i);
  const s = d.sleep;
  const typical = typicalSleep(snap.days, snap.scores, i + 1);
  const parts = sleepParts(d, b);
  const weak = parts.filter((p) => p.frac < 0.6).map((p) => p.label.toLowerCase());
  const text = !s
    ? 'No sleep was recorded for this night.'
    : weak.length
      ? `Your Sleep Score looks ${level(sc.sleep)?.toLowerCase()}, but ${weak.join(' and ')} pulled it down a little. A steady wind-down routine tonight can help.`
      : 'You got a solid night of rest, with enough deep and REM sleep to help your body and mind recover.';
  const mid = (t: { start: number; end: number }) => {
    const m = new Date((t.start + t.end) / 2);
    let v = m.getHours() * 60 + m.getMinutes();
    if (v > 12 * 60) v -= 24 * 60;
    return v;
  };
  const midDiff = s && b.sleepMid !== undefined ? Math.round(mid(s) - b.sleepMid) : undefined;
  const debtWord = sc.sleepDebtMin > 240 ? 'MODERATE' : sc.sleepDebtMin > 90 ? 'LOW' : 'NONE';
  const stages: [keyof typeof stageColor, string, number][] = s
    ? [
        ['awake', 'Awake', s.awakeMin],
        ['rem', 'REM', s.remMin],
        ['light', 'Light', s.lightMin],
        ['deep', 'Deep sleep', s.deepMin],
      ]
    : [];
  return (
    <>
      <ScoreHead score={sc.sleep} headline={sc.sleep === undefined ? 'No sleep recorded' : 'How do you feel?'} text={text} />
      <Contributors title="Sleep contributors" items={parts} />

      <Pressable onPress={() => onOpen('sleepHealth')} style={[st.box, { marginTop: 34, overflow: 'hidden' }]}>
        <Glow color="#1f4a44" id="sh" y="100%" radius="90%" />
        <T size={20}>Sleep Health</T>
        <T size={15} color={colors.ink2} style={{ marginTop: 4 }}>
          See your long-term sleep and find ways to improve it.
        </T>
        <View style={[st.chip, { marginTop: 14 }]}>
          <T size={14} color={colors.ink2}>
            Typical sleep score: {typical ?? '–'}
          </T>
        </View>
      </Pressable>

      <T size={24} style={{ marginTop: 40, marginBottom: 14 }}>
        Key metrics
      </T>
      <View style={st.grid}>
        <Metric label="Total sleep time" value={s ? hm(s.totalMin) : '–'} />
        <Metric label="Time in bed" value={s ? hm(s.inBedMin) : '–'} />
        <Metric label="Sleep efficiency" value={s ? `${Math.round((s.totalMin / s.inBedMin) * 100)}%` : '–'} />
        <Metric label="Resting heart rate" value={d.restingHr ? `${Math.round(d.restingHr)} bpm` : '–'} />
      </View>

      <View style={{ gap: 12, marginTop: 12 }}>
        <Box>
          <Caps right={<T size={13} color={colors.ink2}>Past 14 days</T>}>Sleep debt</Caps>
          <T size={28} style={{ marginTop: 6 }}>
            {Math.floor(sc.sleepDebtMin / 60)}h {sc.sleepDebtMin % 60}m{'  '}
            <T weight="bold" size={12} color={colors.butter} style={{ letterSpacing: 1.6 }}>
              {debtWord}
            </T>
          </T>
          <DebtSlider min={sc.sleepDebtMin} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
            <T size={13} color={colors.ink2}>None</T>
            <T size={13} color={colors.ink2}>High</T>
          </View>
        </Box>
        <Box>
          <Caps>Body clock</Caps>
          <BodyClock usualMid={b.sleepMid} lastMid={s ? mid(s) : undefined} lastLen={s?.inBedMin} />
          <T size={16} style={{ marginTop: 12 }}>
            {midDiff === undefined
              ? 'Your body clock fills in after a few nights.'
              : Math.abs(midDiff) < 15
                ? 'The midpoint of your sleep lined up with your usual rhythm.'
                : `The midpoint of your sleep was ${Math.abs(midDiff)} min ${midDiff < 0 ? 'ahead' : 'behind'} of your usual rhythm.`}
          </T>
        </Box>
      </View>

      <T size={24} style={{ marginTop: 40, marginBottom: 14 }}>
        Details
      </T>
      <View style={{ gap: 12 }}>
        {s ? (
          <Box>
            <Caps>Time asleep</Caps>
            <T size={28} style={{ marginTop: 6 }}>
              {Math.floor(s.totalMin / 60)} h {Math.round(s.totalMin % 60)} m
            </T>
            <T size={13} color={colors.ink2}>
              Total duration {Math.floor(s.inBedMin / 60)}h {Math.round(s.inBedMin % 60)}m
            </T>
            {s.stages?.length ? <Hypnogram stages={s.stages} from={s.start} to={s.end} /> : null}
            <View style={{ marginTop: 18, gap: 10 }}>
              {stages.map(([k, label, min]) => (
                <View key={k} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={{ width: Math.max(10, (min / s.inBedMin) * 220), height: 7, borderRadius: 4, backgroundColor: stageColor[k] }} />
                  <T size={15}>
                    {label}{' '}
                    <T size={15} color={colors.ink2}>
                      {hm(min)}
                      {k !== 'awake' ? ` ${Math.round((min / s.totalMin) * 100)}%` : ''}
                    </T>
                  </T>
                </View>
              ))}
            </View>
          </Box>
        ) : null}
        {d.spo2 ? (
          <Box>
            <Caps>Average oxygen saturation</Caps>
            <T size={28} style={{ marginTop: 6 }}>
              {Math.round(d.spo2)}
              <T size={14}> %</T>
            </T>
          </Box>
        ) : null}
        <Box>
          <Caps>Nighttime breathing</Caps>
          <T size={28} style={{ marginTop: 6 }}>
            {sc.breathing}
          </T>
          <T size={15} color={colors.ink2} style={{ marginTop: 6 }}>
            {sc.breathing === 'Steady'
              ? 'No significant breathing disturbances were detected. Your breathing stayed steady in your sleep.'
              : 'Your breathing rate moved around more than usual over the last two weeks.'}
            {d.respRate ? ` Average ${d.respRate.toFixed(1)} breaths per minute.` : ''}
          </T>
        </Box>
        <NightHr d={d} prev={snap.days[i - 1]} />
        <NightHrv d={d} />
      </View>
    </>
  );
}

// ---------- Activity ----------

function GoalEditor({ goal, onSave, onClose }: { goal: number; onSave: (g: number) => void; onClose: () => void }) {
  const [g, setG] = useState(goal);
  return (
    <Modal transparent animationType="fade" onRequestClose={onClose}>
      <View style={st.modalWrap}>
        <View style={st.modal}>
          <T serif size={30} style={{ textAlign: 'center' }}>
            Daily step goal
          </T>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 22, marginTop: 20 }}>
            <Pressable onPress={() => setG((v) => Math.max(2000, v - 500))} style={st.round} accessibilityLabel="Lower goal">
              <T size={26}>−</T>
            </Pressable>
            <T size={32}>{g.toLocaleString()}</T>
            <Pressable onPress={() => setG((v) => Math.min(30000, v + 500))} style={st.round} accessibilityLabel="Raise goal">
              <T size={26}>+</T>
            </Pressable>
          </View>
          <Button light label="Save" onPress={() => (onSave(g), onClose())} />
          <Button ghost label="Cancel" onPress={onClose} />
        </View>
      </View>
    </Modal>
  );
}

function Activity({ snap, i, tags, onStepGoal }: { snap: Snapshot; i: number; tags: Tag[]; onStepGoal: Props['onStepGoal'] }) {
  const d = snap.days[i];
  const sc = snap.scores[d.date];
  const [editing, setEditing] = useState(false);
  const parts = activityParts(snap.days, i, snap.stepGoal);
  const resting = d.restingHr ?? snap.baseline.restingHr ?? 60;
  const zones = zoneMinutes(d);
  const activeMin = zones.slice(1).reduce((a, b) => a + b, 0);
  const dayStart = new Date(d.date + 'T00:00:00').getTime();
  const elapsed = Math.min(1, (Math.min(Date.now(), dayStart + 86400000) - dayStart) / 86400000);
  const totalBurn = Math.round(1650 * elapsed + d.activeCal);
  const dayTags = tags.filter((t) => t.kind === 'activity' && t.t >= dayStart && t.t < dayStart + 86400000);

  // This week, Sunday to Saturday: minutes in zones 1-5.
  const sunday = dayStart - new Date(dayStart).getDay() * 86400000;
  const weekDays = Array.from({ length: 7 }, (_, k) => snap.days.find((x) => x.date === dayKey(sunday + k * 86400000 + 3600000)));
  const week = weekDays.map((x) => (x ? zoneMinutes(x).slice(1).reduce((a, b) => a + b, 0) : undefined));
  const weekZones = weekDays.reduce((acc, x) => (x ? zoneMinutes(x).map((v, k) => acc[k] + v) : acc), [0, 0, 0, 0, 0, 0]);
  const savedMin = week.reduce<number>((a, v) => a + (v ?? 0), 0);
  const moveFrom = d.sleep?.end ?? dayStart + 6 * 3600000;

  return (
    <>
      <ScoreHead score={sc.activity} crown={sc.activity >= 85} headline="" text={sc.activity >= 85 ? 'You have been nicely active while still leaving room to recover. Keep it up.' : 'A little more movement spread through the day will lift your score. Even short walks count.'} />
      <Contributors items={parts} />
      <T size={24} style={{ marginTop: 40, marginBottom: 14 }}>
        Key metrics
      </T>
      <View style={st.grid}>
        <Metric label="Goal progress" value={`${d.steps.toLocaleString()} / ${snap.stepGoal.toLocaleString()}`} />
        <Metric label="Total burn" value={`${totalBurn.toLocaleString()} Cal`} />
        <Metric label="Activity time" value={hm(activeMin)} />
        <Metric label="Activity burn" value={`${Math.round(d.activeCal)} Cal`} />
      </View>
      <Button ghost label="Edit activity goal" onPress={() => setEditing(true)} />
      {editing ? <GoalEditor goal={snap.stepGoal} onSave={onStepGoal} onClose={() => setEditing(false)} /> : null}

      <T size={24} style={{ marginTop: 40 }}>
        Activities
      </T>
      {dayTags.length ? (
        dayTags.map((t) => (
          <T key={t.t} size={16} style={{ marginTop: 10 }}>
            {t.text}
          </T>
        ))
      ) : (
        <T size={16} color={colors.ink2} style={{ marginTop: 10 }}>
          You haven't saved any activities {i === snap.days.length - 1 ? 'today' : 'this day'}.
        </T>
      )}

      <View style={{ gap: 12, marginTop: 18 }}>
        <Box>
          <Caps>Daily movement</Caps>
          <MovementBars series={(d.stepSeries ?? []).filter((p) => p.t >= moveFrom - 3600000)} from={Math.min(moveFrom, dayStart + 4 * 3600000)} to={dayStart + 28 * 3600000} />
        </Box>
      </View>

      <T size={24} style={{ marginTop: 40, marginBottom: 14 }}>
        This week
      </T>
      <View style={{ gap: 12 }}>
        <Box>
          <Caps>Saved activity time</Caps>
          <T size={28} style={{ marginTop: 6 }}>
            {hm(savedMin).replace(' min', ' m').replace(' h ', 'h ')}
          </T>
          <T size={14} color={colors.ink2}>
            This week
          </T>
          <WeekBars values={week} />
        </Box>
        <Box>
          <Caps>Weekly zone minutes</Caps>
          {weekZones.map((v, k) => (
            <View key={k} style={{ flexDirection: 'row', gap: 10, alignItems: 'center', marginTop: 10 }}>
              <View style={{ width: 2, height: 14, backgroundColor: ['#ffffff55', '#6cb6f0', '#4fd1b0', '#d8dc8f', '#f0a65a', '#ec6fa6'][k] }} />
              <T size={15}>
                Zone {k}{'  '}
                <T size={15} color={colors.ink2}>
                  {hm(v).replace(' min', ' m')}
                </T>
              </T>
            </View>
          ))}
          <T size={13} color={colors.ink3} style={{ marginTop: 12 }}>
            Based on heart rate. Resting is {Math.round(resting)} bpm.
          </T>
        </Box>
      </View>
    </>
  );
}

// ---------- Heart rate and Stress ----------

function Heart({ snap, i }: { snap: Snapshot; i: number }) {
  const d = snap.days[i];
  const last = d.hr[d.hr.length - 1];
  return (
    <>
      <View style={{ marginTop: 22 }}>
        <T serif size={64} style={{ lineHeight: 66 }}>
          {last ? last.bpm : '–'}
          <T size={18}> bpm</T>
        </T>
        <T size={16} color={colors.ink2} style={{ marginTop: 8 }}>
          Latest reading. Resting heart rate {d.restingHr ? `${Math.round(d.restingHr)} bpm` : 'not available yet'}.
        </T>
      </View>
      <Box style={{ marginTop: 24 }}>
        <Caps>Today</Caps>
        <HeartRateChart samples={d.hr} resting={d.restingHr ?? snap.baseline.restingHr} wakeAt={d.sleep?.end} />
      </Box>
      <View style={{ gap: 12, marginTop: 12 }}>
        <NightHr d={d} prev={snap.days[i - 1]} />
        <NightHrv d={d} />
      </View>
    </>
  );
}

function Stress({ snap, i }: { snap: Snapshot; i: number }) {
  const d = snap.days[i];
  const sc = snap.scores[d.date];
  return (
    <>
      <View style={{ marginTop: 22 }}>
        <T serif size={52} style={{ lineHeight: 56 }}>
          {sc.stressWord}
        </T>
        <T size={16} color={colors.ink2} style={{ marginTop: 8 }}>
          {hm(sc.stressMin)} of high stress while awake. Resilience is {sc.resilience.toLowerCase()}.
        </T>
      </View>
      <Box style={{ marginTop: 24 }}>
        <Caps>Daytime stress</Caps>
        <StressChart samples={d.hr} resting={d.restingHr ?? snap.baseline.restingHr} wakeAt={d.sleep?.end} />
      </Box>
      <View style={[st.grid, { marginTop: 12 }]}>
        <Metric label="High stress" value={hm(sc.stressMin)} />
        <Metric label="Resilience" value={sc.resilience} />
      </View>
    </>
  );
}

// ---------- Shell ----------

export function ScoreDetail({ kind, snap, tags, onBack, onSwitch, onOpen, onAdd, onStepGoal }: Props) {
  const [dayIdx, setDayIdx] = useState(0);
  const i = snap.days.length - 1 - dayIdx;
  return (
    <View style={{ flex: 1 }}>
      <Glow color={glowFor[kind]} id={`dg${kind}`} y="0%" radius="120%" />
      <DetailBar title={titles[kind]} onBack={onBack} right={<Icon name="share" />} />
      <DayTabs idx={dayIdx} setIdx={setDayIdx} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 140 }} key={`${kind}${dayIdx}`}>
        {kind === 'ready' && <Readiness snap={snap} i={i} />}
        {kind === 'sleep' && <Sleep snap={snap} i={i} onOpen={onOpen} />}
        {kind === 'act' && <Activity snap={snap} i={i} tags={tags} onStepGoal={onStepGoal} />}
        {kind === 'heart' && <Heart snap={snap} i={i} />}
        {kind === 'stress' && <Stress snap={snap} i={i} />}
      </ScrollView>
      <View style={st.navWrap} pointerEvents="box-none">
        <View style={st.nav}>
          {navIcons.map(([k, ic]) => (
            <Pressable key={k} onPress={() => onSwitch(k)} style={st.navBtn} accessibilityLabel={titles[k]}>
              <Icon name={ic} size={22} color={k === kind ? colors.ink : colors.ink2} />
              <View style={[st.dot, k === kind && { backgroundColor: colors.ink }]} />
            </Pressable>
          ))}
        </View>
        <Pressable onPress={onAdd} style={st.fab} accessibilityLabel="Add">
          <Icon name="plusSpark" size={28} />
        </Pressable>
      </View>
    </View>
  );
}

// ---------- Sleep Health ----------

export function SleepHealth({ snap, onBack }: { snap: Snapshot; onBack: () => void }) {
  const n = snap.days.length;
  const series: number[] = [];
  const labels: string[] = [];
  for (let k = n - Math.floor((n - 14) / 2) * 2; k <= n; k += 2) {
    const v = typicalSleep(snap.days, snap.scores, k);
    if (v === undefined) continue;
    series.push(v);
    const date = snap.days[k - 1].date;
    labels.push(k === n ? 'Today' : series.length % 7 === 1 && n - k > 8 ? shortDate(date) : '');
  }
  const typical = typicalSleep(snap.days, snap.scores);
  const l = level(typical);
  const good = (typical ?? 0) >= 70;
  return (
    <View style={{ flex: 1 }}>
      <Glow color="#1d3a3a" id="shg" y="0%" radius="120%" />
      <DetailBar title="Sleep Health" onBack={onBack} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 60 }}>
        <T weight="bold" size={13} color={good ? colors.teal : colors.butter} style={{ letterSpacing: 2, marginTop: 18 }}>
          {good ? 'LOOKING GOOD' : 'ROOM TO IMPROVE'}
        </T>
        <T serif size={34} style={{ marginTop: 8 }}>
          {good ? 'Sailing steady, with room to smooth the waters' : 'A few changes could help your nights'}
        </T>
        <T size={16} color={colors.ink2} style={{ marginTop: 12 }}>
          {good ? 'Your sleep is in a good place, with just a few ripples along the way.' : 'Your typical sleep score has been lower lately. A regular bedtime is the easiest place to start.'}
        </T>
        <T size={16} style={{ marginTop: 28 }}>
          Typical Sleep Score
        </T>
        <T size={13} color={colors.ink2}>
          14-day median
        </T>
        <TrendLine values={series} labels={labels} mark={typical ? `Today: ${typical}` : undefined} />
        <T size={24} style={{ marginTop: 34, marginBottom: 14 }}>
          Key metric
        </T>
        <Box>
          <Caps right={<T size={13} color={colors.ink2}>Past 14 days</T>}>Typical sleep score</Caps>
          <T size={28} style={{ marginTop: 6 }}>
            {typical ?? '–'}{' '}
            <T weight="bold" size={12} color={wordColor(l)} style={{ letterSpacing: 1.6 }}>
              {l?.toUpperCase()}
            </T>
          </T>
        </Box>
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8 },
  barBtn: { width: 44, height: 44, justifyContent: 'center' },
  tab: { flex: 1, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  track: { height: 3, borderRadius: 2, backgroundColor: '#ffffff26', marginTop: 10 },
  fill: { height: 3, borderRadius: 2, backgroundColor: colors.cream },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  metric: { width: '48%', flexGrow: 1, backgroundColor: '#ffffff0d', borderRadius: 16, padding: 16 },
  box: { backgroundColor: '#ffffff0d', borderRadius: 20, padding: 18 },
  chip: { alignSelf: 'flex-start', backgroundColor: '#ffffff14', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  navWrap: { position: 'absolute', left: 0, right: 0, bottom: 24, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20 },
  nav: { flex: 1, flexDirection: 'row', justifyContent: 'space-around', backgroundColor: '#2a2a2ef2', borderRadius: 999, paddingVertical: 12, borderWidth: 1, borderColor: '#ffffff12' },
  navBtn: { alignItems: 'center', gap: 6, minWidth: 44 },
  dot: { width: 16, height: 3, borderRadius: 2, backgroundColor: 'transparent' },
  fab: { width: 62, height: 62, borderRadius: 31, backgroundColor: '#34343a', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#ffffff14', elevation: 8 },
  modalWrap: { flex: 1, backgroundColor: '#000b', alignItems: 'center', justifyContent: 'center', padding: 28 },
  modal: { width: '100%', maxWidth: 360, backgroundColor: colors.surface, borderRadius: 28, padding: 24 },
  round: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#ffffff14', alignItems: 'center', justifyContent: 'center' },
});
