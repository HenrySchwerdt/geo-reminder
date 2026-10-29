@file:UseSerializers(MillisSerializer::class)

package com.worktime.wear.data

import kotlinx.serialization.KSerializer
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.UseSerializers
import kotlinx.serialization.builtins.ListSerializer
import kotlinx.serialization.descriptors.PrimitiveKind
import kotlinx.serialization.descriptors.PrimitiveSerialDescriptor
import kotlinx.serialization.encoding.Decoder
import kotlinx.serialization.encoding.Encoder
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.decodeFromJsonElement
import kotlinx.serialization.json.int
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlin.math.roundToLong

/*
 * Kotlin mirror of `SurfaceSnapshot` / `SurfaceCommand` in packages/core/src/surfaces.ts
 * (documented in docs/technical/surfaces.md). Keep the three in sync.
 */

const val SNAPSHOT_VERSION = 1

@Serializable
enum class WorkState {
    @SerialName("off") Off,
    @SerialName("working") Working,
    @SerialName("break") Break,
}

@Serializable
data class SurfaceSnapshot(
    val version: Int,
    val state: WorkState,
    /** Work day shown, `YYYY-MM-DD`. */
    val day: String,
    val workedMs: Long,
    val breakMs: Long,
    /** While working: `now - workedAnchor` is the worked time today. */
    val workedAnchor: Long? = null,
    /** Start of the current state (clock-in or break start). */
    val since: Long? = null,
    val sessionStart: Long? = null,
    val targetMs: Long,
    val expectedEnd: Long? = null,
    val workplaceName: String? = null,
    val weekWorkedMs: Long,
    val weekTargetMs: Long,
    val weekBalanceMs: Long,
    /** IANA zone the times should be shown in. */
    val tz: String,
    val updatedAt: Long,
)

@Serializable
enum class SurfaceAction {
    @SerialName("clockIn") ClockIn,
    @SerialName("startBreak") StartBreak,
    @SerialName("endBreak") EndBreak,
    @SerialName("clockOut") ClockOut,
}

@Serializable
data class SurfaceCommand(
    /** Unique per tap; the phone ignores ids it already applied. */
    val id: String,
    val action: SurfaceAction,
    /** Tap time (epoch ms); kept when the command is sent later. */
    val at: Long,
    val source: String = "watch",
    val tz: String? = null,
)

/** The phone's durations are JS numbers: whole in practice, but a fractional one (e.g. a daily target) must not fail parsing. */
object MillisSerializer : KSerializer<Long> {
    override val descriptor = PrimitiveSerialDescriptor("Millis", PrimitiveKind.DOUBLE)
    override fun deserialize(decoder: Decoder): Long = decoder.decodeDouble().roundToLong()
    override fun serialize(encoder: Encoder, value: Long) = encoder.encodeLong(value)
}

object SurfaceJson {
    private val json = Json {
        ignoreUnknownKeys = true
        explicitNulls = false
        encodeDefaults = true
    }

    /** Returns null for malformed JSON or a `version` this app does not know, so the old state stays on screen. */
    fun parseSnapshot(text: String): SurfaceSnapshot? = runCatching {
        val root = json.parseToJsonElement(text).jsonObject
        if (root["version"]?.jsonPrimitive?.int != SNAPSHOT_VERSION) return null
        json.decodeFromJsonElement<SurfaceSnapshot>(root)
    }.getOrNull()

    fun encode(command: SurfaceCommand): String = json.encodeToString(SurfaceCommand.serializer(), command)

    fun parseCommand(text: String): SurfaceCommand? =
        runCatching { json.decodeFromString(SurfaceCommand.serializer(), text) }.getOrNull()

    private val commandList = ListSerializer(SurfaceCommand.serializer())

    fun encodeCommands(commands: List<SurfaceCommand>): String = json.encodeToString(commandList, commands)

    fun parseCommands(text: String): List<SurfaceCommand> =
        runCatching { json.decodeFromString(commandList, text) }.getOrDefault(emptyList())

    fun encode(snapshot: SurfaceSnapshot): String = json.encodeToString(SurfaceSnapshot.serializer(), snapshot)
}
