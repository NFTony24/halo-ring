// Cycle Insights and Cycle History, laid out like her app.
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { colors } from '../theme';
import { Button, Glow, T } from '../ui/kit';
import { Icon, type IconName } from '../ui/Icon';
import { TempHistory } from '../ui/detailCharts';
import { addDays, daysBetween, dayKey, shortDate } from '../data/dates';
import type { Snapshot } from '../data/types';
import { DetailBar } from './Details';

const Caps = ({ children, color = colors.ink2 }: { children: string; color?: string }) => (
  <T weight="bold" size={12} color={color} style={{ letterSpacing: 1.6 }}>
    {children.toUpperCase()}
  </T>
);

function Row({ icon, label, value, right, tint, more }: { icon: IconName; label: string; value: string; right?: React.ReactNode; tint?: string; more?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <Pressable style={st.rowWrap} onPress={more ? () => setOpen((o) => !o) : undefined} disabled={!more}>
      <View style={st.row}>
        <Icon name={icon} size={20} color={tint ?? colors.ink2} fill={icon === 'burst' ? tint : undefined} />
        <View style={{ flex: 1 }}>
          <Caps>{label}</Caps>
          <T size={16} style={{ marginTop: 4 }}>
            {value}
          </T>
        </View>
        {right}
        {more ? (
          <View style={{ transform: [{ rotate: open ? '-90deg' : '90deg' }] }}>
            <Icon name="chev" size={18} color={colors.ink2} />
          </View>
        ) : null}
      </View>
      {open && more ? (
        <T size={15} color={colors.ink2} style={{ marginTop: 12 }}>
          {more}
        </T>
      ) : null}
    </Pressable>
  );
}

/** Month view: logged period days filled, predicted days dashed, today in cream. */
function CalendarSheet({ snap, onClose }: { snap: Snapshot; onClose: () => void }) {
  const c = snap.cycle;
  const today = dayKey(Date.now());
  const logged = new Set<string>(snap.days.filter((d) => d.periodLogged).map((d) => d.date));
  for (const st0 of c.starts ?? []) for (let k = 0; k < (c.periodLen ?? 5); k++) logged.add(addDays(st0, k));
  const predicted = (k: string) => !!c.nextPeriodFrom && k >= c.nextPeriodFrom && k <= c.nextPeriodTo!;
  const now = new Date();
  const months = [-1, 0, 1].map((m) => new Date(now.getFullYear(), now.getMonth() + m, 1));
  return (
    <Modal animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <DetailBar title="Calendar" onBack={onClose} close />
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60 }}>
          {months.map((m0) => {
            const first = (m0.getDay() + 6) % 7;
            const len = new Date(m0.getFullYear(), m0.getMonth() + 1, 0).getDate();
            const cells = [...Array(first).fill(null), ...Array.from({ length: len }, (_, k) => dayKey(new Date(m0.getFullYear(), m0.getMonth(), k + 1).getTime()))];
            return (
              <View key={m0.getTime()} style={{ marginBottom: 28 }}>
                <T size={20} style={{ marginBottom: 12 }}>
                  {m0.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </T>
                <View style={st.week}>
                  {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, k) => (
                    <T key={k} size={12} color={colors.ink2} style={st.cellText}>
                      {d}
                    </T>
                  ))}
                </View>
                <View style={st.grid}>
                  {cells.map((k, n) =>
                    k ? (
                      <View key={k} style={st.cell}>
                        <View style={[st.day, logged.has(k) && { backgroundColor: '#e0605a' }, predicted(k) && !logged.has(k) && st.dash, k === today && { backgroundColor: colors.cream }]}>
                          <T size={14} color={k === today ? '#1b1b1d' : predicted(k) && !logged.has(k) ? '#e0605a' : colors.ink}>
                            {Number(k.slice(8))}
                          </T>
                        </View>
                      </View>
                    ) : (
                      <View key={`b${n}`} style={st.cell} />
                    ),
                  )}
                </View>
              </View>
            );
          })}
          <View style={{ flexDirection: 'row', gap: 18, justifyContent: 'center' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={[st.dot, { backgroundColor: '#e0605a' }]} />
              <T size={13} color={colors.ink2}>Period</T>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={[st.dot, st.dash]} />
              <T size={13} color={colors.ink2}>Predicted</T>
            </View>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

function Stat({ label, value, unit, regular }: { label: string; value: string; unit: string; regular: boolean }) {
  return (
    <View style={st.box}>
      <Caps>{label}</Caps>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
        <T size={26} style={{ flex: 1 }}>
          {value}
          <T size={13}> {unit}</T>
        </T>
        <View style={st.reg}>
          <T size={13}>{regular ? 'Regular' : 'Irregular'}</T>
          <Icon name="check" size={14} />
        </View>
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

export function CycleInsights({ snap, onBack, onHistory, onLogPeriod, onAdd }: { snap: Snapshot; onBack: () => void; onHistory: () => void; onLogPeriod: () => void; onAdd: () => void }) {
  const c = snap.cycle;
  const today = dayKey(Date.now());
  const temps = snap.days.slice(-30).map((d) => (d.tempDeltaC ?? 0) * 1.8);
  const predicted = c.nextPeriodFrom ? addDays(c.nextPeriodFrom, 2) : undefined;
  const inDays = predicted ? daysBetween(today, predicted) : undefined;
  // Mon-Sun row for the week of the predicted start (or this week).
  const anchor = new Date();
  const monday = addDays(today, -((anchor.getDay() + 6) % 7));
  const week = Array.from({ length: 7 }, (_, k) => addDays(monday, k));
  const inWindow = (k: string) => !!c.nextPeriodFrom && k >= c.nextPeriodFrom && k <= c.nextPeriodTo!;
  const loggedToday = snap.days[snap.days.length - 1]?.periodLogged;
  const ovu = c.avgLen ? c.avgLen - 14 : 14;
  const [cal, setCal] = useState(false);
  const conception = c.day && Math.abs(c.day - ovu) <= 3 ? 'High' : c.day && Math.abs(c.day - ovu) <= 5 ? 'Medium' : 'Low';

  return (
    <View style={{ flex: 1 }}>
      <Glow color="#2e2a45" id="cyg" y="0%" radius="130%" />
      <DetailBar title="Cycle Insights" onBack={onBack} close right={<Icon name="info" />} />
      {cal ? <CalendarSheet snap={snap} onClose={() => setCal(false)} /> : null}
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 60 }}>
        {c.day ? (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginTop: 18 }}>
              <T serif size={64} style={{ lineHeight: 66 }}>
                {c.day}
              </T>
              <Icon name="burst" size={14} color={colors.lilac} />
              <T weight="bold" size={13} color={colors.sky} style={{ letterSpacing: 2, marginBottom: 10 }}>
                CYCLE DAY
              </T>
            </View>
            <T size={16} color={colors.ink2} style={{ marginTop: 12 }}>
              {phaseText(c.phase)}
            </T>
          </>
        ) : (
          <T serif size={34} style={{ marginTop: 18 }}>
            Log your next period to start tracking
          </T>
        )}
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Button light icon="drop" label="Log period" onPress={onLogPeriod} />
          </View>
          <View style={{ flex: 1 }}>
            <Button icon="tag" label="Add a tag" onPress={onAdd} />
          </View>
        </View>

        <TempHistory values={temps} markIdx={temps.length - 1} />
        <T size={13} color={colors.ink2} style={{ textAlign: 'right' }}>
          Temperature vs your normal, °F
        </T>

        <View style={{ gap: 10, marginTop: 22 }}>
          <Row icon="tag" label="Keeping track" value="Period, symptoms and tags" more="Log your period and add tags like cramps, mood or energy with the + button. Tags show on your timeline and help explain your numbers." />
          <Row icon="burst" tint={colors.lilac} label="Cycle phase" value={c.phase ?? 'Not enough data yet'} more={phaseText(c.phase)} />
          <Row
            icon="radar"
            label="Chance of conception"
            value={conception}
            more="Estimated from your cycle day and temperature trend. It is a rough guide only and not a form of birth control."
          />
          <Row
            icon="drop"
            label="Period"
            value={loggedToday ? 'Logged today' : 'None'}
            right={
              <Pressable onPress={onLogPeriod} style={st.log}>
                <T size={15}>Log</T>
              </Pressable>
            }
          />
        </View>

        {snap.predictions ? (
          <>
        <T size={24} style={{ marginTop: 36, marginBottom: 14 }}>
          Predictions
        </T>
        <View style={st.box}>
          <Caps>Period start date</Caps>
          <T size={22} style={{ marginTop: 6 }}>
            {predicted ? `On or around ${shortDate(predicted)}` : 'Not enough data yet'}
          </T>
          {inDays !== undefined ? (
            <T size={15} color={colors.ink2} style={{ marginTop: 4 }}>
              {inDays > 0 ? `In about ${inDays} day${inDays === 1 ? '' : 's'}` : inDays === 0 ? 'Today' : `${-inDays} days ago`}
            </T>
          ) : null}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 18 }}>
            {week.map((k, i) => {
              const isToday = k === today;
              const win = inWindow(k);
              const start = k === predicted;
              return (
                <View key={k} style={{ alignItems: 'center', gap: 8 }}>
                  <T weight="bold" size={11} color={colors.ink2} style={{ letterSpacing: 1 }}>
                    {['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'][i]}
                  </T>
                  <View style={[st.day, isToday && { backgroundColor: colors.cream }, win && !isToday && st.dash]}>
                    {start ? (
                      <Icon name="drop" size={16} color="#e0605a" fill="#e0605a" />
                    ) : (
                      <T size={15} color={isToday ? '#1b1b1d' : win ? '#e0605a' : colors.ink}>
                        {Number(k.slice(8))}
                      </T>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
          <T size={13} color={colors.ink2} style={{ marginTop: 16 }}>
            Based on your temperature trends and logged periods
          </T>
          <Pressable onPress={() => setCal(true)} style={[st.outline, { flexDirection: 'row', gap: 10 }]}>
            <Icon name="cal" size={20} />
            <T weight="bold" size={17}>
              View calendar
            </T>
          </Pressable>
        </View>

          </>
        ) : null}

        <T size={24} style={{ marginTop: 36, marginBottom: 14 }}>
          Cycle Stats
        </T>
        <View style={{ gap: 10 }}>
          <Stat label="Typical cycle length" value={`${c.avgLen ?? '–'}`} unit="days" regular={(c.avgLen ?? 28) >= 21 && (c.avgLen ?? 28) <= 35} />
          <Stat label="Cycle variability" value={`±${c.variability ?? 0}`} unit="days" regular={(c.variability ?? 0) <= 4} />
          <Stat label="Typical period length" value={`${c.periodLen ?? '–'}`} unit="days" regular={(c.periodLen ?? 5) <= 8} />
        </View>
        <Pressable onPress={onHistory} style={st.outline}>
          <T weight="bold" size={17}>
            View full history
          </T>
        </Pressable>
        {c.starts?.length ? (
          <T size={13} color={colors.ink3} style={{ textAlign: 'center', marginTop: 14 }}>
            Based on your past {c.starts.length} cycle{c.starts.length === 1 ? '' : 's'}.
          </T>
        ) : null}
      </ScrollView>
    </View>
  );
}

export function CycleHistory({ snap, onBack }: { snap: Snapshot; onBack: () => void }) {
  const starts = snap.cycle.starts ?? [];
  const today = dayKey(Date.now());
  const rows = starts
    .map((s, k) => {
      const next = starts[k + 1];
      if (!next) return { head: `Current, started ${shortDate(s)}`, sub: `Day ${daysBetween(s, today) + 1}` };
      return { head: `${shortDate(s)} – ${shortDate(addDays(next, -1))}`, sub: `${daysBetween(s, next)} days` };
    })
    .reverse();
  return (
    <View style={{ flex: 1 }}>
      <Glow color="#2e2a45" id="chg" y="0%" radius="130%" />
      <DetailBar title="Cycle History" onBack={onBack} close />
      <ScrollView contentContainerStyle={{ paddingBottom: 60 }}>
        {rows.length ? (
          rows.map((r) => (
            <View key={r.head} style={st.hist}>
              <Caps>{r.head}</Caps>
              <T size={17} style={{ marginTop: 6 }}>
                {r.sub}
              </T>
            </View>
          ))
        ) : (
          <T size={16} color={colors.ink2} style={{ padding: 20 }}>
            Your cycles will show up here once you log a period.
          </T>
        )}
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  rowWrap: { backgroundColor: '#ffffff0d', borderRadius: 18, padding: 16 },
  week: { flexDirection: 'row' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%`, alignItems: 'center', paddingVertical: 4 },
  cellText: { width: `${100 / 7}%`, textAlign: 'center' },
  dot: { width: 12, height: 12, borderRadius: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  box: { backgroundColor: '#ffffff0d', borderRadius: 20, padding: 18 },
  reg: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#ffffff14', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  log: { backgroundColor: '#ffffff1f', borderRadius: 999, paddingHorizontal: 18, paddingVertical: 8 },
  day: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  dash: { borderWidth: 1.5, borderColor: '#e0605a', borderStyle: 'dashed' },
  outline: { minHeight: 54, borderRadius: 999, borderWidth: 1, borderColor: colors.ink2, alignItems: 'center', justifyContent: 'center', marginTop: 20 },
  hist: { paddingHorizontal: 20, paddingVertical: 22, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
});
