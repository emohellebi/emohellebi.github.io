/* Session timing is calculated from timestamps, not interval ticks, so a
   throttled background tab does not slow the clock. No time data is uploaded. */
(function () {
  "use strict";
  function createClock(now = () => Date.now()) {
    let mode = "off", accumulated = 0, startedAt = null, limit = 0;
    const elapsed = () => accumulated + (startedAt === null ? 0 : Math.max(0, now() - startedAt));
    return {
      start(nextMode, minutes = 15) {
        if (!["off", "stopwatch", "countdown"].includes(nextMode)) throw new RangeError("Unknown timing mode");
        if (nextMode === "countdown" && (!Number.isInteger(minutes) || minutes < 1 || minutes > 240))
          throw new RangeError("Choose a whole number of minutes from 1 to 240");
        mode = nextMode;
        accumulated = 0;
        limit = mode === "countdown" ? minutes * 60000 : 0;
        startedAt = mode === "off" ? null : now();
      },
      pause() {
        accumulated = elapsed();
        startedAt = null;
      },
      resume() {
        if (mode !== "off" && startedAt === null) startedAt = now();
      },
      snapshot() {
        const elapsedMs = elapsed();
        return { mode, elapsedMs, limitMs: limit, remainingMs: Math.max(0, limit - elapsedMs),
          running: startedAt !== null, expired: mode === "countdown" && elapsedMs >= limit };
      }
    };
  }
  function formatTime(milliseconds, roundUp = false) {
    const seconds = Math.max(0, (roundUp ? Math.ceil : Math.floor)(milliseconds / 1000));
    const hours = Math.floor(seconds / 3600), minutes = Math.floor(seconds / 60) % 60;
    return `${hours ? hours + ":" : ""}${String(minutes).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
  }
  window.ENV_SCIENCE_CLOCK = { createClock, formatTime };
}());
