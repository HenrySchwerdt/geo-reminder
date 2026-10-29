package com.worktime.wear.surfaces.tile

import androidx.concurrent.futures.CallbackToFutureAdapter
import androidx.wear.protolayout.ResourceBuilders.Resources
import androidx.wear.protolayout.TimelineBuilders.Timeline
import androidx.wear.tiles.RequestBuilders
import androidx.wear.tiles.TileBuilders.Tile
import androidx.wear.tiles.TileService
import com.google.common.util.concurrent.ListenableFuture
import com.worktime.wear.data.WorktimeRepository

private const val RESOURCES_VERSION = "1"
private const val FRESHNESS_MS = 60_000L

/**
 * Tile with the state, the day's progress and one action. The buttons open [TileActionActivity] (queues the
 * command without any UI) or, for Clock out, the app's confirmation; the tile is redrawn when the state changes.
 */
class WorktimeTileService : TileService() {
    override fun onTileRequest(requestParams: RequestBuilders.TileRequest): ListenableFuture<Tile> {
        val repository = WorktimeRepository.get(this)
        val layout = TileLayout(this).build(repository.state.value, repository.pendingCount.value, System.currentTimeMillis())
        val tile = Tile.Builder()
            .setResourcesVersion(RESOURCES_VERSION)
            .setFreshnessIntervalMillis(FRESHNESS_MS)
            .setTileTimeline(Timeline.fromLayoutElement(layout))
            .build()
        return immediate(tile)
    }

    override fun onTileResourcesRequest(requestParams: RequestBuilders.ResourcesRequest): ListenableFuture<Resources> =
        immediate(Resources.Builder().setVersion(RESOURCES_VERSION).build())

    private fun <T : Any> immediate(value: T): ListenableFuture<T> =
        CallbackToFutureAdapter.getFuture { completer ->
            completer.set(value)
            "worktime-tile"
        }
}
