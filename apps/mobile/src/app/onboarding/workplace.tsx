import { router } from 'expo-router';

import { OnboardingFrame, Point, TextButton } from '@/features/onboarding/components';
import { nextStep, NEW_WORKPLACE_HREF, stepHref } from '@/features/onboarding/steps';
import { useWorkplaces } from '@/features/workplaces/store';
import { Button, Card, Icon, Row, Text } from '@/shared/ui/components';

export default function WorkplaceStep() {
  const workplaces = useWorkplaces((s) => s.workplaces);
  const added = workplaces.length > 0;
  const next = () => router.push(stepHref(nextStep('workplace') ?? 'done'));

  return (
    <OnboardingFrame
      step="workplace"
      title={added ? 'Workplace saved' : 'Add your workplace'}
      subtitle={
        added
          ? 'You can add more workplaces or change the radius any time under Settings.'
          : 'Pick the place where you work and how close you need to be. You can also skip this and use time-based reminders only.'
      }
      actions={
        <>
          <Button label={added ? 'Continue' : 'Add workplace'} style="ink" icon={added ? undefined : 'building'} onPress={added ? next : () => router.push(NEW_WORKPLACE_HREF)} />
          {added ? <TextButton label="Add another" onPress={() => router.push(NEW_WORKPLACE_HREF)} /> : <TextButton label="Skip for now" onPress={next} />}
        </>
      }>
      {added ? (
        <Card>
          {workplaces.map((w) => (
            <Row key={w.id}>
              <Icon name="building" color="accent" />
              <Text variant="headline" style={{ flex: 1 }}>
                {w.name}
              </Text>
              <Text variant="footnote" color="text/secondary">{`${w.radius} m`}</Text>
            </Row>
          ))}
        </Card>
      ) : (
        <>
          <Point icon="pin">Workplaces are saved only on this phone.</Point>
          <Point icon="location">“Use my current location” fills in the coordinates while you stand at work.</Point>
        </>
      )}
    </OnboardingFrame>
  );
}
