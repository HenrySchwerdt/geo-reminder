package com.worktime.wear.data

/**
 * What the watch shows while commands are still waiting for the phone: the last snapshot with those commands
 * applied the way the phone will apply them. Invalid transitions are skipped, as on the phone. The phone's
 * answer replaces all of this as soon as the next snapshot arrives.
 */
fun SurfaceSnapshot.withPending(pending: List<SurfaceCommand>): SurfaceSnapshot =
    pending.sortedBy { it.at }.fold(this) { snapshot, command -> snapshot.apply(command) }

private fun SurfaceSnapshot.apply(command: SurfaceCommand): SurfaceSnapshot {
    val at = command.at
    return when {
        command.action == SurfaceAction.ClockIn && state == WorkState.Off -> copy(
            state = WorkState.Working,
            since = at,
            sessionStart = at,
            workedAnchor = at - workedMs,
            expectedEnd = null,
        )
        command.action == SurfaceAction.StartBreak && state == WorkState.Working -> copy(
            state = WorkState.Break,
            workedMs = workedAt(at),
            workedAnchor = null,
            since = at,
        )
        command.action == SurfaceAction.EndBreak && state == WorkState.Break -> copy(
            state = WorkState.Working,
            breakMs = breakMs + (at - (since ?: at)).coerceAtLeast(0),
            workedAnchor = at - workedMs,
            since = at,
        )
        command.action == SurfaceAction.ClockOut && state != WorkState.Off -> copy(
            state = WorkState.Off,
            workedMs = workedAt(at),
            breakMs = if (state == WorkState.Break) breakMs + (at - (since ?: at)).coerceAtLeast(0) else breakMs,
            workedAnchor = null,
            since = null,
            sessionStart = null,
            expectedEnd = null,
        )
        else -> this
    }
}

/** Worked time today at [now]: counts up from the anchor while working, frozen otherwise. */
fun SurfaceSnapshot.workedAt(now: Long): Long =
    if (state == WorkState.Working && workedAnchor != null) (now - workedAnchor).coerceAtLeast(0) else workedMs
