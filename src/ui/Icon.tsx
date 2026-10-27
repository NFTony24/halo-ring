import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { colors } from '../theme';

// Line icons drawn to match her current app's set.
const paths: Record<string, (c: string) => React.ReactNode> = {
  menu: () => <Path d="M4 7h16M4 12h16M4 17h11" />,
  share: () => (
    <>
      <Circle cx={18} cy={5} r={2} />
      <Circle cx={6} cy={12} r={2} />
      <Circle cx={18} cy={19} r={2} />
      <Path d="M8 11l8-5M8 13l8 5" />
    </>
  ),
  ring: () => (
    <>
      <Circle cx={12} cy={12} r={9.5} />
      <Circle cx={12} cy={12} r={4} />
    </>
  ),
  sprout: () => <Path d="M10 20v-9M10 11c0-4 3-6 7-6 0 3-2 5-7 6zM10 14c-3 0-5-1-6-3" />,
  moon: () => <Path d="M19 15A8 8 0 0 1 9 5a8 8 0 1 0 10 10z" />,
  crown: (c) => <Path d="M4 17l-1-9 5 4 4-6 4 6 5-4-1 9z" fill={c} stroke="none" />,
  burst: (c) => <Path d="M12 3l2 5 5-2-2 5 5 1-5 2 2 5-5-2-2 5-2-5-5 2 2-5-5-2 5-1-2-5 5 2z" fill={c} stroke="none" />,
  heart: () => <Path d="M12 20s-8-5-8-11a4.5 4.5 0 0 1 8-2.5A4.5 4.5 0 0 1 20 9c0 6-8 11-8 11z" />,
  flame: () => <Path d="M12 21c-4 0-6-3-6-6 0-4 4-6 4-11 3 2 7 6 7 11 0 3-2 6-5 6zM12 21c-1.5 0-2.5-1-2.5-2.5S12 15 12 15s2.5 2 2.5 3.5S13.5 21 12 21z" />,
  waves: () => <Path d="M3 12l4-4 5 5 5-5 4 4M3 17l4-4 5 5 5-5 4 4" />,
  radar: () => (
    <>
      <Circle cx={12} cy={12} r={8} />
      <Circle cx={12} cy={12} r={4} />
      <Path d="M12 12l6-6M6 4l2 2" />
    </>
  ),
  uterus: () => <Path d="M12 20v-7M12 13c-3 0-4-3-4-6M12 13c3 0 4-3 4-6M8 7c0-2-2-3-4-2M16 7c0-2 2-3 4-2" />,
  bed: () => <Path d="M3 18V7M3 14h18v4M21 14v-2a3 3 0 0 0-3-3h-7v5M6 12h2" />,
  sunrise: () => <Path d="M4 18h16M7 15a5 5 0 0 1 10 0M12 5v3M5 9l2 2M19 9l-2 2M6 21h12" />,
  tag: (c) => (
    <>
      <Path d="M3 12V4h8l10 10-8 8z" fill={c} />
      <Circle cx={7.5} cy={8} r={1.5} fill={colors.cream} stroke="none" />
    </>
  ),
  fork: () => <Path d="M7 3v8M5 3v5a2 2 0 0 0 4 0V3M7 11v10M17 21V3c-2 1-3 4-3 8h3" />,
  plus: () => <Path d="M12 5v14M5 12h14" />,
  plusSpark: () => <Path d="M10 9v12M4 15h12M18 2v5M15.5 4.5h5M21 8v2M20 9h2" />,
  x: () => <Path d="M6 6l12 12M18 6L6 18" />,
  check: () => <Path d="M5 12l5 5 9-10" />,
  arrow: () => <Path d="M4 12h16M14 6l6 6-6 6" />,
  info: () => (
    <>
      <Circle cx={12} cy={12} r={9} />
      <Path d="M12 11v5M12 8h.01" />
    </>
  ),
  drop: (c) => <Path d="M12 3s6 7 6 11a6 6 0 0 1-12 0c0-4 6-11 6-11z" fill={c} />,
  timer: () => (
    <>
      <Circle cx={12} cy={13} r={8} />
      <Path d="M12 9v4l2 2M10 2h4" />
    </>
  ),
  cal: () => (
    <>
      <Rect x={4} y={5} width={16} height={15} rx={3} />
      <Path d="M4 10h16M8 3v4M16 3v4" />
    </>
  ),
  pencil: () => <Path d="M4 20l1-5L16 4a2.1 2.1 0 0 1 3 3L8 18z" />,
  sun: () => (
    <>
      <Circle cx={12} cy={12} r={4} />
      <Path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5" />
    </>
  ),
  leaf: () => <Path d="M5 19c0-9 5-14 15-15-1 10-6 15-15 15zM5 19l8-8" />,
  tree: () => <Path d="M12 21v-8M12 13c-4 0-6-2-6-5a6 6 0 0 1 12 0c0 3-2 5-6 5zM9 17l3-4 3 4" />,
  back: () => <Path d="M20 12H4M10 6l-6 6 6 6" />,
  user: () => (
    <>
      <Circle cx={12} cy={8} r={4} />
      <Path d="M4 20c0-4 4-6 8-6s8 2 8 6z" />
    </>
  ),
  focus: () => <Path d="M4 9V5h4M16 5h4v4M20 15v4h-4M8 19H4v-4" />,
  chev: () => <Path d="M9 6l6 6-6 6" />,
  ext: () => <Path d="M14 4h6v6M20 4l-9 9M18 14v6H4V6h6" />,
  plane: () => <Path d="M3 12h6l-3-7h3l5 7h5a2 2 0 0 1 0 4h-5l-5 7H6l3-7H3z" />,
  pin: (c) => <Path d="M12 21s-7-7-7-12a7 7 0 0 1 14 0c0 5-7 12-7 12z" fill={c} />,
  reset: () => <Path d="M4 4v5h5M5 13a7 7 0 1 0 2-6L4 9" />,
  trash: () => <Path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6" />,
  sliders: () => (
    <>
      <Path d="M4 7h10M18 7h2M4 17h2M10 17h10M4 12h6M14 12h6" />
      <Circle cx={16} cy={7} r={2} />
      <Circle cx={8} cy={17} r={2} />
      <Circle cx={12} cy={12} r={2} />
    </>
  ),
  help: () => (
    <>
      <Circle cx={12} cy={12} r={9} />
      <Path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .9-1 1.7M12 17h.01" />
    </>
  ),
  trend: () => <Path d="M4 4v16h16M7 15l4-4 3 3 5-6" />,
  bars: () => <Path d="M5 20v-6M9 20v-9M13 20v-6M17 20V8M4 10l5-4 4 4 5-5" />,
  lungs: () => <Path d="M12 4v8M12 12c-2-1-3-3-3-5M12 12c2-1 3-3 3-5M8 8c-3 0-4 4-4 8 0 2 1 4 3 4s3-2 3-4V9M16 8c3 0 4 4 4 8 0 2-1 4-3 4s-3-2-3-4V9" />,
  heartPlus: () => (
    <>
      <Circle cx={12} cy={12} r={8} />
      <Path d="M12 9v6M9 12h6" />
    </>
  ),
};

export type IconName = keyof typeof paths;

export function Icon({ name, size = 24, color = colors.ink, fill }: { name: IconName; size?: number; color?: string; fill?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={fill ?? 'none'} stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      {paths[name](color)}
    </Svg>
  );
}
