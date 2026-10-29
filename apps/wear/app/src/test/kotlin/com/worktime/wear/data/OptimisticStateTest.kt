package com.worktime.wear.data

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class OptimisticStateTest {
    private val off = SurfaceSnapshot(
        version = 1, state = WorkState.Off, day = "2026-10-29", workedMs = 0, breakMs = 0, targetMs = 28_800_000,
        weekWorkedMs = 0, weekTargetMs = 144_000_000, weekBalanceMs = 0, tz = "UTC", updatedAt = 0,
    )

    private fun cmd(action: SurfaceAction, at: Long) = SurfaceCommand("id-$action-$at", action, at)

    @Test
    fun clockInStartsTheTimerAtTheTapTime() {
        val s = off.withPending(listOf(cmd(SurfaceAction.ClockIn, 1_000)))
        assertEquals(WorkState.Working, s.state)
        assertEquals(1_000L, s.workedAnchor)
        assertEquals(5_000, s.workedAt(6_000))
    }

    @Test
    fun clockInContinuesTheDaysWorkedTime() {
        val s = off.copy(workedMs = 3_600_000).withPending(listOf(cmd(SurfaceAction.ClockIn, 10_000)))
        assertEquals(3_600_000 + 5_000, s.workedAt(15_000))
    }

    @Test
    fun breakFreezesWorkedTimeAndResumeContinuesIt() {
        val pending = listOf(
            cmd(SurfaceAction.ClockIn, 0),
            cmd(SurfaceAction.StartBreak, 60_000),
            cmd(SurfaceAction.EndBreak, 90_000),
        )
        val onBreak = off.withPending(pending.take(2))
        assertEquals(WorkState.Break, onBreak.state)
        assertEquals(60_000, onBreak.workedMs)
        assertNull(onBreak.workedAnchor)

        val resumed = off.withPending(pending)
        assertEquals(WorkState.Working, resumed.state)
        assertEquals(30_000, resumed.breakMs)
        assertEquals(60_000 + 10_000, resumed.workedAt(100_000))
    }

    @Test
    fun clockOutEndsTheSession() {
        val s = off.withPending(listOf(cmd(SurfaceAction.ClockIn, 0), cmd(SurfaceAction.ClockOut, 120_000)))
        assertEquals(WorkState.Off, s.state)
        assertEquals(120_000, s.workedMs)
        assertNull(s.since)
    }

    @Test
    fun appliesInTapOrderAndSkipsInvalidTransitions() {
        val s = off.withPending(
            listOf(
                cmd(SurfaceAction.ClockIn, 3), // listed first, tapped last
                cmd(SurfaceAction.ClockOut, 1), // nothing to clock out of yet
                cmd(SurfaceAction.EndBreak, 2), // not on a break
            ),
        )
        assertEquals(WorkState.Working, s.state)
        assertEquals(3L, s.since)
    }
}
