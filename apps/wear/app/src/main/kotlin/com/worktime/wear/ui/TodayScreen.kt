package com.worktime.wear.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.wear.compose.material3.Button
import androidx.wear.compose.material3.ButtonDefaults
import androidx.wear.compose.material3.CircularProgressIndicator
import androidx.wear.compose.material3.Icon
import androidx.wear.compose.material3.MaterialTheme
import androidx.wear.compose.material3.ProgressIndicatorDefaults
import androidx.wear.compose.material3.Text
import androidx.wear.compose.material3.TimeText
import com.worktime.wear.R
import com.worktime.wear.data.SurfaceAction
import com.worktime.wear.data.SurfaceSnapshot
import com.worktime.wear.data.WorkState
import com.worktime.wear.data.workedAt
import com.worktime.wear.format.breakElapsed
import com.worktime.wear.format.formatBalance
import com.worktime.wear.format.formatClock
import com.worktime.wear.format.formatDuration
import com.worktime.wear.format.formatTimer
import com.worktime.wear.format.progressOf

/**
 * The watch's home: state, live timer, progress ring and the one action that makes sense now.
 * Everything shown is derived from the phone's [snapshot] and [now]; nothing is computed from history.
 */
@Composable
fun TodayScreen(
    snapshot: SurfaceSnapshot?,
    now: Long,
    pendingCount: Int,
    onAction: (SurfaceAction) -> Unit,
    onClockOut: () -> Unit,
) {
    Box(Modifier.fillMaxSize()) {
        if (snapshot == null) {
            NoDataScreen()
            return@Box
        }
        val accent = if (snapshot.state == WorkState.Break) WorktimeColors.Break else WorktimeColors.Accent
        CircularProgressIndicator(
            progress = { progressOf(snapshot, now) },
            modifier = Modifier.fillMaxSize(),
            colors = ProgressIndicatorDefaults.colors(indicatorColor = accent, trackColor = WorktimeColors.Track),
        )
        TimeText()
        Column(
            modifier = Modifier.fillMaxSize().padding(horizontal = 28.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center,
        ) {
            when (snapshot.state) {
                WorkState.Working -> Working(snapshot, now, pendingCount, onAction, onClockOut)
                WorkState.Break -> OnBreak(snapshot, now, pendingCount, onAction)
                WorkState.Off -> NotWorking(snapshot, pendingCount, onAction)
            }
        }
    }
}

@Composable
private fun Working(
    snapshot: SurfaceSnapshot,
    now: Long,
    pendingCount: Int,
    onAction: (SurfaceAction) -> Unit,
    onClockOut: () -> Unit,
) {
    Header(stringResource(R.string.state_working), WorktimeColors.Accent, formatTimer(snapshot.workedAt(now)))
    Note(pendingCount, snapshot.expectedEnd?.let { stringResource(R.string.ends_at, formatClock(it, snapshot.tz)) })
    Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
        RoundButton(R.drawable.ic_cup, stringResource(R.string.action_break), WorktimeColors.BreakSoft, WorktimeColors.Break, { onAction(SurfaceAction.StartBreak) })
        RoundButton(R.drawable.ic_stop, stringResource(R.string.action_clock_out), WorktimeColors.Sunken, WorktimeColors.TextPrimary, onClockOut)
    }
}

@Composable
private fun OnBreak(snapshot: SurfaceSnapshot, now: Long, pendingCount: Int, onAction: (SurfaceAction) -> Unit) {
    Header(stringResource(R.string.state_break), WorktimeColors.Break, formatTimer(breakElapsed(snapshot, now)))
    Note(pendingCount, stringResource(R.string.worked_so_far, formatTimer(snapshot.workedMs)))
    PillButton(R.drawable.ic_play, stringResource(R.string.action_resume)) { onAction(SurfaceAction.EndBreak) }
}

@Composable
private fun NotWorking(snapshot: SurfaceSnapshot, pendingCount: Int, onAction: (SurfaceAction) -> Unit) {
    val title = snapshot.workplaceName ?: stringResource(R.string.state_off)
    Text(title, style = MaterialTheme.typography.bodyMedium, color = WorktimeColors.TextSecondary, maxLines = 1)
    Text(
        text = if (snapshot.workedMs > 0) stringResource(R.string.today_worked, formatDuration(snapshot.workedMs)) else stringResource(R.string.state_off),
        style = MaterialTheme.typography.titleMedium,
        maxLines = 1,
    )
    Spacer(Modifier.height(8.dp))
    PillButton(R.drawable.ic_play, stringResource(R.string.action_clock_in)) { onAction(SurfaceAction.ClockIn) }
    Note(pendingCount, stringResource(R.string.week_balance, formatBalance(snapshot.weekBalanceMs)))
}

@Composable
private fun Header(label: String, color: Color, timer: String) {
    Text(label.uppercase(), style = MaterialTheme.typography.labelMedium, color = color)
    Text(timer, style = MaterialTheme.typography.numeralLarge)
}

/** The line under the timer; replaced by the offline note while commands wait for the phone. */
@Composable
private fun Note(pendingCount: Int, normal: String?) {
    val text = if (pendingCount > 0) stringResource(R.string.sync_pending) else normal
    Text(
        text = text.orEmpty(),
        style = MaterialTheme.typography.bodySmall,
        color = WorktimeColors.TextSecondary,
        textAlign = TextAlign.Center,
        maxLines = 2,
        modifier = Modifier.padding(vertical = 6.dp).fillMaxWidth(),
    )
}

@Composable
private fun PillButton(icon: Int, label: String, onClick: () -> Unit) {
    Button(
        onClick = onClick,
        modifier = Modifier.fillMaxWidth(),
        colors = ButtonDefaults.buttonColors(containerColor = WorktimeColors.Accent, contentColor = WorktimeColors.OnAccent),
        icon = { Icon(painterResource(icon), contentDescription = null, modifier = Modifier.size(20.dp)) },
    ) {
        Text(label, style = MaterialTheme.typography.labelLarge, maxLines = 1)
    }
}

/** Before the phone has published anything (first run, phone out of reach). */
@Composable
private fun NoDataScreen() {
    Column(
        modifier = Modifier.fillMaxSize().padding(horizontal = 32.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        Icon(painterResource(R.drawable.ic_sync), contentDescription = null, tint = WorktimeColors.TextSecondary)
        Spacer(Modifier.height(8.dp))
        Text(stringResource(R.string.open_phone), style = MaterialTheme.typography.titleSmall, textAlign = TextAlign.Center)
        Text(
            stringResource(R.string.sync_pending),
            style = MaterialTheme.typography.bodySmall,
            color = WorktimeColors.TextSecondary,
            textAlign = TextAlign.Center,
        )
    }
}
