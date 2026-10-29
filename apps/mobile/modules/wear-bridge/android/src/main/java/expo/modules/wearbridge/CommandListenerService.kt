package expo.modules.wearbridge

import com.google.android.gms.wearable.MessageEvent
import com.google.android.gms.wearable.WearableListenerService

/** Persists `/worktime/command` messages from the watch and wakes the JS app if it is running. */
class CommandListenerService : WearableListenerService() {
  override fun onMessageReceived(event: MessageEvent) {
    if (event.path != WearPaths.COMMAND) return
    CommandQueue.add(this, String(event.data, Charsets.UTF_8))
    CommandBus.onCommand?.invoke()
  }
}
