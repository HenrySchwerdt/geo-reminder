package com.worktime.wear.surfaces

import android.content.ComponentName
import android.content.Context
import androidx.wear.tiles.TileService
import androidx.wear.watchface.complications.datasource.ComplicationDataSourceUpdateRequester
import com.worktime.wear.surfaces.complication.ProgressComplicationService
import com.worktime.wear.surfaces.complication.WorkedComplicationService
import com.worktime.wear.surfaces.tile.WorktimeTileService

/** Asks the system to redraw the tile and complications after the state changed. */
object SurfaceRefresher {
    fun refresh(context: Context) {
        runCatching {
            TileService.getUpdater(context).requestUpdate(WorktimeTileService::class.java)
            listOf(ProgressComplicationService::class.java, WorkedComplicationService::class.java).forEach {
                ComplicationDataSourceUpdateRequester.create(context, ComponentName(context, it)).requestUpdateAll()
            }
        }
    }
}
