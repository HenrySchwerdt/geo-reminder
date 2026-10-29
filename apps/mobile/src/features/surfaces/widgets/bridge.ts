/**
 * Glue between native surface taps and the surfaces hub: turns interaction events and taps recorded by a layout
 * into `SurfaceCommand`s and applies them. Platform adapters (`adapters/widgets.*.ts`) supply the native side.
 */
import type { SurfaceCommand } from '@worktime/core';

import { newId } from '@/shared/lib/id';
import { runSurfaceCommand } from '../index';
import { actionOfTarget } from './model';

/** The command for an interaction event (button `target` = action name) at the time of the tap. */
export function commandFromEvent(event: { target?: unknown; timestamp?: number }, source: SurfaceCommand['source']): SurfaceCommand | undefined {
  const action = actionOfTarget(event.target);
  if (!action) return undefined;
  const at = typeof event.timestamp === 'number' && event.timestamp > 0 ? Math.round(event.timestamp) : Date.now();
  return { id: newId(), action, at, source };
}

/** Apply commands oldest first; returns how many were new (the hub ignores ids it has already applied). */
export function applyCommands(commands: SurfaceCommand[]): number {
  const unique = new Map(commands.map((c) => [c.id, c]));
  return [...unique.values()].sort((a, b) => a.at - b.at).filter((c) => runSurfaceCommand(c)).length;
}
