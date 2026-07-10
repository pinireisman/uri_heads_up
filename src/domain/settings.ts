export type Sensitivity = "low" | "normal" | "high";
export type Theme = "system" | "light" | "dark";

export interface Settings {
  theme: Theme;
  /** 0 = play the whole deck */
  wordsPerRound: number;
  motionEnabled: boolean;
  sensitivity: Sensitivity;
  invertDirections: boolean;
  soundEnabled: boolean;
  showTouchDuringMotion: boolean;
  keepAwake: boolean;
  confirmEndRound: boolean;
  showPresentedCount: boolean;
}

export const defaultSettings: Settings = {
  theme: "system",
  wordsPerRound: 0,
  motionEnabled: true,
  sensitivity: "normal",
  invertDirections: false,
  soundEnabled: false, // PRD Q12 default: sounds off
  showTouchDuringMotion: true,
  keepAwake: true,
  confirmEndRound: true,
  showPresentedCount: true,
};
