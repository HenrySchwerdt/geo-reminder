package com.worktime.wear.surfaces.tile

import android.app.Activity
import android.os.Bundle
import com.worktime.wear.data.SurfaceAction
import com.worktime.wear.data.WorktimeRepository

/** Invisible activity a tile button opens: queues the tapped action (with the time of the tap) and closes. */
class TileActionActivity : Activity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val action = runCatching { SurfaceAction.valueOf(intent.getStringExtra(EXTRA_ACTION).orEmpty()) }.getOrNull()
        if (action != null && action != SurfaceAction.ClockOut) {
            WorktimeRepository.get(this).submit(action)
        }
        finish()
    }

    companion object {
        const val EXTRA_ACTION = "action"
    }
}
