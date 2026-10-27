// Charts for the score detail screens (Sleep, Readiness, Activity, Sleep Health, Cycle).
import { useState } from 'react';
import { View } from 'react-native';
import Svg, { Circle, G, Line, Path, Polyline, Rect, Text as SvgText } from 'react-native-svg';
import { colors, fonts } from '../theme';
import { clock } from '../data/dates';
import type { Reading, Stage, StageKind } from '../data/types';

function useWidth() {
  const [w, setW] = useState(0);
  return [w, (e: { nativeEvent: { layout: { width: number } } }) => setW(e.nativeEvent.layout.width)] as const;
}

const short = (t: number) => clock(t).replace(':00', '');

/** Even-hour ticks between two times, e.g. 10 PM, 12 AM, 2 AM. */
function hourTicks(from: number, to: number, every = 2) {
  const d = new Date(from);
  d.setMinutes(0, 0, 0);
  d.setHours(d.getHours() + 1);
  while (d.getHours() % every) d.setHours(d.getHours() + 1);
  const out: number[] = [];
  for (; d.getTime() < to - 40 * 60000; d.setHours(d.getHours() + every)) out.push(d.getTime());
  return out;
}

function TimeAxis({ from, to, x, y, w }: { from: number; to: number; x: (t: number) => number; y: number; w: number }) {
  const ticks = hourTicks(from, to);
  return (
    <>
      <SvgText x={0} y={y} fill={colors.ink} fontSize={11} fontFamily={fonts.sansBold}>
        {short(from)}
      </SvgText>
      {ticks.map((t) =>
        x(t) > 70 && x(t) < w - 90 ? (
          <SvgText key={t} x={x(t) - 14} y={y} fill={colors.ink} fontSize={11} fontFamily={fonts.sansBold}>
            {short(t)}
          </SvgText>
        ) : null,
      )}
      <SvgText x={w - 4} y={y} fill={colors.ink} fontSize={11} fontFamily={fonts.sansBold} textAnchor="end">
        {short(to)}
      </SvgText>
    </>
  );
}

/** Overnight line chart (heart rate or HRV) with labels on the right, like her app. */
export function NightLine({ points, from, to, ticks, markLow }: { points: Reading[]; from: number; to: number; ticks: number[]; markLow?: boolean }) {
  const [w, onLayout] = useWidth();
  const H = 220, top = 12, bottom = H - 34, right = 34;
  const lo = ticks[0], hi = ticks[ticks.length - 1];
  const x = (t: number) => 8 + ((t - from) / (to - from || 1)) * (w - right - 16);
  const y = (v: number) => bottom - ((Math.max(lo, Math.min(hi, v)) - lo) / (hi - lo)) * (bottom - top);
  const pts = points.filter((p) => p.t >= from && p.t <= to);
  const low = markLow && pts.length ? pts.reduce((a, p) => (p.v < a.v ? p : a)) : undefined;
  return (
    <View onLayout={onLayout} style={{ marginTop: 16 }}>
      {w > 0 && (
        <Svg width={w} height={H}>
          {ticks.map((v) => (
            <Line key={v} x1={0} x2={w - right} y1={y(v)} y2={y(v)} stroke="#ffffff22" strokeDasharray="3 4" />
          ))}
          {ticks.map((v) => (
            <SvgText key={`l${v}`} x={w - 4} y={y(v) + 4} fill={colors.ink2} fontSize={11} fontFamily={fonts.sans} textAnchor="end">
              {v}
            </SvgText>
          ))}
          <Line x1={x(from)} x2={x(from)} y1={top} y2={bottom} stroke="#ffffff55" />
          <Line x1={w - right} x2={w - right} y1={top} y2={bottom} stroke="#ffffff55" />
          {pts.length > 1 && <Polyline points={pts.map((p) => `${x(p.t).toFixed(1)},${y(p.v).toFixed(1)}`).join(' ')} fill="none" stroke={colors.ink} strokeWidth={1.6} />}
          {pts[0] && <Circle cx={x(pts[0].t)} cy={y(pts[0].v)} r={3.5} fill={colors.surface} stroke={colors.ink} strokeWidth={1.5} />}
          {low && <Circle cx={x(low.t)} cy={y(low.v)} r={5} fill={colors.ink} stroke={colors.surface} strokeWidth={2} />}
          <TimeAxis from={from} to={to} x={x} y={H - 8} w={w} />
        </Svg>
      )}
    </View>
  );
}

export const stageColor: Record<StageKind, string> = { awake: '#f3eeea', rem: '#8fd0f5', light: '#4aa8e8', deep: '#2b6aa6' };
const rowOf: Record<StageKind, number> = { awake: 0, rem: 1, light: 2, deep: 3 };

/** Sleep stage chart: awake on top, deep at the bottom. */
export function Hypnogram({ stages, from, to }: { stages: Stage[]; from: number; to: number }) {
  const [w, onLayout] = useWidth();
  const H = 190, top = 10, rowH = 34;
  const x = (t: number) => ((t - from) / (to - from || 1)) * w;
  return (
    <View onLayout={onLayout} style={{ marginTop: 16 }}>
      {w > 0 && (
        <Svg width={w} height={H}>
          {[0, 1, 2, 3].map((r) => (
            <Line key={r} x1={0} x2={w} y1={top + r * rowH + rowH} y2={top + r * rowH + rowH} stroke="#ffffff12" />
          ))}
          {stages.map((s, i) => {
            const r = rowOf[s.k];
            const next = stages[i + 1];
            return (
              <G key={i}>
                <Rect x={x(s.s)} y={top + r * rowH} width={Math.max(1.5, x(s.e) - x(s.s))} height={rowH} fill={stageColor[s.k]} rx={2} />
                {next && <Line x1={x(s.e)} x2={x(s.e)} y1={top + Math.min(r, rowOf[next.k]) * rowH + rowH / 2} y2={top + Math.max(r, rowOf[next.k]) * rowH + rowH / 2} stroke="#ffffff55" strokeWidth={1} />}
              </G>
            );
          })}
          <TimeAxis from={from} to={to} x={x} y={H - 6} w={w} />
        </Svg>
      )}
    </View>
  );
}

/** Daily movement: one bar per 15 minutes, labelled Low / Medium / High. */
export function MovementBars({ series, from, to }: { series: Reading[]; from: number; to: number }) {
  const [w, onLayout] = useWidth();
  const H = 200, bottom = H - 30, right = 52;
  const x = (t: number) => ((t - from) / (to - from || 1)) * (w - right);
  const buckets = new Map<number, number>();
  for (const p of series) {
    const k = Math.floor((p.t - from) / 900000);
    buckets.set(k, (buckets.get(k) ?? 0) + p.v);
  }
  const max = Math.max(600, ...buckets.values());
  const bw = Math.max(1.5, ((w - right) / ((to - from) / 900000)) * 0.6);
  const ticks = hourTicks(from, to, 4);
  return (
    <View onLayout={onLayout} style={{ marginTop: 12 }}>
      {w > 0 && (
        <Svg width={w} height={H}>
          {[
            ['High', 0.12],
            ['Medium', 0.42],
            ['Low', 0.72],
          ].map(([l, f]) => (
            <SvgText key={l as string} x={w - 4} y={(f as number) * bottom} fill={colors.ink2} fontSize={11} fontFamily={fonts.sans} textAnchor="end">
              {l as string}
            </SvgText>
          ))}
          <Line x1={0} x2={w - right} y1={bottom} y2={bottom} stroke="#ffffff55" />
          {[...buckets.entries()].map(([k, v]) => {
            const h = Math.max(3, (v / max) * (bottom - 10));
            return <Rect key={k} x={x(from + k * 900000)} y={bottom - h} width={bw} height={h} fill={v > max * 0.3 ? '#a9d8f5' : '#6a9cbc'} />;
          })}
          {ticks.map((t) => (
            <SvgText key={t} x={x(t)} y={H - 8} fill={colors.ink} fontSize={11} fontFamily={fonts.sansBold} textAnchor="middle">
              {short(t)}
            </SvgText>
          ))}
        </Svg>
      )}
    </View>
  );
}

/** This week's activity minutes, Sunday to Saturday. */
export function WeekBars({ values }: { values: (number | undefined)[] }) {
  const [w, onLayout] = useWidth();
  const H = 180, bottom = H - 30, right = 36;
  const hi = 135;
  const y = (v: number) => bottom - (Math.min(hi, v) / hi) * (bottom - 10);
  const step = (w - right) / 7;
  return (
    <View onLayout={onLayout} style={{ marginTop: 12 }}>
      {w > 0 && (
        <Svg width={w} height={H}>
          {[45, 90, 135].map((v) => (
            <G key={v}>
              <Line x1={0} x2={w - right} y1={y(v)} y2={y(v)} stroke="#ffffff1a" />
              <SvgText x={w - 4} y={y(v) + 4} fill={colors.ink2} fontSize={11} fontFamily={fonts.sans} textAnchor="end">
                {v}
              </SvgText>
            </G>
          ))}
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d, i) => {
            const v = values[i];
            const cx = step * i + step / 2;
            return (
              <G key={d}>
                {v !== undefined && <Rect x={cx - 5} y={y(Math.max(3, v))} width={10} height={bottom - y(Math.max(3, v))} rx={5} fill={v >= 22 ? colors.butter : '#ffffff33'} />}
                <SvgText x={cx} y={H - 8} fill={colors.ink2} fontSize={11} fontFamily={fonts.sans} textAnchor="middle">
                  {d}
                </SvgText>
              </G>
            );
          })}
        </Svg>
      )}
    </View>
  );
}

/** Score trend with Optimal / Good / Fair bands on the right (Sleep Health). */
export function TrendLine({ values, labels, mark }: { values: number[]; labels: string[]; mark?: string }) {
  const [w, onLayout] = useWidth();
  const H = 220, bottom = H - 30, right = 70, lo = 50, hi = 95;
  const y = (v: number) => bottom - ((Math.max(lo, Math.min(hi, v)) - lo) / (hi - lo)) * (bottom - 10);
  const x = (i: number) => (i / Math.max(1, values.length - 1)) * (w - right - 4);
  return (
    <View onLayout={onLayout} style={{ marginTop: 16 }}>
      {w > 0 && (
        <Svg width={w} height={H}>
          {[
            ['Optimal', 90],
            ['85', 85],
            ['Good', 77],
            ['70', 70],
            ['Fair', 65],
            ['60', 60],
            ['Pay', 55],
          ].map(([l, v]) => (
            <SvgText key={l as string} x={w - 4} y={y(v as number) + 4} fill={colors.ink2} fontSize={11} fontFamily={fonts.sans} textAnchor="end">
              {l as string}
            </SvgText>
          ))}
          <Line x1={w - right} x2={w - right} y1={0} y2={bottom} stroke="#ffffff88" />
          {values.length > 1 && <Polyline points={values.map((v, i) => `${x(i)},${y(v)}`).join(' ')} fill="none" stroke={colors.teal} strokeWidth={2.5} />}
          {labels.map((l, i) =>
            l ? (
              <SvgText key={i} x={x(i)} y={H - 8} fill={colors.ink2} fontSize={10} fontFamily={fonts.sans} textAnchor={i === 0 ? 'start' : i === values.length - 1 ? 'end' : 'middle'}>
                {l}
              </SvgText>
            ) : null,
          )}
          {mark && (
            <SvgText x={w - right - 6} y={14} fill={colors.ink} fontSize={11} fontFamily={fonts.sans} textAnchor="end">
              {mark}
            </SvgText>
          )}
        </Svg>
      )}
    </View>
  );
}

/** None / High slider for sleep debt. */
export function DebtSlider({ min }: { min: number }) {
  const [w, onLayout] = useWidth();
  const f = Math.min(1, min / 600);
  return (
    <View onLayout={onLayout} style={{ marginTop: 18, height: 20 }}>
      {w > 0 && (
        <Svg width={w} height={20}>
          {[0, 1, 2, 3].map((k) => (
            <Rect key={k} x={(k * w) / 4 + 2} y={8} width={w / 4 - 4} height={3} rx={1.5} fill={k === Math.min(3, Math.floor(f * 4)) ? colors.butter : '#ffffff33'} />
          ))}
          <Circle cx={Math.max(8, Math.min(w - 8, f * w))} cy={9.5} r={7} fill={colors.cream} stroke={colors.butter} strokeWidth={2} />
        </Svg>
      )}
    </View>
  );
}

/** Body clock arc: her usual sleep window (blue) against last night (grey), 9 PM to 9 AM. */
export function BodyClock({ usualMid, lastMid, lastLen }: { usualMid?: number; lastMid?: number; lastLen?: number }) {
  const [w, onLayout] = useWidth();
  const H = 120;
  const pos = (m: number) => Math.max(0, Math.min(1, (m + 180) / 720)); // minutes from midnight, -180 = 9 PM
  const arc = (r: number, a: number, b: number) => {
    const pts: string[] = [];
    for (let f = a; f <= b + 0.0001; f += Math.max(0.005, (b - a) / 40)) {
      const [px, py] = dot(r, Math.min(b, f));
      pts.push(`${px.toFixed(1)},${py.toFixed(1)}`);
    }
    return `M${pts.join(' L')}`;
  };
  const dot = (r: number, f: number) => {
    const ang = Math.PI * (1 - f);
    return [w / 2 + r * Math.cos(ang), H + 20 - r * 0.5 * Math.sin(ang)] as const;
  };
  const half = (lastLen ?? 480) / 2;
  const R1 = w * 0.4, R2 = w * 0.35;
  return (
    <View onLayout={onLayout} style={{ marginTop: 10 }}>
      {w > 0 && (
        <Svg width={w} height={H}>
          {['9 pm', '12 am', '3 am', '6 am'].map((l, i) => {
            const [cx, cy] = dot(R1 + 24, pos(-180 + i * 180 + (i === 0 ? 20 : 0)));
            return (
              <SvgText key={l} x={cx} y={cy} fill={colors.ink2} fontSize={11} fontFamily={fonts.sans} textAnchor="middle">
                {l}
              </SvgText>
            );
          })}
          <Path d={arc(R1, 0, 1)} stroke="#ffffff1a" strokeWidth={10} fill="none" />
          {usualMid !== undefined && <Path d={arc(R1, pos(usualMid - half), pos(usualMid + half))} stroke="#4aa8e8" strokeWidth={7} strokeLinecap="round" fill="none" />}
          {lastMid !== undefined && <Path d={arc(R2, pos(lastMid - half), pos(lastMid + half))} stroke="#8e9096" strokeWidth={6} strokeLinecap="round" fill="none" />}
          {usualMid !== undefined && <Circle cx={dot(R1, pos(usualMid))[0]} cy={dot(R1, pos(usualMid))[1]} r={7} fill={colors.ink} />}
          {lastMid !== undefined && <Circle cx={dot(R2, pos(lastMid))[0]} cy={dot(R2, pos(lastMid))[1]} r={6} fill={colors.ink} />}
        </Svg>
      )}
    </View>
  );
}

/** Nightly temperature bars around zero, with a marker on the selected night (Cycle Insights). */
export function TempHistory({ values, markIdx }: { values: number[]; markIdx: number }) {
  const [w, onLayout] = useWidth();
  const H = 200, mid = 110, right = 46, scale = 50;
  const step = (w - right) / Math.max(1, values.length);
  return (
    <View onLayout={onLayout} style={{ marginTop: 16 }}>
      {w > 0 && (
        <Svg width={w} height={H}>
          {[1.8, 0.9, 0, -0.9].map((v) => (
            <G key={v}>
              <Line x1={0} x2={w - right} y1={mid - v * scale} y2={mid - v * scale} stroke="#ffffff1a" />
              <SvgText x={w - 4} y={mid - v * scale + 4} fill={colors.ink2} fontSize={11} fontFamily={fonts.sans} textAnchor="end">
                {`${v > 0 ? '+' : ''}${v.toFixed(1)}`}
              </SvgText>
            </G>
          ))}
          {values.map((v, i) => {
            const h = Math.max(4, Math.abs(v) * scale);
            return <Rect key={i} x={i * step + step / 2 - 2} y={v > 0 ? mid - h : mid} width={4} height={h} rx={2} fill={colors.cream} />;
          })}
          {markIdx >= 0 && <Line x1={markIdx * step + step / 2} x2={markIdx * step + step / 2} y1={0} y2={H} stroke={colors.cream} strokeWidth={1.5} />}
        </Svg>
      )}
    </View>
  );
}
