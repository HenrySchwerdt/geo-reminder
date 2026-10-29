package com.worktime.wear.surfaces.complication

import androidx.wear.watchface.complications.data.ComplicationData
import androidx.wear.watchface.complications.data.ComplicationType
import androidx.wear.watchface.complications.data.NoDataComplicationData
import androidx.wear.watchface.complications.data.PlainComplicationText
import androidx.wear.watchface.complications.data.RangedValueComplicationData
import androidx.wear.watchface.complications.datasource.ComplicationRequest
import androidx.wear.watchface.complications.datasource.SuspendingComplicationDataSourceService
import com.worktime.wear.R
import com.worktime.wear.data.WorkState
import com.worktime.wear.data.WorktimeRepository
import com.worktime.wear.data.workedAt
import com.worktime.wear.format.formatTimer

/** Ranged complication: how much of today's target is worked, with the worked time as text. */
class ProgressComplicationService : SuspendingComplicationDataSourceService() {
    override suspend fun onComplicationRequest(request: ComplicationRequest): ComplicationData? {
        if (request.complicationType != ComplicationType.RANGED_VALUE) return null
        val snapshot = WorktimeRepository.get(this).state.value
            ?: return NoDataComplicationData()
        val now = System.currentTimeMillis()
        val worked = snapshot.workedAt(now)
        val target = snapshot.targetMs.coerceAtLeast(1)
        return ranged(
            value = worked.coerceAtMost(target).toFloat(),
            max = target.toFloat(),
            text = formatTimer(worked),
            title = if (snapshot.state == WorkState.Break) getString(R.string.state_break) else null,
        )
    }

    override fun getPreviewData(type: ComplicationType): ComplicationData? =
        if (type == ComplicationType.RANGED_VALUE) ranged(value = 21_000f, max = 30_000f, text = "5:50", title = null) else null

    private fun ranged(value: Float, max: Float, text: String, title: String?): ComplicationData =
        RangedValueComplicationData.Builder(
            value = value,
            min = 0f,
            max = max,
            contentDescription = PlainComplicationText.Builder(getString(R.string.complication_progress_description, text)).build(),
        )
            .setText(PlainComplicationText.Builder(text).build())
            .apply { title?.let { setTitle(PlainComplicationText.Builder(it).build()) } }
            .setTapAction(openAppIntent())
            .build()
}
