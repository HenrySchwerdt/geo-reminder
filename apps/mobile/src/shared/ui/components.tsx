/** Small, coherent component set mirroring the FigCraft design system (docs/design/design-system.md). */
import { SymbolView } from 'expo-symbols';
import type { ReactNode } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text as RNText,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import { radius, space, type, useColors, type Palette, type TypeName } from '@/shared/theme';
import { ICONS, type IconName } from '@/shared/theme/icons';

type ColorName = keyof Palette;

export function Text({
  variant = 'body',
  color = 'text/primary',
  style,
  children,
  numberOfLines,
}: {
  variant?: TypeName;
  color?: ColorName;
  style?: StyleProp<TextStyle>;
  children: ReactNode;
  numberOfLines?: number;
}) {
  const c = useColors();
  return (
    <RNText numberOfLines={numberOfLines} style={[type[variant] as TextStyle, { color: c[color] }, style]}>
      {children}
    </RNText>
  );
}

export function Icon({ name, size = 20, color = 'text/primary' }: { name: IconName; size?: number; color?: ColorName }) {
  const c = useColors();
  return <SymbolView name={ICONS[name]} size={size} tintColor={c[color]} type="monochrome" />;
}

export function Screen({ children, title, subtitle, trailing }: { children: ReactNode; title?: string; subtitle?: string; trailing?: ReactNode }) {
  const c = useColors();
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c['bg/canvas'] }}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.screen}>
      {title ? (
        <View style={styles.titleRow}>
          <View style={{ flex: 1 }}>
            <Text variant="largeTitle">{title}</Text>
            {subtitle ? (
              <Text variant="callout" color="text/secondary">
                {subtitle}
              </Text>
            ) : null}
          </View>
          {trailing}
        </View>
      ) : null}
      {children}
    </ScrollView>
  );
}

export function Card({ children, style, tone }: { children: ReactNode; style?: StyleProp<ViewStyle>; tone?: 'accent' | 'break' | 'danger' | 'info' }) {
  const c = useColors();
  const bg = tone ? c[`${tone}/soft` as ColorName] : c['bg/elevated'];
  return <View style={[styles.card, { backgroundColor: bg }, !tone && styles.cardShadow, style]}>{children}</View>;
}

export function Row({ children, style, gap = space.m }: { children: ReactNode; style?: StyleProp<ViewStyle>; gap?: number }) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center', gap }, style]}>{children}</View>;
}

export const PILL = {
  working: { bg: 'accent/soft', fg: 'accent', label: 'Working' },
  break: { bg: 'break/soft', fg: 'break', label: 'On break' },
  off: { bg: 'bg/sunken', fg: 'text/secondary', label: 'Not working' },
  alert: { bg: 'danger/soft', fg: 'danger', label: 'Needs attention' },
} as const;

export function StatusPill({ state, label }: { state: keyof typeof PILL; label?: string }) {
  const c = useColors();
  const p = PILL[state];
  return (
    <View style={[styles.pill, { backgroundColor: c[p.bg] }]}>
      <View style={[styles.dot, { backgroundColor: c[p.fg] }]} />
      <Text variant="footnoteStrong" color={p.fg}>
        {label ?? p.label}
      </Text>
    </View>
  );
}

const BUTTON = {
  primary: { bg: 'accent', fg: 'on-accent' },
  secondary: { bg: 'bg/sunken', fg: 'text/primary' },
  break: { bg: 'break/soft', fg: 'break' },
  destructive: { bg: 'danger/soft', fg: 'danger' },
  ink: { bg: 'text/primary', fg: 'bg/canvas' },
} as const;

export function Button({
  label,
  onPress,
  style = 'primary',
  icon,
  flex,
  disabled,
}: {
  label: string;
  onPress?: () => void;
  style?: keyof typeof BUTTON;
  icon?: IconName;
  flex?: boolean;
  disabled?: boolean;
}) {
  const c = useColors();
  const s = BUTTON[style];
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: c[s.bg], opacity: disabled ? 0.4 : pressed ? 0.85 : 1 },
        flex && { flex: 1 },
      ]}>
      {icon ? <Icon name={icon} size={18} color={s.fg} /> : null}
      <Text variant="headline" color={s.fg}>
        {label}
      </Text>
    </Pressable>
  );
}

export function Stat({ label, value, color = 'text/primary' }: { label: string; value: string; color?: ColorName }) {
  return (
    <View style={{ flex: 1, gap: 2 }}>
      <Text variant="footnote" color="text/secondary">
        {label}
      </Text>
      <Text variant="numericMedium" color={color}>
        {value}
      </Text>
    </View>
  );
}

export function SectionHeader({ children }: { children: string }) {
  return (
    <Text variant="captionUpper" color="text/secondary" style={{ paddingHorizontal: space.l, marginTop: space.s }}>
      {children}
    </Text>
  );
}

export function Group({ children }: { children: ReactNode }) {
  const c = useColors();
  return <View style={[styles.group, styles.cardShadow, { backgroundColor: c['bg/elevated'] }]}>{children}</View>;
}

export function ListRow({
  title,
  subtitle,
  value,
  icon,
  tint = 'accent',
  onPress,
  last,
  accessory,
}: {
  title: string;
  subtitle?: string;
  value?: string;
  icon?: IconName;
  tint?: 'accent' | 'break' | 'info' | 'danger';
  onPress?: () => void;
  last?: boolean;
  accessory?: ReactNode;
}) {
  const c = useColors();
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}>
      <View style={styles.row}>
        {icon ? (
          <View style={[styles.tile, { backgroundColor: c[`${tint}/soft` as ColorName] }]}>
            <Icon name={icon} size={17} color={tint} />
          </View>
        ) : null}
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="body">{title}</Text>
          {subtitle ? (
            <Text variant="footnote" color="text/secondary">
              {subtitle}
            </Text>
          ) : null}
        </View>
        {value ? (
          <Text variant="body" color="text/secondary">
            {value}
          </Text>
        ) : null}
        {accessory}
        {onPress && !accessory ? <Icon name="chevron" size={13} color="text/tertiary" /> : null}
      </View>
      {last ? null : <View style={[styles.separator, { backgroundColor: c.separator, marginLeft: icon ? 60 : 16 }]} />}
    </Pressable>
  );
}

export function ToggleRow(props: { title: string; subtitle?: string; value: boolean; onChange: (v: boolean) => void; icon?: IconName; last?: boolean }) {
  const c = useColors();
  const { value, onChange, ...row } = props;
  return <ListRow {...row} accessory={<Switch value={value} onValueChange={onChange} trackColor={{ true: c.accent, false: c['bg/track'] }} />} />;
}

export function Chips<T extends string | number>({ options, value, onChange, format }: { options: T[]; value: T; onChange: (v: T) => void; format?: (v: T) => string }) {
  const c = useColors();
  return (
    <View style={styles.chips}>
      {options.map((o) => {
        const on = o === value;
        return (
          <Pressable
            key={String(o)}
            onPress={() => onChange(o)}
            style={[styles.chip, { backgroundColor: on ? c['text/primary'] : c['bg/elevated'], borderColor: c.separator, borderWidth: on ? 0 : StyleSheet.hairlineWidth }]}>
            <Text variant="subheadStrong" color={on ? 'bg/canvas' : 'text/primary'}>
              {format ? format(o) : String(o)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { padding: space.l, paddingBottom: 140, gap: space.l },
  titleRow: { flexDirection: 'row', alignItems: 'flex-end', gap: space.m, marginTop: Platform.OS === 'android' ? space.xl : 0 },
  card: { borderRadius: radius.card, padding: space.xl, gap: space.m, borderCurve: 'continuous' },
  cardShadow: { boxShadow: '0 1px 2px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.05)' },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, paddingLeft: 10, paddingRight: 12, borderRadius: 14, alignSelf: 'flex-start' },
  dot: { width: 8, height: 8, borderRadius: 4 },
  button: { minHeight: 52, borderRadius: 26, paddingHorizontal: 22, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderCurve: 'continuous' },
  group: { borderRadius: radius.card, overflow: 'hidden', borderCurve: 'continuous' },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.m, paddingVertical: space.m, paddingHorizontal: space.l, minHeight: 56 },
  tile: { width: 32, height: 32, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  separator: { height: StyleSheet.hairlineWidth },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { height: 36, paddingHorizontal: 14, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
});
