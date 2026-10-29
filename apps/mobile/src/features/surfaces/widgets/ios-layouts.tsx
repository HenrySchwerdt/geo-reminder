/**
 * iOS layouts: the home / lock screen widget and the Live Activity (banner + Dynamic Island), written with
 * `@expo/ui/swift-ui`. Each function is serialized by the `'widget'` directive and evaluated in the widgets
 * runtime, so it may only use its arguments and the globals that runtime provides (the SwiftUI components and
 * modifiers imported below): no imports of our own, no closures over module code.
 *
 * Counting is done by the system: `Text(timerInterval:)` and `ProgressView(timerInterval:)` run from the
 * anchors in the view model, so nothing needs updating while time passes.
 */
import { Button, Gauge, HStack, Image, ProgressView, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import {
  activityBackgroundTint,
  background,
  buttonStyle,
  containerBackground,
  font,
  foregroundStyle,
  frame,
  gaugeStyle,
  labelsHidden,
  minimumScaleFactor,
  monospacedDigit,
  padding,
  progressViewStyle,
  shapes,
  tint,
} from '@expo/ui/swift-ui/modifiers';
import type { LiveActivityEnvironment, WidgetEnvironment } from 'expo-widgets';
import type { ComponentProps, JSX } from 'react';

import type { WorktimeView } from './model';

type SymbolName = NonNullable<ComponentProps<typeof Image>['systemName']>;

export function WorktimeWidget(props: WorktimeView, env: WidgetEnvironment): JSX.Element {
  'widget';
  const c = props.theme[env.colorScheme === 'dark' ? 'dark' : 'light'];
  const family = env.widgetFamily ?? 'systemSmall';
  const tone = props.state === 'break' ? c.break : props.state === 'working' ? c.accent : c['text/secondary'];
  const icon = props.state === 'break' ? 'cup.and.saucer.fill' : props.state === 'working' ? 'building.2.fill' : 'clock';
  const range = (r: { start: number; end: number }) => ({ lower: new Date(r.start), upper: new Date(r.end) });
  const queued = !!(props.pending && props.pending.length);
  const subtitle =
    props.state === 'working'
      ? `since ${props.sinceText}`
      : props.state === 'break'
        ? `worked ${props.workedText} · since ${props.sinceText}`
        : props.workplace || 'Not clocked in';

  const press = (action: string) => {
    if (props.pending && props.pending.length) return undefined;
    const id = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (ch) => {
      const r = (Math.random() * 16) | 0;
      return (ch === 'x' ? r : (r & 3) | 8).toString(16);
    });
    return { pending: [{ id, action, at: Date.now() }] };
  };

  const timer = ({ size }: { size: number }) =>
    props.timer ? (
      <Text
        timerInterval={range(props.timer)}
        countsDown={false}
        modifiers={[font({ size, weight: 'semibold', design: 'rounded' }), monospacedDigit(), foregroundStyle(c['text/primary']), minimumScaleFactor(0.6), frame({ maxWidth: 10000, alignment: 'leading' })]}
      />
    ) : (
      <Text modifiers={[font({ size, weight: 'semibold', design: 'rounded' }), monospacedDigit(), foregroundStyle(c['text/primary']), frame({ maxWidth: 10000, alignment: 'leading' })]}>
        {props.workedText}
      </Text>
    );

  const bar = () =>
    props.progressTimer ? (
      <ProgressView timerInterval={range(props.progressTimer)} countsDown={false} modifiers={[progressViewStyle('linear'), labelsHidden(), tint(tone)]} />
    ) : props.hasTarget ? (
      <ProgressView value={props.progress} modifiers={[progressViewStyle('linear'), tint(tone)]} />
    ) : (
      <Spacer />
    );

  const status = () => (
    <VStack alignment="leading" spacing={4}>
      <HStack spacing={6}>
        <Image systemName={icon} size={13} color={tone} />
        <Text modifiers={[font({ size: 13, weight: 'semibold' }), foregroundStyle(tone)]}>{props.title}</Text>
      </HStack>
      {timer({ size: family === 'systemSmall' ? 40 : 34 })}
      <Text modifiers={[font({ size: 13 }), foregroundStyle(c['text/secondary'])]}>{subtitle}</Text>
      {bar()}
      <HStack>
        <Text modifiers={[font({ size: 12 }), monospacedDigit(), foregroundStyle(c['text/tertiary'])]}>{props.startText || ''}</Text>
        <Spacer />
        <Text modifiers={[font({ size: 12 }), monospacedDigit(), foregroundStyle(c['text/tertiary'])]}>{props.endText || ''}</Text>
      </HStack>
    </VStack>
  );

  if (family === 'accessoryCircular') {
    return props.progressTimer ? (
      <ProgressView timerInterval={range(props.progressTimer)} countsDown={false} modifiers={[progressViewStyle('circular'), labelsHidden()]} />
    ) : (
      <Gauge value={props.progress} currentValueLabel={<Text>{`${Math.round(props.progress * 100)}%`}</Text>} modifiers={[gaugeStyle('circularCapacity')]} />
    );
  }

  if (family === 'accessoryRectangular') {
    return (
      <VStack alignment="leading" spacing={2}>
        <HStack spacing={4}>
          <Image systemName={icon} size={12} />
          <Text modifiers={[font({ size: 13, weight: 'semibold' })]}>{props.workplace ? `${props.title} · ${props.workplace}` : props.title}</Text>
        </HStack>
        {timer({ size: 22 })}
        <Text modifiers={[font({ size: 12 })]}>{props.endText ? `ends ${props.endText}` : `Week ${props.weekText}`}</Text>
      </VStack>
    );
  }

  if (family === 'accessoryInline') {
    return props.timer ? (
      <HStack spacing={4}>
        <Image systemName={icon} />
        <Text timerInterval={range(props.timer)} countsDown={false} />
      </HStack>
    ) : (
      <Text>{`${props.title} ${props.workedText}`}</Text>
    );
  }

  const background_ = containerBackground(c['bg/elevated'], 'widget');
  if (family !== 'systemMedium') {
    return (
      <VStack alignment="leading" modifiers={[background_]}>
        {status()}
      </VStack>
    );
  }

  const balanceColor = props.balanceTone === 'negative' ? c.danger : props.balanceTone === 'positive' ? c.accent : c['text/secondary'];
  const actionColor = props.primary.action === 'startBreak' ? c.break : c.accent;
  return (
    <HStack spacing={16} modifiers={[background_]}>
      {status()}
      <VStack alignment="leading" spacing={4}>
        <Text modifiers={[font({ size: 13, weight: 'semibold' }), foregroundStyle(c['text/secondary'])]}>This week</Text>
        <Text modifiers={[font({ size: 24, weight: 'semibold', design: 'rounded' }), monospacedDigit(), foregroundStyle(c['text/primary']), minimumScaleFactor(0.7)]}>{props.weekText}</Text>
        <Text modifiers={[font({ size: 13 }), foregroundStyle(c['text/secondary'])]}>{`of ${props.weekTargetText} · ${props.balanceText}`}</Text>
        <Spacer />
        {queued ? (
          <Text modifiers={[font({ size: 12 }), foregroundStyle(balanceColor)]}>{`${props.primary.label} queued: applies when Worktime opens`}</Text>
        ) : (
          <Button target={props.primary.action} onPress={() => press(props.primary.action)} label={props.primary.label} modifiers={[buttonStyle('borderedProminent'), tint(actionColor)]} />
        )}
      </VStack>
    </HStack>
  );
}

export function WorktimeActivity(props: WorktimeView, env: LiveActivityEnvironment) {
  'widget';
  const c = props.theme[env.colorScheme === 'dark' ? 'dark' : 'light'];
  const tone = props.state === 'break' ? c.break : props.state === 'working' ? c.accent : c['text/secondary'];
  const icon = props.state === 'break' ? 'cup.and.saucer.fill' : 'building.2.fill';
  const range = (r: { start: number; end: number }) => ({ lower: new Date(r.start), upper: new Date(r.end) });
  const heading = props.workplace ? `${props.title} · ${props.workplace}` : props.title;
  const detail = [props.state === 'break' ? `worked ${props.workedText}` : '', props.sinceText ? `since ${props.sinceText}` : '', props.state === 'working' && props.endText ? `ends ${props.endText}` : '']
    .filter((t) => t)
    .join(' · ');

  const timer = ({ size, width }: { size: number; width?: number }) =>
    props.timer ? (
      <Text
        timerInterval={range(props.timer)}
        countsDown={false}
        modifiers={[font({ size, weight: 'semibold', design: 'rounded' }), monospacedDigit(), foregroundStyle(tone), frame({ width: width ?? 100, alignment: 'trailing' })]}
      />
    ) : (
      <Text modifiers={[font({ size, weight: 'semibold', design: 'rounded' }), monospacedDigit(), foregroundStyle(c['text/primary'])]}>{props.workedText}</Text>
    );

  const bar = () =>
    props.progressTimer ? (
      <ProgressView timerInterval={range(props.progressTimer)} countsDown={false} modifiers={[progressViewStyle('linear'), labelsHidden(), tint(c.accent)]} />
    ) : props.hasTarget ? (
      <ProgressView value={props.progress} modifiers={[progressViewStyle('linear'), tint(tone)]} />
    ) : (
      <Spacer />
    );

  const pill = ({ action, label, symbol, fill, ink }: { action: string; label: string; symbol: SymbolName; fill: string; ink: string }) => (
    <Button target={action} modifiers={[buttonStyle('plain')]}>
      <HStack spacing={6} modifiers={[frame({ maxWidth: 10000 }), padding({ vertical: 11 }), background(fill, shapes.capsule())]}>
        <Image systemName={symbol} size={14} color={ink} />
        <Text modifiers={[font({ size: 16, weight: 'semibold' }), foregroundStyle(ink)]}>{label}</Text>
      </HStack>
    </Button>
  );

  const buttons = () => {
    if (props.state === 'off') return <Spacer />;
    const first = props.primary;
    const second = props.secondary;
    return (
      <HStack spacing={10}>
        {pill({
          action: first.action,
          label: first.label,
          symbol: first.action === 'startBreak' ? 'cup.and.saucer.fill' : 'play.fill',
          fill: first.action === 'startBreak' ? c['break/soft'] : c['accent/soft'],
          ink: first.action === 'startBreak' ? c.break : c.accent,
        })}
        {second ? pill({ action: second.action, label: second.label, symbol: 'stop.fill', fill: c['text/primary'], ink: c['bg/canvas'] }) : <Spacer />}
      </HStack>
    );
  };

  return {
    banner: (
      <VStack alignment="leading" spacing={10} modifiers={[padding({ all: 16 }), activityBackgroundTint(c['bg/elevated'])]}>
        <HStack spacing={10}>
          <Image systemName={icon} size={22} color={tone} />
          <VStack alignment="leading" spacing={2}>
            <Text modifiers={[font({ size: 15, weight: 'semibold' }), foregroundStyle(tone)]}>{heading}</Text>
            <Text modifiers={[font({ size: 13 }), foregroundStyle(c['text/secondary'])]}>{env.isStale ? 'Open Worktime to refresh' : detail}</Text>
          </VStack>
          <Spacer />
          {timer({ size: 28 })}
        </HStack>
        {bar()}
        {buttons()}
      </VStack>
    ),
    compactLeading: <Image systemName={icon} size={14} color={tone} />,
    compactTrailing: timer({ size: 14, width: 52 }),
    minimal: <Image systemName={props.state === 'break' ? 'cup.and.saucer.fill' : 'clock.fill'} size={14} color={tone} />,
    expandedLeading: (
      <HStack spacing={6} modifiers={[padding({ leading: 4 })]}>
        <Image systemName={icon} size={16} color={tone} />
        <Text modifiers={[font({ size: 15, weight: 'semibold' }), foregroundStyle(c['text/primary'])]}>{props.workplace || props.title}</Text>
      </HStack>
    ),
    expandedTrailing: timer({ size: 24, width: 110 }),
    expandedBottom: (
      <VStack spacing={10}>
        {bar()}
        {buttons()}
      </VStack>
    ),
  };
}
