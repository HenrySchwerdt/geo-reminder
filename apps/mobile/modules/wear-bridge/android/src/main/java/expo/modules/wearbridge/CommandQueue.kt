package expo.modules.wearbridge

import android.content.Context
import org.json.JSONArray

/**
 * Commands received from the watch that the JS app has not applied yet. Persisted so nothing is lost while the
 * app is not running; JS drains it on start and when it returns to the foreground. Ordering is left to JS
 * (it sorts by `at`); the app also ignores command ids it has already applied, so duplicates are harmless.
 */
object CommandQueue {
  private const val PREFS = "worktime.wear-bridge"
  private const val KEY = "commands"
  private const val MAX = 500

  @Synchronized
  fun add(context: Context, json: String) {
    val prefs = context.applicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
    val all = read(prefs.getString(KEY, null)) + json
    prefs.edit().putString(KEY, JSONArray(all.takeLast(MAX)).toString()).apply()
  }

  /** Returns and clears the queued commands. */
  @Synchronized
  fun drain(context: Context): List<String> {
    val prefs = context.applicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
    val all = read(prefs.getString(KEY, null))
    if (all.isNotEmpty()) prefs.edit().remove(KEY).apply()
    return all
  }

  private fun read(stored: String?): List<String> {
    if (stored == null) return emptyList()
    return try {
      val array = JSONArray(stored)
      List(array.length()) { array.getString(it) }
    } catch (_: Exception) {
      emptyList()
    }
  }
}
