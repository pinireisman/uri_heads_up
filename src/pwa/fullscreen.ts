import { useEffect, useState } from "react";

/** Optional fullscreen (FR-13): must be user-gesture driven, silently
 * unsupported on iPhone Safari — callers hide the control there. */
export function useFullscreen(): {
  supported: boolean;
  active: boolean;
  toggle: () => void;
} {
  const [active, setActive] = useState(!!document.fullscreenElement);

  useEffect(() => {
    const onChange = () => setActive(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  return {
    supported: typeof document.documentElement.requestFullscreen === "function",
    active,
    toggle: () => {
      if (document.fullscreenElement) void document.exitFullscreen();
      else void document.documentElement.requestFullscreen().catch(() => {});
    },
  };
}
