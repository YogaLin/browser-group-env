export type ChromeGroupColor =
  | "grey"
  | "blue"
  | "red"
  | "yellow"
  | "green"
  | "pink"
  | "purple"
  | "cyan"
  | "orange";

const GROUP_COLORS: Record<ChromeGroupColor, string> = {
  grey: "#6b7280",
  blue: "#2563ff",
  red: "#dc2626",
  yellow: "#ca8a04",
  green: "#16a34a",
  pink: "#db2777",
  purple: "#6d4aff",
  cyan: "#0891b2",
  orange: "#ea580c"
};

export const ICON_LAYER_COLOR = "#94a3b8";

export function getGroupColorHex(color?: string, fallback = GROUP_COLORS.blue): string {
  return color && color in GROUP_COLORS
    ? GROUP_COLORS[color as ChromeGroupColor]
    : fallback;
}

export function getGroupColorRgb(color?: string): [number, number, number] {
  const hex = getGroupColorHex(color).slice(1);
  return [
    Number.parseInt(hex.slice(0, 2), 16),
    Number.parseInt(hex.slice(2, 4), 16),
    Number.parseInt(hex.slice(4, 6), 16)
  ];
}
