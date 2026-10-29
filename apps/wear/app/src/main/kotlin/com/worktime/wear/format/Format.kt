package com.worktime.wear.format

import com.worktime.wear.data.SurfaceSnapshot
import com.worktime.wear.data.WorkState
import com.worktime.wear.data.workedAt
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.time.format.FormatStyle
import java.util.Locale
import kotlin.math.abs

private const val MINUTE_MS = 60_000L
private const val HOUR_MS = 60 * MINUTE_MS

/** Timer text as in the design: hours and minutes, `5:50`. */
fun formatTimer(ms: Long): String {
    val minutes = ms.coerceAtLeast(0) / MINUTE_MS
    return "%d:%02d".format(Locale.ROOT, minutes / 60, minutes % 60)
}

/** `8h 09m`, or `42m` under an hour. */
fun formatDuration(ms: Long): String {
    val minutes = abs(ms) / MINUTE_MS
    return if (minutes >= 60) "%dh %02dm".format(Locale.ROOT, minutes / 60, minutes % 60) else "${minutes}m"
}

/** `+6h 20m` / `-45m`. */
fun formatBalance(ms: Long): String = (if (ms < 0) "-" else "+") + formatDuration(ms)

/** Wall-clock time of [epochMs] in the zone the phone asked for, in the watch's locale (`17:22`). */
fun formatClock(epochMs: Long, tz: String, locale: Locale = Locale.getDefault()): String {
    val zone = runCatching { ZoneId.of(tz) }.getOrDefault(ZoneId.systemDefault())
    return DateTimeFormatter.ofLocalizedTime(FormatStyle.SHORT).withLocale(locale).format(Instant.ofEpochMilli(epochMs).atZone(zone))
}

/** Share of today's target worked at [now], 0..1; 0 on days without a target. */
fun progressOf(snapshot: SurfaceSnapshot, now: Long): Float =
    if (snapshot.targetMs <= 0) 0f else (snapshot.workedAt(now).toFloat() / snapshot.targetMs).coerceIn(0f, 1f)

/** How long the current break has lasted at [now]. */
fun breakElapsed(snapshot: SurfaceSnapshot, now: Long): Long =
    if (snapshot.state == WorkState.Break) (now - (snapshot.since ?: now)).coerceAtLeast(0) else 0
