package com.worktime.wear.surfaces.complication

import androidx.wear.watchface.complications.data.ComplicationData
import androidx.wear.watchface.complications.data.ComplicationText
import androidx.wear.watchface.complications.data.ComplicationType
import androidx.wear.watchface.complications.data.CountUpTimeReference
import androidx.wear.watchface.complications.data.NoDataComplicationData
import androidx.wear.watchface.complications.data.PlainComplicationText
import androidx.wear.watchface.complications.data.ShortTextComplicationData
import androidx.wear.watchface.complications.data.TimeDifferenceComplicationText
import androidx.wear.watchface.complications.data.TimeDifferenceStyle
import androidx.wear.watchface.complications.datasource.ComplicationRequest
import androidx.wear.watchface.complications.datasource.SuspendingComplicationDataSourceService
import com.worktime.wear.R
import com.worktime.wear.data.WorkState
import com.worktime.wear.data.WorktimeRepository
import com.worktime.wear.format.formatTimer
import java.time.Instant

/** Short text complication with the worked time; counts up on its own while working (no updates needed). */
class WorkedComplicationService : SuspendingComplicationDataSourceService() {
    override suspend fun onComplicationRequest(request: ComplicationRequest): ComplicationData? {
        if (request.complicationType != ComplicationType.SHORT_TEXT) return null
        val snapshot = WorktimeRepository.get(this).state.value ?: return NoDataComplicationData()
        val anchor = snapshot.workedAnchor
        val text: ComplicationText = if (snapshot.state == WorkState.Working && anchor != null) {
            TimeDifferenceComplicationText.Builder(TimeDifferenceStyle.STOPWATCH, CountUpTimeReference(Instant.ofEpochMilli(anchor))).build()
        } else {
            PlainComplicationText.Builder(formatTimer(snapshot.workedMs)).build()
        }
        return shortText(text, if (snapshot.state == WorkState.Break) getString(R.string.state_break) else null)
    }

    override fun getPreviewData(type: ComplicationType): ComplicationData? =
        if (type == ComplicationType.SHORT_TEXT) shortText(PlainComplicationText.Builder("5:50").build(), null) else null

    private fun shortText(text: ComplicationText, title: String?): ComplicationData =
        ShortTextComplicationData.Builder(text, PlainComplicationText.Builder(getString(R.string.complication_worked_description)).build())
            .apply { title?.let { setTitle(PlainComplicationText.Builder(it).build()) } }
            .setTapAction(openAppIntent())
            .build()
}
