package com.worktime.wear.data

import com.google.android.gms.wearable.DataEvent
import com.google.android.gms.wearable.DataEventBuffer
import com.google.android.gms.wearable.DataMapItem
import com.google.android.gms.wearable.Node
import com.google.android.gms.wearable.WearableListenerService

/** Receives the phone's snapshots (even when the app is closed) and flushes queued commands when the phone connects. */
class DataLayerListenerService : WearableListenerService() {
    override fun onDataChanged(events: DataEventBuffer) {
        val repository = WorktimeRepository.get(this)
        events
            .filter { it.type == DataEvent.TYPE_CHANGED && it.dataItem.uri.path == SNAPSHOT_PATH }
            .mapNotNull { DataMapItem.fromDataItem(it.dataItem).dataMap.getString(WorktimeRepository.JSON_KEY) }
            .forEach(repository::onSnapshotJson)
    }

    override fun onPeerConnected(peer: Node) {
        WorktimeRepository.get(this).syncWithPhone()
    }
}
