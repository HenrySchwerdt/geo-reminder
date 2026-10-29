import Foundation

// Run with swiftc targets/watch/SurfaceModels.swift test/native/watch-model/main.swift -o /tmp/watch-model-test
let start = Date(timeIntervalSince1970: 1_793_275_200)
let end = start.addingTimeInterval(120)

let firstSession = SurfaceSnapshot.empty(now: start)
  .applying(.clockIn, at: start)
  .applying(.clockOut, at: end)
precondition(firstSession.workedMs(at: end) == 120_000, "The first offline session must keep its total after clock-out")
precondition(firstSession.day == SurfaceFormat.dayKey(start, in: firstSession.timeZone))

var previousDay = SurfaceSnapshot.empty(now: start)
previousDay.day = "2020-01-01"
previousDay.workedMs = 3_600_000
let newDay = previousDay.applying(.clockIn, at: start).applying(.clockOut, at: end)
precondition(newDay.workedMs(at: end) == 120_000, "Yesterday's hours must not carry into a new offline session")
precondition(newDay.day == SurfaceFormat.dayKey(start, in: newDay.timeZone))

let pause = SurfaceSnapshot.empty(now: start)
  .applying(.clockIn, at: start)
  .applying(.startBreak, at: start.addingTimeInterval(60))
  .applying(.endBreak, at: start.addingTimeInterval(90))
  .applying(.clockOut, at: end)
precondition(pause.workedMs(at: end) == 90_000)
precondition(pause.breakMs == 30_000)
print("Watch snapshot regression checks passed (first session, day rollover, break).")
