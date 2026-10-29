package com.worktime.wear

import android.content.Intent
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.BackHandler
import androidx.activity.compose.setContent
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.compose.LocalLifecycleOwner
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.repeatOnLifecycle
import com.worktime.wear.data.SurfaceAction
import com.worktime.wear.data.WorktimeRepository
import com.worktime.wear.ui.ConfirmClockOutScreen
import com.worktime.wear.ui.TodayScreen
import com.worktime.wear.ui.WorktimeColors
import com.worktime.wear.ui.WorktimeTheme
import kotlinx.coroutines.delay

class MainActivity : ComponentActivity() {
    private var confirmingClockOut by mutableStateOf(false)

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        confirmingClockOut = intent.wantsClockOutConfirmation()
        val repository = WorktimeRepository.get(this)
        setContent {
            WorktimeTheme {
                Box(Modifier.fillMaxSize().background(WorktimeColors.Canvas)) {
                    val snapshot by repository.state.collectAsStateWithLifecycle()
                    val pending by repository.pendingCount.collectAsStateWithLifecycle()
                    val now = rememberTicker()
                    if (confirmingClockOut && snapshot != null) {
                        BackHandler { confirmingClockOut = false }
                        ConfirmClockOutScreen(
                            snapshot = snapshot,
                            now = now,
                            onConfirm = {
                                repository.submit(SurfaceAction.ClockOut)
                                confirmingClockOut = false
                            },
                            onCancel = { confirmingClockOut = false },
                        )
                    } else {
                        TodayScreen(
                            snapshot = snapshot,
                            now = now,
                            pendingCount = pending,
                            onAction = repository::submit,
                            onClockOut = { confirmingClockOut = true },
                        )
                    }
                }
            }
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        confirmingClockOut = intent.wantsClockOutConfirmation()
    }

    override fun onStart() {
        super.onStart()
        WorktimeRepository.get(this).syncWithPhone()
    }

    private fun Intent.wantsClockOutConfirmation() = getStringExtra(EXTRA_CONFIRM) == CONFIRM_CLOCK_OUT

    companion object {
        /** Set by the tile's clock-out button so the confirmation opens straight away. */
        const val EXTRA_CONFIRM = "confirm"
        const val CONFIRM_CLOCK_OUT = "clockOut"
    }
}

/** Current time in ms, refreshed every second while the activity is visible. */
@Composable
private fun rememberTicker(): Long {
    var now by remember { mutableLongStateOf(System.currentTimeMillis()) }
    val lifecycle = LocalLifecycleOwner.current.lifecycle
    LaunchedEffect(lifecycle) {
        lifecycle.repeatOnLifecycle(Lifecycle.State.STARTED) {
            while (true) {
                now = System.currentTimeMillis()
                delay(1_000 - now % 1_000)
            }
        }
    }
    return now
}
