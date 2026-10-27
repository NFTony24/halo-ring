import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Svg, { Circle, Path, Text as SvgText } from 'react-native-svg';
import { colors } from '../theme';
import { Badge, Button, Card, CardHead, T, s as ks } from '../ui/kit';
import { Icon, type IconName } from '../ui/Icon';
import { HeartRateChart, StressChart, TempBars } from '../ui/charts';
import { level } from '../data/scores';
import { ago, clock, hm, shortDate } from '../data/dates';
import type { Snapshot } from '../data/types';
import type { Tag } from '../data/useRingData';

type Props = {
  snap: Snapshot;
  tags: Tag[];
  onMenu: () => void;
  onDevices: () => void;
  onVitals: (section: string) => void;
  onOpen: (screen: 'ready' | 'sleep' | 'act' | 'heart' | 'stress' | 'cycle') => void;
  onAdd: () => void;
  onLogPeriod: () => void;
  toast: (m: string) => void;
};

const levelColor = (l?: string) => (l === 'Optimal' || l === 'Good' ? colors.teal : l === 'Fair' ? colors.butter : colors.rose);

export function TopBar({ onMenu, onDevices, toast }: Pick<Props, 'onMenu' | 'onDevices' | 'toast'>) {
  return (
    <View style={st.top}>
      <Pressable hitSlop={10} onPress={onMenu} style={st.iconBtn} accessibilityLabel="Menu">
        <Icon name="menu" />
      </Pressable>
      <T size={26} style={{ letterSpacing: 2, flex: 1, textAlign: 'center' }}>
        HALO
      </T>
      <Pressable hitSlop={10} onPress={() => toast('Sharing comes later')} style={st.iconBtn} accessibilityLabel="Share">
        <Icon name="share" />
      </Pressable>
      <Pressable hitSlop={10} onPress={onDevices} style={st.iconBtn} accessibilityLabel="My Devices">
        <Icon name="ring" />
      </Pressable>
    </View>
  );
}

function Pill({ icon, value, label, onPress, small }: { icon: IconName; value: string; label: string; onPress: () => void; small?: boolean }) {
  return (
    <Pressable onPress={onPress} style={{ alignItems: 'center', gap: 10, width: 84 }}>
      <View style={st.pill}>
        <Icon name={icon} size={20} />
        <T size={small ? 19 : 24} weight="medium">
          {value}
        </T>
      </View>
      <T size={15}>{label}</T>
    </Pressable>
  );
}

function BedtimeCard({ snap }: { snap: Snapshot }) {
  // Suggested window: her usual bedtime from the last two weeks, +/- 20 minutes.
  const recent = snap.days.slice(-14).map((d) => d.sleep?.start).filter((v): v is number => !!v);
  const mins = recent.map((t) => {
    const d = new Date(t);
    let m = d.getHours() * 60 + d.getMinutes();
    if (m < 12 * 60) m += 24 * 60;
    return m;
  });
  const avg = mins.length ? mins.reduce((a, b) => a + b, 0) / mins.length : 22 * 60 + 20;
  const fmt = (m: number) => {
    const d = new Date();
    d.setHours(0, Math.round(m / 15) * 15, 0, 0);
    return clock(d.getTime());
  };
  return (
    <Card glow="#262a35">
      <Svg width="100%" height={110} viewBox="0 0 360 120">
        <Path d="M20 112 Q180 -20 340 112" fill="none" stroke="#ffffff40" strokeWidth={2} />
        <Path d="M78 64 Q112 44 150 38" fill="none" stroke={colors.ink} strokeWidth={4} strokeLinecap="round" />
        <Circle cx={122} cy={44} r={7} fill={colors.ink} />
        <SvgText x={6} y={100} fill={colors.ink2} fontSize={12}>9 PM</SvgText>
        <SvgText x={88} y={30} fill={colors.ink2} fontSize={12}>10 PM</SvgText>
        <SvgText x={170} y={18} fill={colors.ink2} fontSize={12}>11 PM</SvgText>
        <SvgText x={282} y={44} fill={colors.ink2} fontSize={12}>12 AM</SvgText>
      </Svg>
      <View style={{ alignItems: 'center' }}>
        <Badge icon="moon" />
        <T weight="bold" size={13} style={{ letterSpacing: 2.4, marginTop: 14 }}>
          BEDTIME
        </T>
        <T serif size={40} style={{ marginVertical: 8, textAlign: 'center' }}>
          {fmt(avg - 20).replace(' PM', '')} – {fmt(avg + 25)}
        </T>
        <T size={17} color={colors.ink2} style={{ textAlign: 'center' }}>
          If you want to prepare yourself for good quality sleep, now's the time to start winding down your body and mind.
        </T>
      </View>
    </Card>
  );
}

export function Today({ snap, tags, onMenu, onDevices, onOpen, onAdd, onLogPeriod, toast }: Props) {
  const today = snap.days[snap.days.length - 1];
  const yest = snap.days[snap.days.length - 2];
  const sc = snap.scores[today.date];
  const ysc = yest ? snap.scores[yest.date] : undefined;
  const [hiddenNaps, setHiddenNaps] = useState<number[]>([]);
  const lastHr = today.hr[today.hr.length - 1];
  const rl = level(sc.readiness);
  const stepPct = Math.round((today.steps / snap.stepGoal) * 100);
  const cyc = snap.cycle;
  const naps = today.naps.filter((n) => !hiddenNaps.includes(n.start));
  const stressH = Math.floor(sc.stressMin / 60);

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 140 }} stickyHeaderIndices={[0]}>
      <View style={{ backgroundColor: colors.bg }}>
        <TopBar onMenu={onMenu} onDevices={onDevices} toast={toast} />
      </View>

      <View style={{ paddingVertical: 16 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 14, paddingHorizontal: 16 }}>
          <Pill icon="sprout" value={`${sc.readiness ?? '–'}`} label="Readiness" onPress={() => onOpen('ready')} />
          <Pill icon="moon" value={`${sc.sleep ?? '–'}`} label="Sleep" onPress={() => onOpen('sleep')} />
          <Pill icon="crown" value={`${sc.activity}`} label="Activity" onPress={() => onOpen('act')} />
          {cyc.day ? <Pill icon="burst" value={`${cyc.day}`} label="Cycle day" onPress={() => onOpen('cycle')} /> : null}
          <Pill icon="heart" value={lastHr ? `${lastHr.bpm}` : '–'} label="Heart rate" onPress={() => onOpen('heart')} />
          <Pill icon="waves" small value={`${stressH}h${sc.stressMin % 60}m`} label="Stress" onPress={() => onOpen('stress')} />
        </ScrollView>
        {snap.source === 'sample' ? (
          <T size={12} color={colors.ink3} style={{ marginLeft: 16, marginTop: 10, letterSpacing: 1.5 }}>
            SAMPLE DATA · CONNECT HEALTH CONNECT IN SETTINGS
          </T>
        ) : null}
      </View>

      <View style={{ paddingHorizontal: 16, gap: 16 }}>
        {naps.map((n) => (
          <Card key={n.start} style={{ borderWidth: 1, borderColor: '#2f3038' }}>
            <View style={ks.row}>
              <Badge icon="bed" bg={colors.cream} color="#1b1b1d" />
              <T size={20} style={{ flex: 1 }}>
                Nap detected
              </T>
              <Pressable hitSlop={10} onPress={() => setHiddenNaps((h) => [...h, n.start])} accessibilityLabel="Dismiss nap">
                <Icon name="x" />
              </Pressable>
            </View>
            <T size={17} color={colors.ink2} style={{ marginTop: 12 }}>
              {clock(n.start)} · {n.minutes} min
            </T>
          </Card>
        ))}

        <BedtimeCard snap={snap} />

        <Card glow="#273848" onPress={() => onOpen('act')}>
          <CardHead icon="flame" title="Activity goal" tag={stepPct >= 100 ? 'Goal reached' : `${stepPct}% of goal`} tagColor={colors.sky} />
          <T size={40} style={{ marginTop: 24 }}>
            {today.steps.toLocaleString()} steps
          </T>
          {stepPct >= 100 ? (
            <T size={17} style={{ marginTop: 14 }}>
              You exceeded your activity goal by {stepPct - 100}%!
            </T>
          ) : null}
          <View style={st.track}>
            <View style={[st.fill, { width: `${Math.min(100, stepPct)}%` }]} />
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 }}>
            <T size={15} color={colors.ink2}>Steps progress</T>
            <T size={15} color={colors.ink2}>{snap.stepGoal}</T>
          </View>
        </Card>

        <Card glow="#273848" onPress={() => onOpen('stress')}>
          <CardHead icon="waves" title="Daytime Stress" tag={sc.stressWord === 'Stressed' ? 'Stressful day' : 'Balanced day'} tagColor="#8ea2ff" extra={lastHr ? ago(lastHr.t) : undefined} />
          <T serif size={38} style={{ marginTop: 26, marginBottom: 12 }}>
            Daily summary
          </T>
          <T size={17}>
            {sc.stressMin > 120
              ? `You've spent ${hm(sc.stressMin)} in a stressed state today. If you can, carve out some time to truly relax before bed.`
              : `Your stress has stayed mostly in the relaxed and engaged zones today. A calm wind-down tonight will help you recharge for tomorrow.`}
          </T>
          <StressChart samples={today.hr} resting={today.restingHr ?? snap.baseline.restingHr} wakeAt={today.sleep?.end} />
        </Card>

        {cyc.day ? (
          <Card glow="#3b3550" onPress={() => onOpen('cycle')}>
            <CardHead icon="uterus" title="Cycle Insights" tag={`${cyc.phase} phase`} tagColor={colors.lilac} />
            <T serif size={38} style={{ marginTop: 26, marginBottom: 12 }}>
              Cycle day {cyc.day}
            </T>
            <T size={17}>{phaseText(cyc.phase)}</T>
            {cyc.nextPeriodFrom && snap.predictions ? (
              <T size={17} color={colors.lilac} style={{ marginTop: 14 }}>
                Estimated period start {shortDate(cyc.nextPeriodFrom)} – {shortDate(cyc.nextPeriodTo!)}
              </T>
            ) : null}
            <TempBars series={cyc.tempSeries} lutealFrom={Math.max(0, cyc.tempSeries.length - Math.max(0, cyc.day - 14))} />
            <Button icon="drop" label="Log period" onPress={onLogPeriod} />
            <Button ghost icon="plus" label="Add a tag" onPress={onAdd} />
          </Card>
        ) : (
          <Card glow="#3b3550">
            <CardHead icon="uterus" title="Cycle Insights" />
            <T size={17} style={{ marginTop: 18 }}>
              Log the first day of your next period and cycle tracking starts from there.
            </T>
            <Button icon="drop" label="Log period" onPress={onLogPeriod} />
          </Card>
        )}

        <Card glow="#273848" onPress={() => onOpen('heart')}>
          <CardHead icon="heart" title="Heart rate" tag={lastHr ? ago(lastHr.t) : 'No reading yet'} tagColor={colors.sky} />
          <T size={40} style={{ marginTop: 24 }}>
            {lastHr ? `${lastHr.bpm} bpm` : '–'}
          </T>
          <HeartRateChart samples={today.hr} resting={today.restingHr ?? snap.baseline.restingHr} wakeAt={today.sleep?.end} />
        </Card>

        <Card glow="#1f3a37" onPress={() => onOpen('ready')}>
          <CardHead icon="sprout" title="Readiness" tag={rl} tagColor={levelColor(rl)} />
          <T size={64} style={{ marginTop: 28, lineHeight: 70 }}>
            {sc.readiness ?? '–'}
          </T>
          <T serif size={38} style={{ marginTop: 20, marginBottom: 12 }}>
            {readinessHeadline(sc.readiness)}
          </T>
          <T size={17}>{readinessText(snap)}</T>
        </Card>

        {/* Timeline */}
        <View style={{ marginTop: 22 }}>
          <T size={28}>Timeline</T>
          <T size={17} color={colors.ink2} style={{ marginTop: 4 }}>
            Your recent events
          </T>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, marginTop: 18 }}>
            <Pressable onPress={onAdd} style={[st.chip, { backgroundColor: '#ffffff1f', width: 44, paddingHorizontal: 0, justifyContent: 'center' }]}>
              <Icon name="plus" />
            </Pressable>
            {(
              [
                ['tag', 'Add a tag'],
                ['flame', 'Add an activity'],
                ['fork', 'Log a meal'],
              ] as [IconName, string][]
            ).map(([ic, label]) => (
              <Pressable key={label} onPress={onAdd} style={st.chip}>
                <Icon name={ic} size={20} color="#1b1b1d" />
                <T weight="medium" color="#1b1b1d">
                  {label}
                </T>
              </Pressable>
            ))}
          </ScrollView>
          <View style={{ marginTop: 20, paddingLeft: 58 }}>
            <View style={st.rail} />
            {tags
              .filter((t) => t.t > new Date().setHours(0, 0, 0, 0))
              .reverse()
              .map((t) => (
                <Event key={t.t} icon={t.kind === 'meal' ? 'fork' : t.kind === 'activity' ? 'flame' : 'tag'} time={clock(t.t)} title={t.text} />
              ))}
            {today.sleep ? (
              <Event icon="sunrise" time={clock(today.sleep.end)} title="Woke up" meta={[['bed', hm(today.sleep.totalMin)], ['sprout', `${sc.readiness ?? '–'}`], ['moon', `${sc.sleep ?? '–'}`]]} />
            ) : null}
            {yest && ysc ? (
              <View style={{ marginLeft: -58, marginBottom: 22 }}>
                <T size={24}>Yesterday</T>
                <Meta items={[['sprout', `${ysc.readiness ?? '–'}`], ['moon', `${ysc.sleep ?? '–'}`], ['flame', `${ysc.activity}`], ...(cyc.day ? ([['burst', `${cyc.day - 1}`]] as [IconName, string][]) : [])]} />
              </View>
            ) : null}
            {today.sleep ? <Event icon="bed" time={clock(today.sleep.start + today.sleep.latencyMin * 60000)} title="Fell asleep" meta={[['timer', `${Math.round(today.sleep.latencyMin)} min latency`]]} /> : null}
            {yest?.sleep && ysc ? (
              <Event icon="sunrise" time={clock(yest.sleep.end)} title="Woke up" meta={[['bed', hm(yest.sleep.totalMin)], ['sprout', `${ysc.readiness ?? '–'}`], ['moon', `${ysc.sleep ?? '–'}`]]} />
            ) : null}
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

function Meta({ items }: { items: [IconName, string][] }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginTop: 6 }}>
      {items.map(([ic, v]) => (
        <View key={ic + v} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Icon name={ic} size={18} color={colors.ink2} fill={ic === 'burst' ? colors.ink2 : undefined} />
          <T size={17} color={colors.ink2}>
            {v}
          </T>
        </View>
      ))}
    </View>
  );
}

function Event({ icon, time, title, meta }: { icon: IconName; time: string; title: string; meta?: [IconName, string][] }) {
  return (
    <View style={{ marginBottom: 22 }}>
      <View style={st.node}>
        <Icon name={icon} size={20} />
      </View>
      <T color={colors.ink2} style={{ marginBottom: 10 }}>
        {time}
      </T>
      <View style={{ backgroundColor: colors.surface, borderRadius: 18, padding: 18 }}>
        <T weight="bold" size={18}>
          {title}
        </T>
        {meta ? <Meta items={meta} /> : null}
      </View>
    </View>
  );
}

function phaseText(p?: string) {
  switch (p) {
    case 'Menstrual':
      return 'Your period has started. Energy can dip in the first few days, so go easy and prioritize rest.';
    case 'Follicular':
      return 'Hormone levels are rising, and many people feel more energetic and social in this phase.';
    case 'Ovulation':
      return 'You are around ovulation. Your temperature typically rises slightly in the days after.';
    default:
      return "It's common to have mood swings when your period is approaching. They're caused by variation in your hormonal levels, so be kind to yourself and remember that emotions come and go.";
  }
}

function readinessHeadline(r?: number) {
  if (r === undefined) return 'Wear your ring tonight';
  if (r >= 85) return "You're ready to go";
  if (r >= 70) return 'Check in with yourself';
  return 'Take it easy today';
}

function readinessText(snap: Snapshot) {
  const d = snap.days[snap.days.length - 1];
  const b = snap.baseline;
  const bits: string[] = [];
  if (d.hrvMs && b.hrvMs) bits.push(d.hrvMs >= b.hrvMs ? 'your HRV is at or above your normal' : 'your HRV is below your normal');
  if (d.restingHr && b.restingHr) bits.push(d.restingHr <= b.restingHr + 1 ? 'your resting heart rate is where it usually is' : 'your resting heart rate is a little elevated');
  if (d.tempDeltaC !== undefined && Math.abs(d.tempDeltaC) > 0.4) bits.push('your temperature is off your usual range');
  if (!bits.length) return 'Your readiness reflects last night’s sleep and how your body has been recovering.';
  const txt = bits.join(', and ');
  return txt.charAt(0).toUpperCase() + txt.slice(1) + '.';
}

const st = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10 },
  iconBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  pill: { width: 84, height: 84, borderRadius: 42, backgroundColor: '#1d1f25', borderWidth: 1, borderColor: '#2f3139', alignItems: 'center', justifyContent: 'center', gap: 2 },
  track: { height: 4, borderRadius: 4, backgroundColor: '#ffffff26', marginTop: 28 },
  fill: { height: 4, borderRadius: 4, backgroundColor: colors.cream },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.cream, borderRadius: 999, paddingHorizontal: 18, height: 44 },
  rail: { position: 'absolute', left: 21, top: 0, bottom: 0, width: 1, backgroundColor: colors.line },
  node: { position: 'absolute', left: -58, top: -4, width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center' },
});
