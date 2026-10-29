package expo.modules.wearbridge

import com.google.android.gms.wearable.PutDataMapRequest
import com.google.android.gms.wearable.Wearable
import expo.modules.kotlin.Promise
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

private const val COMMAND_EVENT = "onCommand"

/**
 * JS side of the Wear OS sync: publishes the surface snapshot as a Data Layer item and hands over the commands
 * the watch sent. `onCommand` is only a nudge; JS calls `drainCommands` to get the payloads.
 */
class WearBridgeModule : Module() {
  private val context get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  override fun definition() = ModuleDefinition {
    Name("WearBridge")

    Events(COMMAND_EVENT)

    // Each publish carries a timestamp so every snapshot is a new item, even when the JSON is unchanged.
    AsyncFunction("publishSnapshot") { json: String, promise: Promise ->
      val request = PutDataMapRequest.create(WearPaths.SNAPSHOT).apply {
        dataMap.putString("json", json)
        dataMap.putLong("publishedAt", System.currentTimeMillis())
      }.asPutDataRequest().setUrgent()
      Wearable.getDataClient(context).putDataItem(request)
        .addOnSuccessListener { promise.resolve(null) }
        .addOnFailureListener { promise.reject("ERR_WEAR_PUBLISH", it.message, it) }
    }

    Function("drainCommands") { CommandQueue.drain(context) }

    OnCreate {
      CommandBus.onCommand = { sendEvent(COMMAND_EVENT) }
    }

    OnDestroy {
      CommandBus.onCommand = null
    }
  }
}
