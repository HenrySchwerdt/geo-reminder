import type { Appearance } from '@worktime/core';
import { View } from 'react-native';

import { APPEARANCE_LABEL } from '@/features/settings/appearance';
import { useSettings } from '@/features/settings/store';
import { Group, Icon, ListRow, Screen, Text } from '@/shared/ui/components';

const OPTIONS: Appearance[] = ['system', 'light', 'dark'];
const HINT: Record<Appearance, string> = { system: 'Follows your phone', light: 'Always light', dark: 'Always dark' };

export default function AppearanceScreen() {
  const appearance = useSettings((s) => s.appearance);
  const update = useSettings((s) => s.update);
  return (
    <Screen>
      <Group>
        {OPTIONS.map((o, i) => (
          <ListRow
            key={o}
            title={APPEARANCE_LABEL[o]}
            subtitle={HINT[o]}
            onPress={() => update({ appearance: o })}
            accessory={appearance === o ? <Icon name="check" color="accent" /> : <View style={{ width: 20, height: 20 }} />}
            last={i === OPTIONS.length - 1}
          />
        ))}
      </Group>
      <Text variant="footnote" color="text/secondary">
        Applies to the whole app, including the tab bar and pickers.
      </Text>
    </Screen>
  );
}
