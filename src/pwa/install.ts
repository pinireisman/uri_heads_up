import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
}

const isStandalone = () =>
  window.matchMedia("(display-mode: standalone)").matches ||
  ("standalone" in navigator &&
    (navigator as { standalone?: boolean }).standalone === true);

const isIOS = () => /iPhone|iPad|iPod/.test(navigator.userAgent);

/** Install guidance: a real prompt on Chromium, a share-menu hint on iOS Safari. */
export function useInstallPrompt(): {
  canInstall: boolean;
  showIosHint: boolean;
  install: () => void;
} {
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  return {
    canInstall: !!prompt && !isStandalone(),
    showIosHint: isIOS() && !isStandalone(),
    install: () => void prompt?.prompt(),
  };
}
