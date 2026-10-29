package com.worktime.wear.data

import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock

const val COMMAND_PATH = "/worktime/command"
const val SNAPSHOT_PATH = "/worktime/snapshot"

/** Delivers a message to the paired phone. */
fun interface PhoneTransport {
    /** True once the message reached a connected phone; false when none is reachable. Never throws. */
    suspend fun send(path: String, payload: ByteArray): Boolean
}

/** Sends pending commands to the phone in tap order, stopping at the first failure so order is preserved. */
class CommandDispatcher(
    private val pending: PendingCommands,
    private val transport: PhoneTransport,
) {
    private val lock = Mutex()

    suspend fun flush() = lock.withLock {
        for (command in pending.commands.value.sortedBy { it.at }) {
            val delivered = transport.send(COMMAND_PATH, SurfaceJson.encode(command).toByteArray())
            if (!delivered) return
            pending.remove(command.id)
        }
    }
}
