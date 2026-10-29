package com.worktime.wear.data

import android.content.Context

/** Minimal string storage so the queue logic can be unit-tested without Android. */
interface KeyValueStore {
    fun get(key: String): String?
    fun put(key: String, value: String)
}

class PreferencesStore(context: Context, name: String = "worktime") : KeyValueStore {
    private val prefs = context.applicationContext.getSharedPreferences(name, Context.MODE_PRIVATE)

    override fun get(key: String): String? = prefs.getString(key, null)

    override fun put(key: String, value: String) {
        prefs.edit().putString(key, value).apply()
    }
}
