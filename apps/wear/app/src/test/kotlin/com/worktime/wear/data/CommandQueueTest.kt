package com.worktime.wear.data

import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Test

class MemoryStore : KeyValueStore {
    private val values = mutableMapOf<String, String>()
    override fun get(key: String) = values[key]
    override fun put(key: String, value: String) {
        values[key] = value
    }
}

private fun cmd(id: String, at: Long, action: SurfaceAction = SurfaceAction.ClockIn) = SurfaceCommand(id, action, at)

class CommandQueueTest {
    @Test
    fun survivesRestart() {
        val store = MemoryStore()
        PendingCommands(store).apply {
            add(cmd("a", 1))
            add(cmd("b", 2))
            remove("a")
        }
        assertEquals(listOf("b"), PendingCommands(store).commands.value.map { it.id })
    }

    @Test
    fun keepsOriginalTapTime() {
        val store = MemoryStore()
        PendingCommands(store).add(cmd("a", 1_761_749_400_123))
        assertEquals(1_761_749_400_123, PendingCommands(store).commands.value.single().at)
    }

    @Test
    fun sendsInTapOrderAndEmptiesTheQueue() = runTest {
        val pending = PendingCommands(MemoryStore()).apply {
            add(cmd("late", 30))
            add(cmd("early", 10))
            add(cmd("middle", 20))
        }
        val sent = mutableListOf<SurfaceCommand>()
        CommandDispatcher(pending) { path, payload ->
            assertEquals(COMMAND_PATH, path)
            sent += SurfaceJson.parseCommand(String(payload))!!
            true
        }.flush()
        assertEquals(listOf("early", "middle", "late"), sent.map { it.id })
        assertEquals(emptyList<SurfaceCommand>(), pending.commands.value)
    }

    @Test
    fun keepsEverythingWhileThePhoneIsAway() = runTest {
        val pending = PendingCommands(MemoryStore()).apply {
            add(cmd("a", 1))
            add(cmd("b", 2))
        }
        var attempts = 0
        CommandDispatcher(pending) { _, _ -> attempts++; false }.flush()
        assertEquals(1, attempts) // stops at the first failure so order is preserved
        assertEquals(listOf("a", "b"), pending.commands.value.map { it.id })
    }

    @Test
    fun resumesWhereItStoppedWhenTheConnectionDrops() = runTest {
        val pending = PendingCommands(MemoryStore()).apply {
            add(cmd("a", 1))
            add(cmd("b", 2))
            add(cmd("c", 3))
        }
        var calls = 0
        val dispatcher = CommandDispatcher(pending) { _, _ -> ++calls != 2 }
        dispatcher.flush()
        assertEquals(listOf("b", "c"), pending.commands.value.map { it.id })
        dispatcher.flush()
        assertEquals(emptyList<SurfaceCommand>(), pending.commands.value)
    }
}
