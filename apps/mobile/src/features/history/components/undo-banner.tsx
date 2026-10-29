/** "Session saved · Undo": shown for a few seconds after a correction. */
import { useEffect } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { radius, space, useColors } from '@/shared/theme';
import { Icon, Row, Text } from '@/shared/ui/components';
import { UNDO_MS, undoLastChange, useLastChange } from '../last-change';

export function UndoBanner() {
  const c = useColors();
  const change = useLastChange((s) => s.change);
  const clear = useLastChange((s) => s.clear);

  useEffect(() => {
    if (!change) return;
    const id = setTimeout(clear, Math.max(0, change.at + UNDO_MS - Date.now()));
    return () => clearTimeout(id);
  }, [change, clear]);

  if (!change) return null;
  return (
    <Row
      gap={space.m}
      style={{
        backgroundColor: c['bg/elevated'],
        borderColor: c.separator,
        borderWidth: StyleSheet.hairlineWidth,
        borderRadius: radius.l * 2,
        borderCurve: 'continuous',
        paddingVertical: space.m,
        paddingHorizontal: space.l,
      }}>
      <Icon name="check" size={22} color="accent" />
      <Text variant="subhead" style={{ flex: 1 }}>
        {change.label}
      </Text>
      <Pressable accessibilityRole="button" onPress={undoLastChange} hitSlop={12}>
        <Text variant="headline" color="accent">
          Undo
        </Text>
      </Pressable>
    </Row>
  );
}
