export type Sensitivity = "low" | "normal" | "high";

export interface Settings {
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
  motionEnabled: true,
  sensitivity: "normal",
  invertDirections: false,
  soundEnabled: false, // PRD Q12 default: sounds off
  showTouchDuringMotion: true,
  keepAwake: true,
  confirmEndRound: true,
  showPresentedCount: true,
};
