package com.worktime.wear.ui

import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.wear.compose.material3.MaterialTheme

/** Dark values of `packages/design-tokens/tokens.json`; the watch is always dark. */
object WorktimeColors {
    val Canvas = Color(0xFF000000)
    val Elevated = Color(0xFF181A18)
    val Sunken = Color(0xFF222522)
    val Track = Color(0xFF2C302C)
    val TextPrimary = Color(0xFFF3F2ED)
    val TextSecondary = Color(0xFFA7ABA5)
    val Accent = Color(0xFF5CC99B)
    val OnAccent = Color(0xFF06140E)
    val Break = Color(0xFFF2B04E)
    val BreakSoft = Color(0xFF3A2B13)
    val Danger = Color(0xFFFF6B5D)
}

@Composable
fun WorktimeTheme(content: @Composable () -> Unit) {
    val base = MaterialTheme.colorScheme
    MaterialTheme(
        colorScheme = base.copy(
            primary = WorktimeColors.Accent,
            onPrimary = WorktimeColors.OnAccent,
            background = WorktimeColors.Canvas,
            onBackground = WorktimeColors.TextPrimary,
            onSurface = WorktimeColors.TextPrimary,
            onSurfaceVariant = WorktimeColors.TextSecondary,
            surfaceContainer = WorktimeColors.Elevated,
            error = WorktimeColors.Danger,
        ),
        content = content,
    )
}
