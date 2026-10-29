package com.worktime.wear.surfaces.complication

import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import com.worktime.wear.MainActivity

/** Tapping a complication opens the app. */
internal fun Context.openAppIntent(): PendingIntent =
    PendingIntent.getActivity(
        this,
        0,
        Intent(this, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK),
        PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
    )
