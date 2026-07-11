export type Sensitivity = "low" | "normal" | "high";
export type WordSize = "normal" | "large" | "huge";
export const wordSizeScale: Record<WordSize, number> = {
  normal: 1,
  large: 1.3,
  huge: 1.6,
};
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
  showRoundTimer: boolean;
  wordSize: WordSize;
}

export const defaultSettings: Settings = {
  theme: "system",
  wordsPerRound: 0,
  motionEnabled: true,
  sensitivity: "normal",
  invertDirections: false,
  soundEnabled: true, // owner preference (overrides PRD Q12 default)
  showTouchDuringMotion: true,
  keepAwake: true,
  confirmEndRound: true,
  showPresentedCount: true,
  showRoundTimer: true,
  wordSize: "large", // guessers watch from across the room
};
