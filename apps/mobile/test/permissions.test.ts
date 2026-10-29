import { beforeEach, describe, expect, it, vi } from 'vitest';

const location = vi.hoisted(() => ({
  requestForegroundPermissionsAsync: vi.fn(),
  requestBackgroundPermissionsAsync: vi.fn(),
}));
vi.mock('expo-location', () => location);

import { requestAlwaysLocation, requestForegroundLocation } from '@/features/geofencing/permissions';

beforeEach(() => vi.resetAllMocks());

describe('incremental location permissions', () => {
  it('requests only While Using during initial onboarding', async () => {
    location.requestForegroundPermissionsAsync.mockResolvedValue({ granted: true });
    expect(await requestForegroundLocation()).toBe('whenInUse');
    expect(location.requestBackgroundPermissionsAsync).not.toHaveBeenCalled();
  });

  it('keeps a declined foreground request optional', async () => {
    location.requestForegroundPermissionsAsync.mockResolvedValue({ granted: false, canAskAgain: false });
    expect(await requestForegroundLocation()).toBe('denied');
    expect(await requestAlwaysLocation()).toBe('denied');
    expect(location.requestBackgroundPermissionsAsync).not.toHaveBeenCalled();
  });

  it('requests background access after foreground access is granted', async () => {
    location.requestForegroundPermissionsAsync.mockResolvedValue({ granted: true });
    location.requestBackgroundPermissionsAsync.mockResolvedValue({ granted: true });
    expect(await requestAlwaysLocation()).toBe('always');
    expect(location.requestForegroundPermissionsAsync.mock.invocationCallOrder[0])
      .toBeLessThan(location.requestBackgroundPermissionsAsync.mock.invocationCallOrder[0]);
  });

  it('retains foreground access if the background upgrade is declined', async () => {
    location.requestForegroundPermissionsAsync.mockResolvedValue({ granted: true });
    location.requestBackgroundPermissionsAsync.mockResolvedValue({ granted: false });
    expect(await requestAlwaysLocation()).toBe('whenInUse');
  });
});
