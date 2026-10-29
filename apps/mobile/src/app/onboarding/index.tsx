import { router } from 'expo-router';

import { OnboardingFrame, Point, TextButton } from '@/features/onboarding/components';
import { nextStep, stepHref, TODAY_HREF } from '@/features/onboarding/steps';
import { useSettings } from '@/features/settings/store';
import { Button } from '@/shared/ui/components';

export default function Welcome() {
  const update = useSettings((s) => s.update);
  const skipSetup = () => {
    update({ onboarded: true });
    router.replace(TODAY_HREF);
  };
  return (
    <OnboardingFrame
      step="welcome"
      title="Worktime"
      subtitle="Track your working time with reminders when you arrive and leave. Setup takes about a minute."
      actions={
        <>
          <Button label="Get started" style="ink" onPress={() => router.push(stepHref(nextStep('welcome') ?? 'hours'))} />
          <TextButton label="Skip setup" onPress={skipSetup} />
        </>
      }>
      <Point icon="lock">Everything stays on this phone. No account, no cloud, no tracking.</Point>
      <Point icon="location">Location is optional and only used for arrival and departure reminders.</Point>
      <Point icon="clock">You can always clock in and out by hand.</Point>
    </OnboardingFrame>
  );
}
