export const colors = {
  // Deep Matte Voids
  bg: "#07080B",
  surface: "#0C0E14",
  panel: "#11141D",
  card: "#161A26",

  // Pure Laser Accents
  sapphire: "#3B82F6",
  sapphireDeep: "#1D4ED8",
  emerald: "#10B981",
  emeraldDeep: "#047857",
  burgundy: "#F43F5E",
  burgundyDeep: "#BE123C",
  amber: "#F59E0B",
  amberDeep: "#B45309",

  // Text & Borders
  textPrimary: "#F3F4F6",
  textSecondary: "#8E98A8",
  textMuted: "#5A6272",
  border: "rgba(255, 255, 255, 0.07)",
  borderBright: "rgba(255, 255, 255, 0.14)",
} as const;

export type ColorToken = keyof typeof colors;
export type SemanticColor = "burgundy" | "sapphire" | "emerald" | "amber";
