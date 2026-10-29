package com.worktime.wear

import android.app.Application
import com.worktime.wear.data.WorktimeRepository

class WorktimeApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        // Load the stored snapshot and queue before any tile, complication or listener asks for them.
        WorktimeRepository.get(this)
    }
}
