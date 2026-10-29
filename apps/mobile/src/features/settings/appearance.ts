import type { Appearance } from '@worktime/core';

export type Scheme = 'light' | 'dark';

/** The scheme to draw with: the user's choice, or the system's when they follow it. */
export const resolveScheme = (appearance: Appearance, system: string | null | undefined): Scheme =>
  appearance === 'system' ? (system === 'dark' ? 'dark' : 'light') : appearance;

export const APPEARANCE_LABEL: Record<Appearance, string> = { system: 'System', light: 'Light', dark: 'Dark' };
