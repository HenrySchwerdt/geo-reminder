package com.worktime.wear.data

import android.content.Context
import com.google.android.gms.wearable.DataMapItem
import com.google.android.gms.wearable.Wearable
import com.worktime.wear.surfaces.SurfaceRefresher
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import kotlinx.coroutines.tasks.await
import java.time.ZoneId
import java.util.UUID

/**
 * The watch's single source of truth: the latest snapshot from the phone plus the commands still waiting to be
 * sent. The watch never edits history; it shows [state] and queues taps.
 */
class WorktimeRepository private constructor(context: Context) {
    private val appContext = context.applicationContext
    private val store = PreferencesStore(appContext)
    private val pending = PendingCommands(store)
    private val dispatcher = CommandDispatcher(pending, MessageClientTransport(appContext))
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Default)

    private val latest = MutableStateFlow(store.get(SNAPSHOT_KEY)?.let(SurfaceJson::parseSnapshot))

    /** The phone's last snapshot with unsent taps applied; null until the phone has published once. */
    val state: StateFlow<SurfaceSnapshot?> = combine(latest, pending.commands) { snapshot, commands ->
        snapshot?.withPending(commands)
    }.stateIn(scope, SharingStarted.Eagerly, latest.value?.withPending(pending.commands.value))

    /** Taps that the phone has not acknowledged yet (drives the "Will sync when your phone is nearby" note). */
    val pendingCount: StateFlow<Int> = pending.commands.map { it.size }
        .stateIn(scope, SharingStarted.Eagerly, pending.commands.value.size)

    /** Queue a tap with its real time and try to deliver it right away. */
    fun submit(action: SurfaceAction, now: Long = System.currentTimeMillis()) {
        pending.add(
            SurfaceCommand(
                id = UUID.randomUUID().toString(),
                action = action,
                at = now,
                tz = ZoneId.systemDefault().id,
            ),
        )
        SurfaceRefresher.refresh(appContext)
        flush()
    }

    fun flush() {
        scope.launch { dispatcher.flush() }
    }

    /** Called with the JSON the phone put on the Data Layer. Older or unknown-version snapshots are ignored. */
    fun onSnapshotJson(json: String) {
        val snapshot = SurfaceJson.parseSnapshot(json) ?: return
        if (snapshot.updatedAt < (latest.value?.updatedAt ?: 0)) return
        store.put(SNAPSHOT_KEY, json)
        latest.value = snapshot
        SurfaceRefresher.refresh(appContext)
    }

    /** Reads what the phone published while this app was not running, then sends anything still queued. */
    fun syncWithPhone() {
        scope.launch {
            runCatching {
                val items = Wearable.getDataClient(appContext).dataItems.await()
                try {
                    items.firstOrNull { it.uri.path == SNAPSHOT_PATH }
                        ?.let { DataMapItem.fromDataItem(it).dataMap.getString(JSON_KEY) }
                        ?.let(::onSnapshotJson)
                } finally {
                    items.release()
                }
            }
            dispatcher.flush()
        }
    }

    companion object {
        const val JSON_KEY = "json"
        private const val SNAPSHOT_KEY = "snapshot"

        @Volatile
        private var instance: WorktimeRepository? = null

        fun get(context: Context): WorktimeRepository =
            instance ?: synchronized(this) { instance ?: WorktimeRepository(context).also { instance = it } }
    }
}
