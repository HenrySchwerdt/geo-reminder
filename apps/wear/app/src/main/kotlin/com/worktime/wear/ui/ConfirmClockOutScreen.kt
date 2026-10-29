package com.worktime.wear.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.wear.compose.material3.MaterialTheme
import androidx.wear.compose.material3.Text
import com.worktime.wear.R
import com.worktime.wear.data.SurfaceSnapshot
import com.worktime.wear.data.workedAt
import com.worktime.wear.format.formatDuration

/** Clocking out ends the session, so it asks once. Tapping the check queues the command with the time of the tap. */
@Composable
fun ConfirmClockOutScreen(snapshot: SurfaceSnapshot?, now: Long, onConfirm: () -> Unit, onCancel: () -> Unit) {
    Column(
        modifier = Modifier.fillMaxSize().padding(horizontal = 28.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        Text(stringResource(R.string.confirm_title), style = MaterialTheme.typography.titleLarge)
        snapshot?.let {
            Text(
                stringResource(R.string.worked_today, formatDuration(it.workedAt(now))),
                style = MaterialTheme.typography.bodyMedium,
                color = WorktimeColors.TextSecondary,
                textAlign = TextAlign.Center,
                modifier = Modifier.padding(vertical = 12.dp),
            )
        }
        Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
            RoundButton(R.drawable.ic_close, stringResource(R.string.cancel), WorktimeColors.Sunken, WorktimeColors.TextPrimary, onCancel)
            RoundButton(R.drawable.ic_check, stringResource(R.string.action_clock_out), WorktimeColors.Accent, WorktimeColors.OnAccent, onConfirm)
        }
    }
}
