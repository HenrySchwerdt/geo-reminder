/** Segmented control (Week / Month / Year): a sunken track with the selected option raised. */
import { Pressable, View } from 'react-native';

import { radius, useColors } from '@/shared/theme';
import { Text } from './components';

export function Segmented<T extends string>({ options, value, onChange, format }: { options: T[]; value: T; onChange: (v: T) => void; format?: (v: T) => string }) {
  const c = useColors();
  return (
    <View accessibilityRole="tablist" style={{ flexDirection: 'row', padding: 3, borderRadius: radius.l, borderCurve: 'continuous', backgroundColor: c['bg/sunken'] }}>
      {options.map((o) => {
        const on = o === value;
        return (
          <Pressable
            key={o}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            onPress={() => onChange(o)}
            style={{ flex: 1, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: radius.m, borderCurve: 'continuous', backgroundColor: on ? c['bg/elevated'] : 'transparent', boxShadow: on ? '0 1px 3px rgba(0,0,0,0.12)' : undefined }}>
            <Text variant="subheadStrong" color={on ? 'text/primary' : 'text/secondary'}>
              {format ? format(o) : o}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
