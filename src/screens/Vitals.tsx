import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View, type ScrollViewInstance } from 'react-native';
import { colors } from '../theme';
import { Glow, T } from '../ui/kit';
import { Icon, type IconName } from '../ui/Icon';
import { Spark } from '../ui/charts';
import { level } from '../data/scores';
import type { Snapshot } from '../data/types';

const levelColor = (l?: string) => (l === 'Optimal' ? colors.sky : l === 'Good' ? colors.teal : l === 'Fair' ? colors.butter : colors.rose);

function Tile({ title, sub, subColor, children, glow, id, spark, sparkColor, onPress }: { title: string; sub?: string; subColor?: string; children: React.ReactNode; glow?: string; id: string; spark?: number[]; sparkColor?: string; onPress?: () => void }) {
  return (
    <Pressable style={st.tile} onPress={onPress} disabled={!onPress}>
      {glow ? <Glow color={glow} id={id} y="45%" radius="60%" /> : null}
      <View>
        <T size={15} color={colors.ink2}>
          {title}
        </T>
        {sub ? (
          <T size={15} color={subColor ?? colors.ink2} style={{ marginTop: 4 }} numberOfLines={1}>
            {sub}
          </T>
        ) : null}
      </View>
      {spark && spark.length > 1 ? <Spark values={spark} color={sparkColor ?? colors.teal} style={{ marginHorizontal: -18 }} /> : null}
      {children}
    </Pressable>
  );
}

const Big = ({ children, unit }: { children: React.ReactNode; unit?: string }) => (
  <T size={40} style={{ lineHeight: 46 }}>
    {children}
    {unit ? <T size={16}>{unit}</T> : null}
  </T>
);
const Word = ({ children }: { children: string }) => (
  <T size={30} style={{ lineHeight: 36 }}>
    {children}
  </T>
);

function Section({ icon, title, onLayout }: { icon: IconName; title: string; onLayout?: (y: number) => void }) {
  return (
    <View onLayout={(e) => onLayout?.(e.nativeEvent.layout.y)} style={st.sect}>
      <Icon name={icon} size={22} />
      <T size={26}>{title}</T>
    </View>
  );
}

export function Vitals({ snap, focus, onOpen }: { snap: Snapshot; focus?: string; onOpen: (screen: string) => void }) {
  const [dayIdx, setDayIdx] = useState(0); // 0 = today, 1 = yesterday
  const scroll = useRef<ScrollViewInstance>(null);
  const pos = useRef<Record<string, number>>({});
  const d = snap.days[snap.days.length - 1 - dayIdx];
  const sc = snap.scores[d.date];
  const last14 = snap.days.slice(-14 - dayIdx, snap.days.length - dayIdx);
  const series = (f: (x: (typeof snap.days)[number]) => number | undefined) => last14.map(f).filter((v): v is number => v !== undefined);

  useEffect(() => {
    if (!focus) return;
    const t = setTimeout(() => scroll.current?.scrollTo({ y: Math.max(0, (pos.current[focus] ?? 0) - 10), animated: true }), 80);
    return () => clearTimeout(t);
  }, [focus]);

  const mark = (k: string) => (y: number) => (pos.current[k] = y);
  const rl = level(sc.readiness);
  const sl = level(sc.sleep);
  const al = level(sc.activity);
  const stepPct = Math.round((d.steps / snap.stepGoal) * 100);
  const debtH = Math.floor(sc.sleepDebtMin / 60);
  const avgStress = last14.reduce((a, x) => a + (snap.scores[x.date]?.stressMin ?? 0), 0) / Math.max(1, last14.length);
  const cumulative = avgStress < 30 ? 'Low' : avgStress < 90 ? 'Moderate' : 'High';
  const stressIdx = ['Restored', 'Relaxed', 'Engaged', 'Stressed'].indexOf(sc.stressWord) + 1;

  return (
    <View style={{ flex: 1 }}>
      <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
        <T size={19} style={{ textAlign: 'center' }}>
          Vitals
        </T>
        <View style={{ flexDirection: 'row', marginTop: 14 }}>
          {['Yesterday', 'Today'].map((label, i) => {
            const idx = 1 - i;
            const on = dayIdx === idx;
            return (
              <Pressable key={label} onPress={() => setDayIdx(idx)} style={[st.tab, on && { borderBottomColor: colors.ink }]}>
                <T size={18} color={on ? colors.ink : colors.ink3}>
                  {label}
                </T>
                {label === 'Today' ? <Icon name="cal" size={18} color={on ? colors.ink : colors.ink3} /> : null}
              </Pressable>
            );
          })}
        </View>
      </View>
      <ScrollView ref={scroll} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 140 }}>
        <Section icon="sprout" title="Readiness" onLayout={mark('ready')} />
        <View style={st.grid}>
          <Tile onPress={() => onOpen('ready')} id="r" title="Readiness Score" sub={rl} subColor={levelColor(rl)} glow="#1f3532">
            <Big>{sc.readiness ?? '–'}</Big>
          </Tile>
          <Tile onPress={() => onOpen('ready')} id="rhr" title="Resting heart rate" sub="vs your normal" spark={series((x) => x.restingHr)} sparkColor={colors.rose}>
            <Big unit=" bpm">{d.restingHr ?? '–'}</Big>
          </Tile>
          <Tile onPress={() => onOpen('ready')} id="hrv" title="HRV balance" sub={snap.baseline.hrvMs ? `Normal ${Math.round(snap.baseline.hrvMs)} ms` : undefined} spark={series((x) => x.hrvMs)}>
            <Big unit=" ms">{d.hrvMs ? Math.round(d.hrvMs) : '–'}</Big>
          </Tile>
          <Tile onPress={() => onOpen('ready')} id="tmp" title="Body temperature" sub="vs your normal" spark={series((x) => x.tempDeltaC)} sparkColor={colors.butter}>
            <Big unit="°F">{d.tempDeltaC !== undefined ? `${d.tempDeltaC >= 0 ? '+' : ''}${(d.tempDeltaC * 1.8).toFixed(1)}` : '–'}</Big>
          </Tile>
        </View>

        <Section icon="moon" title="Sleep" onLayout={mark('sleep')} />
        <View style={st.grid}>
          <Tile onPress={() => onOpen('sleep')} id="s" title="Sleep Score" sub={sl} subColor={levelColor(sl)} glow="#1f3532">
            <Big>{sc.sleep ?? '–'}</Big>
          </Tile>
          <Tile onPress={() => onOpen('sleep')} id="bc" title="Body Clock">
            <Word>{sc.bodyClock}</Word>
          </Tile>
          <Tile onPress={() => onOpen('sleep')} id="reg" title="Sleep regularity" spark={series((x) => (x.sleep ? x.sleep.start % 86400000 : undefined))}>
            <Word>{sc.regularity}</Word>
          </Tile>
          <Tile onPress={() => onOpen('sleep')} id="debt" title="Sleep debt" sub={sc.sleepDebtMin > 240 ? 'High' : sc.sleepDebtMin > 90 ? 'Moderate' : 'Low'} subColor={colors.butter} spark={series((x) => (x.sleep ? 480 - x.sleep.totalMin : undefined))} sparkColor={colors.butter}>
            <Big>
              {debtH}
              <T size={16}>h </T>
              {sc.sleepDebtMin % 60}
              <T size={16}>m</T>
            </Big>
          </Tile>
          <Tile onPress={() => onOpen('sleep')} id="br" title="Nighttime Breathing" sub={d.respRate ? `${d.respRate.toFixed(1)} breaths/min` : undefined}>
            <Word>{sc.breathing}</Word>
          </Tile>
        </View>

        <Section icon="flame" title="Activity" onLayout={mark('act')} />
        <View style={st.grid}>
          <Tile onPress={() => onOpen('act')} id="a" title="Activity Score" sub={al} subColor={colors.sky}>
            <Big>{sc.activity}</Big>
          </Tile>
          <Tile onPress={() => onOpen('act')} id="g" title="Activity goal" sub={`${d.steps.toLocaleString()} / ${snap.stepGoal.toLocaleString()} steps`} subColor={colors.sky}>
            <View style={st.goal}>
              <View style={[st.goalFill, { width: `${Math.min(100, stepPct)}%` }]} />
            </View>
            <Big unit="%">{stepPct}</Big>
          </Tile>
        </View>

        <Section icon="waves" title="Stress" onLayout={mark('stress')} />
        <View style={st.grid}>
          <Tile onPress={() => onOpen('stress')} id="ds" title="Daytime Stress" sub={`${Math.floor(sc.stressMin / 60)}h ${sc.stressMin % 60}m high`} glow="#33283f">
            <View style={{ flexDirection: 'row', gap: 6, marginBottom: 12 }}>
              {[1, 2, 3, 4, 5].map((k) => (
                <View key={k} style={[st.seg, k === stressIdx + 1 && { backgroundColor: colors.lilac }]} />
              ))}
            </View>
            <Word>{sc.stressWord}</Word>
          </Tile>
          <Tile onPress={() => onOpen('stress')} id="res" title="Resilience" spark={series((x) => x.hrvMs)}>
            <Word>{sc.resilience}</Word>
          </Tile>
          <Tile onPress={() => onOpen('stress')} id="cum" title="Cumulative Stress" spark={series((x) => snap.scores[x.date]?.stressMin)} sparkColor={colors.butter}>
            <Word>{cumulative}</Word>
          </Tile>
        </View>

        {snap.cycle.day ? (
          <>
            <Section icon="uterus" title="Women's Health" onLayout={mark('women')} />
            <View style={st.grid}>
              <Tile onPress={() => onOpen('cycle')} id="cy" title="Cycle day" sub={`${snap.cycle.phase} phase`} subColor={colors.lilac} glow="#2d2a3d">
                <Big>{snap.cycle.day - dayIdx}</Big>
              </Tile>
            </View>
          </>
        ) : null}

        <Section icon="heartPlus" title="Heart Health" onLayout={mark('heart')} />
        <View style={st.grid}>
          <Tile onPress={() => onOpen('heart')} id="hr" title="Lowest heart rate" sub="Last night">
            <Big unit=" bpm">{d.hr.length ? Math.min(...d.hr.filter((s) => !d.sleep || s.t <= d.sleep.end).map((s) => s.bpm)) : '–'}</Big>
          </Tile>
          <Tile onPress={() => onOpen('sleep')} id="o2" title="Blood oxygen" sub="Overnight average">
            <Big unit="%">{d.spo2 ? Math.round(d.spo2) : '–'}</Big>
          </Tile>
        </View>
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  tab: { flex: 1, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  sect: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 34, marginBottom: 16 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  tile: { width: '48%', flexGrow: 1, maxWidth: '49%', minHeight: 200, backgroundColor: colors.surface, borderRadius: 24, padding: 18, justifyContent: 'space-between', overflow: 'hidden' },
  seg: { flex: 1, height: 4, borderRadius: 3, backgroundColor: '#ffffff2a' },
  goal: { height: 4, borderRadius: 4, backgroundColor: '#ffffff26', marginBottom: 18 },
  goalFill: { height: 4, borderRadius: 4, backgroundColor: colors.sky },
});
