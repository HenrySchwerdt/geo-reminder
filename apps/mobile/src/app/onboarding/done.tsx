import { router } from 'expo-router';

import { OnboardingFrame, Point } from '@/features/onboarding/components';
import { TODAY_HREF } from '@/features/onboarding/steps';
import { useSettings } from '@/features/settings/store';
import { useWorkplaces } from '@/features/workplaces/store';
import { Button } from '@/shared/ui/components';

export default function Done() {
  const update = useSettings((s) => s.update);
  const weeklyHours = useSettings((s) => s.weeklyHours);
  const workdays = useSettings((s) => s.workdays);
  const workplaceCount = useWorkplaces((s) => s.workplaces.length);

  function finish() {
    update({ onboarded: true });
    router.replace(TODAY_HREF);
  }

  return (
    <OnboardingFrame step="done" title="You’re ready" subtitle="Worktime is set up. Everything can be changed later in Settings." actions={<Button label="Open Today" style="ink" onPress={finish} />}>
      <Point icon="clock">{`${weeklyHours} h per week over ${workdays.length} ${workdays.length === 1 ? 'day' : 'days'}.`}</Point>
      <Point icon="building">
        {workplaceCount > 0 ? `${workplaceCount} ${workplaceCount === 1 ? 'workplace' : 'workplaces'} saved.` : 'No workplace yet. Add one in Settings to get arrival and departure reminders.'}
      </Point>
    </OnboardingFrame>
  );
}
