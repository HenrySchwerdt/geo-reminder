package com.worktime.wear.data

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class SurfaceJsonTest {
    // Shape produced by `JSON.stringify(buildSnapshot(...))` in packages/core: undefined fields are omitted.
    private val working = """
        {"version":1,"state":"working","day":"2026-10-29","workedMs":21000000,"breakMs":900000,
         "workedAnchor":1761728400000,"since":1761728400000,"sessionStart":1761724800000,
         "targetMs":28800000,"expectedEnd":1761757200000,"workplaceName":"Studio Kreuzberg",
         "weekWorkedMs":50000000,"weekTargetMs":144000000,"weekBalanceMs":-1200000,
         "tz":"Europe/Berlin","updatedAt":1761749400000}
    """.trimIndent()

    @Test
    fun parsesWorkingSnapshot() {
        val s = SurfaceJson.parseSnapshot(working)!!
        assertEquals(WorkState.Working, s.state)
        assertEquals(1761728400000, s.workedAnchor)
        assertEquals("Studio Kreuzberg", s.workplaceName)
        assertEquals(-1_200_000, s.weekBalanceMs)
    }

    @Test
    fun optionalFieldsMayBeAbsent() {
        val s = SurfaceJson.parseSnapshot(
            """{"version":1,"state":"off","day":"2026-10-29","workedMs":0,"breakMs":0,"targetMs":0,
               "weekWorkedMs":0,"weekTargetMs":0,"weekBalanceMs":0,"tz":"UTC","updatedAt":1}""",
        )!!
        assertEquals(WorkState.Off, s.state)
        assertNull(s.workedAnchor)
        assertNull(s.expectedEnd)
    }

    @Test
    fun acceptsFractionalMilliseconds() {
        // dailyTarget() on the phone is a float for e.g. 40h over 6 days.
        val s = SurfaceJson.parseSnapshot(working.replace("28800000", "24000000.000000004"))!!
        assertEquals(24_000_000, s.targetMs)
    }

    @Test
    fun ignoresUnknownKeys() {
        assertEquals(WorkState.Working, SurfaceJson.parseSnapshot(working.replace("{\"version\"", "{\"future\":true,\"version\""))!!.state)
    }

    @Test
    fun ignoresUnknownVersionsAndGarbage() {
        assertNull(SurfaceJson.parseSnapshot(working.replace("\"version\":1", "\"version\":2")))
        assertNull(SurfaceJson.parseSnapshot("""{"version":2,"somethingElse":[]}"""))
        assertNull(SurfaceJson.parseSnapshot("not json"))
        assertNull(SurfaceJson.parseSnapshot("""{"state":"working"}"""))
        assertNull(SurfaceJson.parseSnapshot(working.replace("\"working\"", "\"sleeping\"")))
    }

    @Test
    fun encodesCommandsLikeTheContract() {
        val json = SurfaceJson.encode(SurfaceCommand(id = "abc", action = SurfaceAction.StartBreak, at = 1761749400123, tz = "Europe/Berlin"))
        assertTrue(json, json.contains("\"id\":\"abc\""))
        assertTrue(json, json.contains("\"action\":\"startBreak\""))
        assertTrue(json, json.contains("\"at\":1761749400123"))
        assertTrue(json, json.contains("\"source\":\"watch\""))
        assertTrue(json, json.contains("\"tz\":\"Europe/Berlin\""))
    }

    @Test
    fun commandRoundTrips() {
        val command = SurfaceCommand(id = "x", action = SurfaceAction.ClockOut, at = 5)
        assertEquals(command, SurfaceJson.parseCommand(SurfaceJson.encode(command)))
        assertEquals(listOf(command), SurfaceJson.parseCommands(SurfaceJson.encodeCommands(listOf(command))))
    }
}
