package com.worktime.wear.surfaces.tile

import android.content.Context
import androidx.wear.protolayout.ActionBuilders
import androidx.wear.protolayout.ColorBuilders.argb
import androidx.wear.protolayout.DimensionBuilders.dp
import androidx.wear.protolayout.DimensionBuilders.sp
import androidx.wear.protolayout.LayoutElementBuilders
import androidx.wear.protolayout.LayoutElementBuilders.Box
import androidx.wear.protolayout.LayoutElementBuilders.Column
import androidx.wear.protolayout.LayoutElementBuilders.FontStyle
import androidx.wear.protolayout.LayoutElementBuilders.LayoutElement
import androidx.wear.protolayout.LayoutElementBuilders.Row
import androidx.wear.protolayout.LayoutElementBuilders.Spacer
import androidx.wear.protolayout.LayoutElementBuilders.Text
import androidx.wear.protolayout.ModifiersBuilders.Background
import androidx.wear.protolayout.ModifiersBuilders.Clickable
import androidx.wear.protolayout.ModifiersBuilders.Corner
import androidx.wear.protolayout.ModifiersBuilders.Modifiers
import com.worktime.wear.MainActivity
import com.worktime.wear.R
import com.worktime.wear.data.SurfaceAction
import com.worktime.wear.data.SurfaceSnapshot
import com.worktime.wear.data.WorkState
import com.worktime.wear.data.workedAt
import com.worktime.wear.format.breakElapsed
import com.worktime.wear.format.formatTimer
import com.worktime.wear.format.progressOf

private const val CANVAS_TEXT = 0xFFF3F2ED.toInt()
private const val TEXT_SECONDARY = 0xFFA7ABA5.toInt()
private const val ACCENT = 0xFF5CC99B.toInt()
private const val ON_ACCENT = 0xFF06140E.toInt()
private const val BREAK = 0xFFF2B04E.toInt()
private const val TRACK = 0xFF2C302C.toInt()
private const val BAR_WIDTH_DP = 140f

/** The tile's ProtoLayout: label, timer, progress bar, one button. Static per request; the service refreshes it every minute. */
class TileLayout(private val context: Context) {
    fun build(snapshot: SurfaceSnapshot?, pendingCount: Int, now: Long): LayoutElement {
        if (snapshot == null) return column(text(context.getString(R.string.open_phone), 14f, CANVAS_TEXT))

        val (label, labelColor, big) = when (snapshot.state) {
            WorkState.Working -> Triple(context.getString(R.string.app_name), ACCENT, formatTimer(snapshot.workedAt(now)))
            WorkState.Break -> Triple(context.getString(R.string.state_break), BREAK, formatTimer(breakElapsed(snapshot, now)))
            WorkState.Off -> Triple(context.getString(R.string.app_name), ACCENT, formatTimer(snapshot.workedMs))
        }
        val barColor = if (snapshot.state == WorkState.Break) BREAK else ACCENT
        return column(
            text(label, 14f, labelColor),
            text(big, 34f, CANVAS_TEXT, bold = true),
            spacer(8f),
            progressBar(progressOf(snapshot, now), barColor),
            spacer(10f),
            if (pendingCount > 0) text(context.getString(R.string.sync_pending), 11f, TEXT_SECONDARY) else actionButton(snapshot.state),
        )
    }

    private fun actionButton(state: WorkState): LayoutElement = when (state) {
        WorkState.Working -> button(R.string.action_clock_out, CANVAS_TEXT, ON_ACCENT, confirmClockOut())
        WorkState.Break -> button(R.string.action_resume, ACCENT, ON_ACCENT, act(SurfaceAction.EndBreak))
        WorkState.Off -> button(R.string.action_clock_in, ACCENT, ON_ACCENT, act(SurfaceAction.ClockIn))
    }

    private fun button(label: Int, background: Int, foreground: Int, click: Clickable): LayoutElement =
        Box.Builder()
            .setWidth(dp(BAR_WIDTH_DP))
            .setHeight(dp(44f))
            .setModifiers(
                Modifiers.Builder()
                    .setBackground(Background.Builder().setColor(argb(background)).setCorner(Corner.Builder().setRadius(dp(22f)).build()).build())
                    .setClickable(click)
                    .build(),
            )
            .addContent(text(context.getString(label), 16f, foreground, bold = true))
            .build()

    private fun launch(extras: Pair<String, String>): Clickable {
        val activity = ActionBuilders.AndroidActivity.Builder()
            .setPackageName(context.packageName)
            .setClassName(if (extras.first == MainActivity.EXTRA_CONFIRM) MainActivity::class.java.name else TileActionActivity::class.java.name)
            .addKeyToExtraMapping(extras.first, ActionBuilders.stringExtra(extras.second))
            .build()
        return Clickable.Builder()
            .setId(extras.second)
            .setOnClick(ActionBuilders.LaunchAction.Builder().setAndroidActivity(activity).build())
            .build()
    }

    private fun act(action: SurfaceAction) = launch(TileActionActivity.EXTRA_ACTION to action.name)

    /** Clock out is destructive: open the app, which asks for confirmation. */
    private fun confirmClockOut() = launch(MainActivity.EXTRA_CONFIRM to MainActivity.CONFIRM_CLOCK_OUT)

    private fun progressBar(progress: Float, color: Int): LayoutElement {
        val filled = BAR_WIDTH_DP * progress
        fun segment(width: Float, segmentColor: Int) = Box.Builder()
            .setWidth(dp(width))
            .setHeight(dp(8f))
            .setModifiers(
                Modifiers.Builder()
                    .setBackground(Background.Builder().setColor(argb(segmentColor)).setCorner(Corner.Builder().setRadius(dp(4f)).build()).build())
                    .build(),
            )
            .build()
        return Row.Builder()
            .addContent(segment(filled, color))
            .addContent(segment(BAR_WIDTH_DP - filled, TRACK))
            .build()
    }

    private fun text(value: String, size: Float, color: Int, bold: Boolean = false): LayoutElement =
        Text.Builder()
            .setText(value)
            .setFontStyle(
                FontStyle.Builder()
                    .setSize(sp(size))
                    .setColor(argb(color))
                    .setWeight(if (bold) LayoutElementBuilders.FONT_WEIGHT_BOLD else LayoutElementBuilders.FONT_WEIGHT_NORMAL)
                    .build(),
            )
            .build()

    private fun spacer(height: Float): LayoutElement = Spacer.Builder().setHeight(dp(height)).build()

    private fun column(vararg children: LayoutElement): LayoutElement =
        Column.Builder()
            .setHorizontalAlignment(LayoutElementBuilders.HORIZONTAL_ALIGN_CENTER)
            .apply { children.forEach(::addContent) }
            .build()
}
