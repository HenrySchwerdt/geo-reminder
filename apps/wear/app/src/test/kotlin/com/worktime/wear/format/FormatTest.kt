package com.worktime.wear.format

import com.worktime.wear.data.SurfaceSnapshot
import com.worktime.wear.data.WorkState
import java.util.Locale
import org.junit.Assert.assertEquals
import org.junit.Test

class FormatTest {
    private val working = SurfaceSnapshot(
        version = 1, state = WorkState.Working, day = "2026-10-29", workedMs = 0, breakMs = 0,
        workedAnchor = 1_000_000, since = 1_000_000, targetMs = 8 * 3_600_000L,
        weekWorkedMs = 0, weekTargetMs = 0, weekBalanceMs = 0, tz = "Europe/Berlin", updatedAt = 1_000_000,
    )

    @Test
    fun timerShowsHoursAndMinutes() {
        assertEquals("5:50", formatTimer(5 * 3_600_000L + 50 * 60_000L + 59_000))
        assertEquals("0:00", formatTimer(0))
        assertEquals("12:05", formatTimer(12 * 3_600_000L + 5 * 60_000L))
        assertEquals("0:00", formatTimer(-5))
    }

    @Test
    fun durationsAndBalances() {
        assertEquals("8h 09m", formatDuration(8 * 3_600_000L + 9 * 60_000L))
        assertEquals("42m", formatDuration(42 * 60_000L))
        assertEquals("+6h 20m", formatBalance(6 * 3_600_000L + 20 * 60_000L))
        assertEquals("-45m", formatBalance(-45 * 60_000L))
        assertEquals("+0m", formatBalance(0))
    }

    @Test
    fun clockUsesTheSnapshotsZone() {
        val noonUtc = 1_793_275_200_000 // 2026-10-29T12:00:00Z; Berlin is UTC+1 after the DST change
        assertEquals("13:00", formatClock(noonUtc, "Europe/Berlin", Locale.GERMANY))
        assertEquals("12:00", formatClock(noonUtc, "UTC", Locale.GERMANY))
    }

    @Test
    fun progressCountsFromTheAnchorAndIsClamped() {
        assertEquals(0.5f, progressOf(working, 1_000_000 + 4 * 3_600_000L), 0.001f)
        assertEquals(1f, progressOf(working, 1_000_000 + 12 * 3_600_000L), 0f)
        assertEquals(0f, progressOf(working.copy(targetMs = 0), 5_000_000), 0f)
    }

    @Test
    fun breakElapsedRunsFromBreakStart() {
        val onBreak = working.copy(state = WorkState.Break, workedAnchor = null, since = 2_000)
        assertEquals(3_000, breakElapsed(onBreak, 5_000))
        assertEquals(0, breakElapsed(working, 5_000))
    }
}
