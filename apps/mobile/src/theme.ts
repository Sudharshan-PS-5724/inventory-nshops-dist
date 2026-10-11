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
  canvas: "#f4fbf6",
  surface: "#ffffff",
  surfaceMuted: "#d9ed92ff",
  ink: "#184e77ff",
  inkMuted: "#1e6091ff",
  line: "#b5e48cff",
  lime: "#d9ed92ff",
  limeDeep: "#184e77ff",
  green: "#1a759fff",
  greenSoft: "#dff5e6",
  yellow: "#99d98cff",
  yellowSoft: "#edf9dd",
  warning: "#34a0a4ff",
  warningSoft: "#d9f5f5",
  danger: "#1a759fff",
  dangerSoft: "#dfeef8",
  blueSoft: "#dff4fb",
  blue: "#168aadff",
};

export const darkColors: AppColors = {
  canvas: "#0d2d3d",
  surface: "#184e77ff",
  surfaceMuted: "#1a759fff",
  ink: "#f3fbff",
  inkMuted: "#bfeaf8",
  line: "#34a0a4ff",
  lime: "#d9ed92ff",
  limeDeep: "#184e77ff",
  green: "#76c893ff",
  greenSoft: "#1e6091ff",
  yellow: "#99d98cff",
  yellowSoft: "#1e6091ff",
  warning: "#52b69aff",
  warningSoft: "#1e6091ff",
  danger: "#b5e48cff",
  dangerSoft: "#1e6091ff",
  blueSoft: "#1a759fff",
  blue: "#99d98cff",
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