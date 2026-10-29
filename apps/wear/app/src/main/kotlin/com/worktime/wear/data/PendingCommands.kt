package com.worktime.wear.data

import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

/**
 * Commands tapped on the watch that the phone has not received yet, oldest first. Persisted so a restart
 * (or a long walk away from the phone) loses nothing; every command keeps the time of its tap.
 */
class PendingCommands(private val store: KeyValueStore) {
    private val state = MutableStateFlow(SurfaceJson.parseCommands(store.get(KEY).orEmpty()))
    val commands: StateFlow<List<SurfaceCommand>> = state.asStateFlow()

    @Synchronized
    fun add(command: SurfaceCommand) = update { (it + command).takeLast(MAX) }

    @Synchronized
    fun remove(id: String) = update { list -> list.filterNot { it.id == id } }

    private fun update(change: (List<SurfaceCommand>) -> List<SurfaceCommand>) {
        val next = change(state.value)
        store.put(KEY, SurfaceJson.encodeCommands(next))
        state.value = next
    }

    private companion object {
        const val KEY = "pendingCommands"
        const val MAX = 200
    }
}
