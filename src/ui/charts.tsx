import { useState } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Defs, Line, Pattern, Polyline, Rect, Text as SvgText } from 'react-native-svg';
import { colors, fonts } from '../theme';
import type { HrSample } from '../data/types';

function useWidth() {
  const [w, setW] = useState(0);
  return [w, (e: { nativeEvent: { layout: { width: number } } }) => setW(e.nativeEvent.layout.width)] as const;
}

const H = 150;
const labels = ['12 AM', '6 AM', '12 PM', '6 PM'];

function dayStart(samples: HrSample[]) {
  const d = new Date(samples[0]?.t ?? Date.now());
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function Axis({ x }: { x: (h: number) => number }) {
  return (
    <>
      {[0, 6, 12, 18].map((h, i) => (
        <SvgText key={h} x={x(h) + 6} y={H - 8} fill={colors.ink2} fontSize={12} fontFamily={fonts.sans}>
          {labels[i]}
        </SvgText>
      ))}
      {[6, 12, 18].map((h) => (
        <Line key={h} x1={x(h)} x2={x(h)} y1={0} y2={H} stroke="#ffffff14" />
      ))}
    </>
  );
}

/** Today's heart rate: 15-minute line plus dots, pink when well above resting, blue overnight. */
export function HeartRateChart({ samples, resting = 60, wakeAt = 0 }: { samples: HrSample[]; resting?: number; wakeAt?: number }) {
  const [w, onLayout] = useWidth();
  const t0 = dayStart(samples);
  const lo = 40, hi = 130;
  const x = (h: number) => 8 + (h / 24) * (w - 50);
  const y = (v: number) => H - 26 - ((v - lo) / (hi - lo)) * (H - 40);
  const buckets = new Map<number, number[]>();
  for (const s of samples) {
    const k = Math.floor((s.t - t0) / 900000);
    buckets.set(k, [...(buckets.get(k) ?? []), s.bpm]);
  }
  const keys = [...buckets.keys()].sort((a, b) => a - b);
  const pts = keys.map((k) => {
    const v = buckets.get(k)!;
    return `${x(k / 4).toFixed(1)},${y(v.reduce((a, b) => a + b, 0) / v.length).toFixed(1)}`;
  });
  return (
    <View onLayout={onLayout} style={{ marginTop: 22, borderRadius: 14, backgroundColor: '#ffffff0a', overflow: 'hidden' }}>
      {w > 0 && (
        <Svg width={w} height={H}>
          <Axis x={x} />
          {samples.filter((_, i) => i % 3 === 0).map((s, i) => {
            const h = (s.t - t0) / 3600000;
            const col = s.t < wakeAt ? '#8ccaf0' : s.bpm > resting * 1.45 ? colors.rose : '#ffffff40';
            return <Circle key={i} cx={x(h)} cy={y(s.bpm)} r={2.6} fill={col} />;
          })}
          <Polyline points={pts.join(' ')} fill="none" stroke={colors.ink} strokeWidth={2} />
          <SvgText x={w - 36} y={y(120) + 4} fill={colors.ink2} fontSize={12}>120</SvgText>
          <SvgText x={w - 30} y={y(60) + 4} fill={colors.ink2} fontSize={12}>60</SvgText>
        </Svg>
      )}
    </View>
  );
}

/** Daytime stress line: heart rate relative to resting, sampled every 30 minutes after waking. */
export function StressChart({ samples, resting = 60, wakeAt }: { samples: HrSample[]; resting?: number; wakeAt?: number }) {
  const [w, onLayout] = useWidth();
  const t0 = dayStart(samples);
  const x = (h: number) => (h / 24) * w;
  const y = (v: number) => 14 + (1 - v) * (H - 50);
  const wakeH = wakeAt ? Math.max(0, (wakeAt - t0) / 3600000) : 6;
  const buckets = new Map<number, number[]>();
  for (const s of samples) {
    if (wakeAt && s.t < wakeAt) continue;
    const k = Math.floor((s.t - t0) / 1800000);
    buckets.set(k, [...(buckets.get(k) ?? []), s.bpm]);
  }
  const pts = [...buckets.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([k, v]) => {
      const avg = v.reduce((a, b) => a + b, 0) / v.length;
      const level = Math.max(0, Math.min(1, (avg / resting - 1) / 0.6));
      return [x(k / 2), y(level)] as const;
    });
  return (
    <View onLayout={onLayout} style={{ marginTop: 22, borderRadius: 14, backgroundColor: '#ffffff0a', overflow: 'hidden' }}>
      {w > 0 && (
        <Svg width={w} height={H}>
          <Defs>
            <Pattern id="hatch" width={6} height={6} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <Line x1={0} y1={0} x2={0} y2={6} stroke="#ffffff14" strokeWidth={2} />
            </Pattern>
          </Defs>
          <Rect x={0} y={0} width={x(wakeH)} height={H} fill="url(#hatch)" />
          <Axis x={x} />
          <Polyline points={pts.map((p) => p.join(',')).join(' ')} fill="none" stroke={colors.ink} strokeWidth={2} />
          {pts.map(([a, b], i) => (
            <Circle key={i} cx={a} cy={b} r={3} fill={colors.ink} />
          ))}
        </Svg>
      )}
    </View>
  );
}

/** Nightly temperature deviation bars (°F), highlighted by cycle phase. */
export function TempBars({ series, lutealFrom }: { series: number[]; lutealFrom?: number }) {
  const [w, onLayout] = useWidth();
  const h = 130, mid = 60, bw = 8;
  const step = (w * 0.72) / Math.max(1, series.length);
  const nowX = 8 + (series.length - 1) * step + bw / 2 + 1;
  const split = lutealFrom !== undefined ? 8 + lutealFrom * step - 3 : 0;
  const last = series[series.length - 1] ?? 0;
  return (
    <View onLayout={onLayout} style={{ marginTop: 22, borderRadius: 14, backgroundColor: '#ffffff0a', overflow: 'hidden' }}>
      {w > 0 && (
        <Svg width={w} height={h}>
          {split > 0 && <Rect x={0} y={0} width={split} height={h} fill="#3d5b62" opacity={0.6} />}
          <Rect x={split} y={0} width={nowX - split} height={h} fill="#5a4d82" opacity={0.55} />
          <Line x1={0} x2={w * 0.78} y1={mid} y2={mid} stroke="#ffffff40" />
          {series.map((v, i) => {
            const bh = Math.max(6, Math.min(55, Math.abs(v) * 90));
            return <Rect key={i} x={8 + i * step} y={v > 0 ? mid - bh : mid} width={bw} height={bh} rx={4} fill={colors.cream} />;
          })}
          <Line x1={nowX} x2={nowX} y1={0} y2={h} stroke={colors.cream} strokeWidth={2} />
          <SvgText x={w - 58} y={24} fill={colors.ink} fontSize={13}>{`${last >= 0 ? '+' : ''}${last.toFixed(1)}°F`}</SvgText>
        </Svg>
      )}
    </View>
  );
}

export function Spark({ values, color, height = 60, style }: { values: number[]; color: string; height?: number; style?: object }) {
  const [w, onLayout] = useWidth();
  const lo = Math.min(...values), hi = Math.max(...values);
  const pts = values.map((v, i) => `${(i / Math.max(1, values.length - 1)) * w},${height - 6 - ((v - lo) / (hi - lo || 1)) * (height - 12)}`);
  return (
    <View onLayout={onLayout} style={[{ height }, style]}>
      {w > 0 && values.length > 1 && (
        <Svg width={w} height={height}>
          <Polyline points={pts.join(' ')} fill="none" stroke={color} strokeWidth={2} />
        </Svg>
      )}
    </View>
  );
}
