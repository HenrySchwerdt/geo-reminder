/**
 * Android layouts: the small and medium home screen widgets and the ongoing notification, written with
 * `@expo/ui/jetpack-compose` (rendered through Glance / RemoteViews). Like the iOS layouts, each function is
 * serialized by the `'widget'` directive: it may only use its arguments and the runtime's globals.
 *
 * RemoteViews have no live timer here, so the worked time is computed from the anchors at render time. It stays
 * current whenever the app refreshes the surface (every event, on foreground) and is "as of the last refresh"
 * otherwise; the texts next to it (since, expected end) never go stale.
 */
import { Column, FilledTonalButton, LinearProgressIndicator, Row, Spacer, Text, TextButton } from '@expo/ui/jetpack-compose';
import { background, cornerRadius, fillMaxSize, fillMaxWidth, height, paddingAll, width } from '@expo/ui/jetpack-compose/modifiers';
import type { CustomNotificationEnvironment, WidgetEnvironment } from 'expo-widgets';
import type { JSX } from 'react';

import type { WorktimeView } from './model';

export function WorktimeSmallWidget(props: WorktimeView, env: WidgetEnvironment): JSX.Element {
  'widget';
  const c = props.theme[env.colorScheme === 'dark' ? 'dark' : 'light'];
  const tone = props.state === 'break' ? c.break : props.state === 'working' ? c.accent : c['text/secondary'];
  const now = Date.now();
  const worked = props.workedAnchor ? now - props.workedAnchor : props.workedMs;
  const shown = props.state === 'break' && props.breakStart ? now - props.breakStart : worked;
  const clock = (ms: number) => {
    const m = Math.max(0, Math.floor(ms / 60000));
    return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`;
  };
  const progress = props.hasTarget && props.targetMs > 0 ? Math.min(1, worked / props.targetMs) : 0;
  const subtitle = props.state === 'off' ? props.workplace || 'Not clocked in' : props.state === 'break' ? `worked ${clock(worked)} · since ${props.sinceText}` : `since ${props.sinceText}`;

  return (
    <Column modifiers={[fillMaxSize(), background(c['bg/elevated']), cornerRadius(20), paddingAll(14)]} verticalArrangement={{ spacedBy: 4 }} horizontalAlignment="start">
      <Text color={tone} style={{ fontSize: 13, fontWeight: '600' }}>
        {props.title}
      </Text>
      <Text color={c['text/primary']} style={{ fontSize: 34, fontWeight: '600' }}>
        {clock(shown)}
      </Text>
      <Text color={c['text/secondary']} style={{ fontSize: 13 }}>
        {subtitle}
      </Text>
      {props.hasTarget ? <LinearProgressIndicator progress={progress} color={tone} trackColor={c['bg/track']} modifiers={[fillMaxWidth()]} /> : <Spacer modifiers={[height(4)]} />}
      <Text color={c['text/tertiary']} style={{ fontSize: 12 }}>
        {`${props.startText || ''}${props.startText && props.endText ? '  →  ' : ''}${props.endText || ''}`}
      </Text>
    </Column>
  );
}

export function WorktimeMediumWidget(props: WorktimeView, env: WidgetEnvironment): JSX.Element {
  'widget';
  const c = props.theme[env.colorScheme === 'dark' ? 'dark' : 'light'];
  const tone = props.state === 'break' ? c.break : props.state === 'working' ? c.accent : c['text/secondary'];
  const now = Date.now();
  const worked = props.workedAnchor ? now - props.workedAnchor : props.workedMs;
  const shown = props.state === 'break' && props.breakStart ? now - props.breakStart : worked;
  const clock = (ms: number) => {
    const m = Math.max(0, Math.floor(ms / 60000));
    return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`;
  };
  const progress = props.hasTarget && props.targetMs > 0 ? Math.min(1, worked / props.targetMs) : 0;
  const subtitle = props.state === 'off' ? props.workplace || 'Not clocked in' : props.state === 'break' ? `worked ${clock(worked)} · since ${props.sinceText}` : `since ${props.sinceText}`;
  const actionColor = props.primary.action === 'startBreak' ? c.break : c.accent;
  const target = { target: props.primary.action };

  return (
    <Row modifiers={[fillMaxSize(), background(c['bg/elevated']), cornerRadius(20), paddingAll(14)]} verticalAlignment="center">
      <Column verticalArrangement={{ spacedBy: 4 }} horizontalAlignment="start">
        <Text color={tone} style={{ fontSize: 13, fontWeight: '600' }}>
          {props.title}
        </Text>
        <Text color={c['text/primary']} style={{ fontSize: 34, fontWeight: '600' }}>
          {clock(shown)}
        </Text>
        <Text color={c['text/secondary']} style={{ fontSize: 13 }}>
          {subtitle}
        </Text>
        {props.hasTarget ? <LinearProgressIndicator progress={progress} color={tone} trackColor={c['bg/track']} modifiers={[width(120)]} /> : <Spacer modifiers={[height(4)]} />}
        <Text color={c['text/tertiary']} style={{ fontSize: 12 }}>
          {props.endText ? `ends ${props.endText}` : ''}
        </Text>
      </Column>
      <Spacer modifiers={[width(16)]} />
      <Column verticalArrangement={{ spacedBy: 4 }} horizontalAlignment="start">
        <Text color={c['text/secondary']} style={{ fontSize: 13, fontWeight: '600' }}>
          This week
        </Text>
        <Text color={c['text/primary']} style={{ fontSize: 22, fontWeight: '600' }}>
          {props.weekText}
        </Text>
        <Text color={c['text/secondary']} style={{ fontSize: 13 }}>
          {`of ${props.weekTargetText} · ${props.balanceText}`}
        </Text>
        <FilledTonalButton {...target} colors={{ containerColor: actionColor, contentColor: c['on-accent'] }}>
          <Text color={c['on-accent']} style={{ fontSize: 14, fontWeight: '600' }}>
            {props.primary.label}
          </Text>
        </FilledTonalButton>
      </Column>
    </Row>
  );
}

export function WorktimeNotification(props: WorktimeView, env: CustomNotificationEnvironment) {
  'widget';
  const c = props.theme[env.colorScheme === 'dark' ? 'dark' : 'light'];
  const tone = props.state === 'break' ? c.break : c.accent;
  const queued = !!(props.pending && props.pending.length);
  const heading = props.workplace ? `${props.title} · ${props.workplace}` : props.title;
  const detail = [props.sinceText ? `since ${props.sinceText}` : '', props.state === 'working' && props.endText ? `ends ${props.endText}` : ''].filter((t) => t).join(' · ');

  const press = (action: string) => {
    if (props.pending && props.pending.length) return undefined;
    const id = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (ch) => {
      const r = (Math.random() * 16) | 0;
      return (ch === 'x' ? r : (r & 3) | 8).toString(16);
    });
    return { pending: [{ id, action, at: Date.now() }] };
  };

  const buttons = () => {
    const first = props.primary;
    const second = props.secondary;
    if (queued) {
      return (
        <Text color={c['text/secondary']} style={{ fontSize: 13 }}>
          Queued: applies when Worktime opens
        </Text>
      );
    }
    return (
      <Row horizontalArrangement={{ spacedBy: 8 }}>
        <TextButton {...{ target: first.action }} onClick={() => press(first.action)} colors={{ contentColor: tone }}>
          <Text color={tone} style={{ fontSize: 14, fontWeight: '600' }}>
            {first.label.toUpperCase()}
          </Text>
        </TextButton>
        {second ? (
          <TextButton {...{ target: second.action }} onClick={() => press(second.action)} colors={{ contentColor: tone }}>
            <Text color={tone} style={{ fontSize: 14, fontWeight: '600' }}>
              {second.label.toUpperCase()}
            </Text>
          </TextButton>
        ) : (
          <Spacer />
        )}
      </Row>
    );
  };

  const body = (
    <Column modifiers={[fillMaxWidth(), paddingAll(12)]} verticalArrangement={{ spacedBy: 4 }} horizontalAlignment="start">
      <Text color={c['text/primary']} style={{ fontSize: 16, fontWeight: '600' }}>
        {heading}
      </Text>
      <Text color={c['text/secondary']} style={{ fontSize: 13 }}>
        {detail}
      </Text>
      {props.hasTarget ? <LinearProgressIndicator progress={props.progress} color={tone} trackColor={c['bg/track']} modifiers={[fillMaxWidth()]} /> : <Spacer modifiers={[height(4)]} />}
      {buttons()}
    </Column>
  );
  return { collapsed: body, expanded: body };
}
