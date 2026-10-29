/** "What changes": the effect of a correction on worked time and balance, before it is saved. */
import { formatBalance, formatDuration } from '@worktime/core';

import { space } from '@/shared/theme';
import { Card, Icon, Row, Text } from '@/shared/ui/components';
import type { Impact } from '../plan';

const worked = (ms: number) => formatDuration(ms, true);

function Line({ label, from, to }: { label: string; from: string; to: string }) {
  return (
    <Row style={{ justifyContent: 'space-between' }}>
      <Text variant="body">{label}</Text>
      <Text variant="numericSmall">{from === to ? to : `${from} → ${to}`}</Text>
    </Row>
  );
}

export function ImpactCard({ impact, title = 'What changes' }: { impact: Impact; title?: string }) {
  return (
    <Card tone="accent" style={{ gap: space.m, padding: space.l }}>
      <Row gap={space.s}>
        <Icon name="info" size={18} color="accent" />
        <Text variant="headline" color="accent">
          {title}
        </Text>
      </Row>
      <Line label="Worked" from={worked(impact.workedBefore)} to={worked(impact.workedAfter)} />
      <Line label="Day balance" from={formatBalance(impact.dayBalanceBefore)} to={formatBalance(impact.dayBalanceAfter)} />
      {impact.countsTowardsTotal ? <Line label="Total balance" from={formatBalance(impact.totalBefore)} to={formatBalance(impact.totalAfter)} /> : null}
      {impact.breakShortfallMs > 0 ? (
        <Row gap={space.s} style={{ alignItems: 'flex-start' }}>
          <Icon name="warning" size={16} color="break" />
          <Text variant="footnote" color="break" style={{ flex: 1 }}>
            {`Less break than the ${formatDuration(impact.breakAfter + impact.breakShortfallMs, true)} usually required for this much work.`}
          </Text>
        </Row>
      ) : null}
    </Card>
  );
}
