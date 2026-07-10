import { useEffect } from "react";

/**
 * Screen wake lock during calibration/gameplay (FR-12). Locks are silently
 * best-effort: rejection or absence never affects gameplay. The browser
 * auto-releases on tab hide; we reacquire when the page is visible again.
 */
export function useWakeLock(active: boolean): void {
  useEffect(() => {
    if (!active || !("wakeLock" in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    let stopped = false;

    const acquire = async () => {
      try {
        lock = await navigator.wakeLock.request("screen");
        if (stopped) void lock.release().catch(() => {});
      } catch {
        // rejected (low battery, not visible, unsupported): play on without it
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") void acquire();
    };

    void acquire();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stopped = true;
      document.removeEventListener("visibilitychange", onVisibility);
      void lock?.release().catch(() => {});
    };
  }, [active]);
}
