import { type Href, router } from 'expo-router';

import { Button, Card, Icon, Row, Screen, Text } from '@/shared/ui/components';
import type { IconName } from '@/shared/theme/icons';

const SECTIONS: { icon: IconName; title: string; text: string }[] = [
  {
    icon: 'lock',
    title: 'Your data stays on this device',
    text: 'Your time entries, workplaces and settings are stored only on this phone. Worktime has no server, no account and no sign-in. We cannot see your data, and we cannot recover it for you.',
  },
  {
    icon: 'shield',
    title: 'No tracking, no third parties',
    text: 'There is no analytics, no advertising, no crash-reporting service and no tracking of any kind. Nothing is sent to us or to anyone else, and no third party receives your data.',
  },
  {
    icon: 'location',
    title: 'How location is used',
    text: 'Location is used only to notice when you arrive at or leave a workplace you created, so Worktime can ask whether to clock you in or out. Your route is never recorded: coordinates of where you move are not stored, only the workplaces you add yourself.',
  },
  {
    icon: 'export',
    title: 'Export your data',
    text: 'You can export everything at any time as a CSV spreadsheet or a full JSON backup. The file is created on your device and goes only where you choose to send it.',
  },
  {
    icon: 'trash',
    title: 'Delete your data',
    text: 'You can erase all entries, workplaces and settings with one action in Your data. Uninstalling the app also removes everything stored by it.',
  },
];

export default function PrivacyScreen() {
  return (
    <Screen title="Privacy" subtitle="Worktime keeps your working hours private by design.">
      {SECTIONS.map((s) => (
        <Card key={s.title} style={{ gap: 8 }}>
          <Row gap={10}>
            <Icon name={s.icon} color="accent" />
            <Text variant="headline" style={{ flex: 1 }}>
              {s.title}
            </Text>
          </Row>
          <Text variant="subhead" color="text/secondary">
            {s.text}
          </Text>
        </Card>
      ))}
      <Card tone="info" style={{ gap: 6 }}>
        <Row gap={10}>
          <Icon name="info" color="info" />
          <Text variant="headline" style={{ flex: 1 }}>
            Questions?
          </Text>
        </Row>
        <Text variant="subhead">Contact: privacy@example.com (placeholder, to be replaced before release).</Text>
      </Card>
      <Button label="Export or delete my data" style="secondary" onPress={() => router.push('/data' as Href)} />
    </Screen>
  );
}
