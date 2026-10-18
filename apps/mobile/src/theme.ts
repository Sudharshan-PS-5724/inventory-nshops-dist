export type ColorMode = "light" | "dark";

export type AppColors = {
  readonly canvas: string;
  readonly surface: string;
  readonly surfaceMuted: string;
  readonly ink: string;
  readonly inkMuted: string;
  readonly line: string;
  readonly lime: string;
  readonly limeDeep: string;
  readonly green: string;
  readonly greenSoft: string;
  readonly yellow: string;
  readonly yellowSoft: string;
  readonly warning: string;
  readonly warningSoft: string;
  readonly danger: string;
  readonly dangerSoft: string;
  readonly blueSoft: string;
  readonly blue: string;
};

// Palette supplied for the application. Both themes use the same semantic
// roles, so every screen changes consistently when the user changes mode.
export const lightColors: AppColors = {
  canvas: "#F8FFF1",
  surface: "#ffffff",
  surfaceMuted: "#9EF01A24",
  ink: "#004B23",
  inkMuted: "#006400",
  line: "#9EF01A7A",
  lime: "#CCFF33",
  limeDeep: "#004B23",
  green: "#007200",
  greenSoft: "#70E00035",
  yellow: "#9EF01A",
  yellowSoft: "#9EF01A2E",
  warning: "#006400",
  warningSoft: "#70E00042",
  danger: "#004B23",
  dangerSoft: "#70E00042",
  blueSoft: "#38B00024",
  blue: "#38B000",
};

export const darkColors: AppColors = {
  canvas: "#004B23",
  surface: "#006400",
  surfaceMuted: "#007200",
  ink: "#FFFFFF",
  inkMuted: "#CCFF33",
  line: "#38B000",
  lime: "#CCFF33",
  limeDeep: "#004B23",
  green: "#70E000",
  greenSoft: "#007200",
  yellow: "#9EF01A",
  yellowSoft: "#007200",
  warning: "#CCFF33",
  warningSoft: "#006400",
  danger: "#CCFF33",
  dangerSoft: "#006400",
  blueSoft: "#007200",
  blue: "#70E000",
};

export const spacing = {
  xs: 6,
  sm: 10,
  md: 16,
  lg: 22,
  xl: 30,
  xxl: 42,
} as const;
export const radius = { sm: 10, md: 16, lg: 22, pill: 999 } as const;

export const typeface = {
  regular: "NunitoSans_400Regular",
  semibold: "NunitoSans_600SemiBold",
  bold: "NunitoSans_700Bold",
  extraBold: "NunitoSans_800ExtraBold",
} as const;

export const font = typeface.regular;
