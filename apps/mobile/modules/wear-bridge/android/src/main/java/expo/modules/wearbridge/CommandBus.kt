package expo.modules.wearbridge

/** Lets the listener service tell the running module that a command arrived. */
object CommandBus {
  @Volatile
  var onCommand: (() -> Unit)? = null
}
