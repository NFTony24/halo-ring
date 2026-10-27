import { Pressable, StyleSheet, Text, View, type TextProps, type ViewStyle, type StyleProp } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import { colors, fonts } from '../theme';
import { Icon, type IconName } from './Icon';

type TProps = TextProps & { serif?: boolean; weight?: 'regular' | 'medium' | 'bold'; size?: number; color?: string };

export function T({ serif, weight = 'regular', size = 16, color = colors.ink, style, ...rest }: TProps) {
  const family = serif ? fonts.serif : weight === 'bold' ? fonts.sansBold : weight === 'medium' ? fonts.sansMedium : fonts.sans;
  return <Text {...rest} style={[{ fontFamily: family, fontSize: size, color, lineHeight: Math.round(size * (serif ? 1.12 : 1.42)) }, style]} />;
}

export function Caps({ children, color = colors.ink }: { children: React.ReactNode; color?: string }) {
  return (
    <T weight="bold" size={13} color={color} style={{ letterSpacing: 2, textTransform: 'uppercase' }}>
      {children}
    </T>
  );
}

/** Soft colored glow at the top of a card, like her app's cards. */
export function Glow({ color, at = '50%', y = '0%', radius = '75%', id }: { color: string; at?: string; y?: string; radius?: string; id: string }) {
  return (
    <Svg style={StyleSheet.absoluteFill} preserveAspectRatio="none">
      <Defs>
        <RadialGradient id={id} cx={at} cy={y} rx={radius} ry="70%" fx={at} fy={y}>
          <Stop offset="0" stopColor={color} stopOpacity={1} />
          <Stop offset="1" stopColor={colors.surface} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${id})`} />
    </Svg>
  );
}

export function Card({ children, glow, style, onPress }: { children: React.ReactNode; glow?: string; style?: StyleProp<ViewStyle>; onPress?: () => void }) {
  const inner = (
    <>
      {glow ? <Glow color={glow} id={`g${glow.slice(1)}`} /> : null}
      {children}
    </>
  );
  return onPress ? (
    <Pressable onPress={onPress} style={[s.card, style]}>
      {inner}
    </Pressable>
  ) : (
    <View style={[s.card, style]}>{inner}</View>
  );
}

export function Badge({ icon, bg = colors.glassFill, color = colors.ink }: { icon: IconName; bg?: string; color?: string }) {
  return (
    <View style={[s.badge, { backgroundColor: bg }]}>
      <Icon name={icon} size={22} color={color} />
    </View>
  );
}

export function CardHead({ icon, title, tag, tagColor, extra }: { icon: IconName; title: string; tag?: string; tagColor?: string; extra?: string }) {
  return (
    <View style={s.row}>
      <Badge icon={icon} />
      <View style={{ flex: 1 }}>
        <T size={17}>{title}</T>
        {tag ? (
          <T weight="bold" size={13} color={tagColor} style={{ letterSpacing: 2, textTransform: 'uppercase' }}>
            {tag}
            {extra ? <T weight="bold" size={13} color={colors.ink2}>{`  ${extra}`}</T> : null}
          </T>
        ) : null}
      </View>
    </View>
  );
}

export function Button({ label, icon, onPress, light, ghost, small }: { label: string; icon?: IconName; onPress?: () => void; light?: boolean; ghost?: boolean; small?: boolean }) {
  const fg = light ? '#1b1b1d' : colors.ink;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        s.btn,
        light && { backgroundColor: colors.cream },
        ghost && { backgroundColor: 'transparent' },
        small && { alignSelf: 'center', paddingHorizontal: 26 },
        pressed && { opacity: 0.7 },
      ]}
    >
      {icon ? <Icon name={icon} size={20} color={fg} fill={icon === 'drop' ? fg : undefined} /> : null}
      <T weight="bold" size={17} color={fg}>
        {label}
      </T>
    </Pressable>
  );
}

export function ListGroup({ children }: { children: React.ReactNode }) {
  return <View style={s.list}>{children}</View>;
}

export function ListRow({ label, value, icon, color, sub, right, onPress, last }: { label: string; value?: string; icon?: IconName; color?: string; sub?: string; right?: React.ReactNode; onPress?: () => void; last?: boolean }) {
  return (
    <Pressable onPress={onPress} style={[s.li, last && { borderBottomWidth: 0 }]}>
      {icon ? <Icon name={icon} color={color ?? colors.ink} fill={icon === 'pin' ? color : undefined} /> : null}
      <View style={{ flex: 1 }}>
        <T size={18} color={color ?? colors.ink}>
          {label}
        </T>
        {sub ? (
          <T size={15} color={colors.ink2}>
            {sub}
          </T>
        ) : null}
      </View>
      {value ? <T size={17} color={colors.ink2}>{value}</T> : null}
      {right}
    </Pressable>
  );
}

export function GroupLabel({ children }: { children: string }) {
  return (
    <T size={18} color={colors.ink2} style={{ marginTop: 14, marginLeft: 4 }}>
      {children}
    </T>
  );
}

export const s = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: 28, padding: 22, overflow: 'hidden' },
  badge: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  btn: { flexDirection: 'row', gap: 10, alignItems: 'center', justifyContent: 'center', minHeight: 54, borderRadius: 999, backgroundColor: colors.glassFill, marginTop: 20 },
  list: { backgroundColor: colors.surface, borderRadius: 22, overflow: 'hidden' },
  li: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 20, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
});
