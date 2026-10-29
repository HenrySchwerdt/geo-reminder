import ExpoModulesCore

public class WatchBridgeModule: Module {
  public func definition() -> ModuleDefinition {
    Name("WatchBridge")

    Events("onCommand")

    OnCreate {
      WatchBridgeSession.shared.activate()
    }

    OnStartObserving {
      WatchBridgeSession.shared.onCommand = { [weak self] in
        self?.sendEvent("onCommand", [:])
      }
    }

    OnStopObserving {
      WatchBridgeSession.shared.onCommand = nil
    }

    Property("isPaired") {
      return WatchBridgeSession.shared.isPaired
    }

    Property("isWatchAppInstalled") {
      return WatchBridgeSession.shared.isWatchAppInstalled
    }

    Function("publishSnapshot") { (json: String) in
      WatchBridgeSession.shared.publish(snapshot: json)
    }

    Function("drainCommands") { () -> [String] in
      return WatchBridgeSession.shared.drainCommands()
    }
  }
}
