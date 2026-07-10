export type MotionPermission = "granted" | "denied" | "unsupported";

interface WithRequestPermission {
  requestPermission?: () => Promise<"granted" | "denied">;
}

/** True on iOS 13+ Safari, where sensor access needs a user-gesture prompt. */
export function needsPermissionGesture(): boolean {
  return (
    typeof DeviceOrientationEvent !== "undefined" &&
    typeof (DeviceOrientationEvent as unknown as WithRequestPermission)
      .requestPermission === "function"
  );
}

/** Must be called from a direct user interaction (tap) on iOS. */
export async function requestMotionPermission(): Promise<MotionPermission> {
  if (typeof DeviceOrientationEvent === "undefined") return "unsupported";
  const request = (DeviceOrientationEvent as unknown as WithRequestPermission)
    .requestPermission;
  if (typeof request !== "function") return "granted"; // Android/desktop: no prompt needed
  try {
    return (await request()) === "granted" ? "granted" : "denied";
  } catch {
    // Thrown when not called from a user gesture, or blocked by settings.
    return "denied";
  }
}
