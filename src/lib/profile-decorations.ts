export type DecorationId = "none" | "sparkle" | "halo" | "pulse" | "spin" | "stars";

export const DECORATION_OPTIONS: { id: DecorationId; label: string; description: string }[] = [
  { id: "none", label: "None", description: "Just the avatar" },
  { id: "halo", label: "Halo Glow", description: "Soft pulsing aura" },
  { id: "pulse", label: "Pulse Ring", description: "Rippling neon ring" },
  { id: "spin", label: "Aurora Spin", description: "Conic gradient orbit" },
  { id: "sparkle", label: "Sparkle", description: "Twinkling sparkles" },
  { id: "stars", label: "Orbit Stars", description: "Stars circling around" },
];

export function decorationClass(d?: string | null): string {
  switch (d) {
    case "halo": return "deco-halo";
    case "pulse": return "deco-pulse";
    case "spin": return "deco-spin";
    case "sparkle": return "deco-sparkle";
    case "stars": return "deco-stars";
    default: return "";
  }
}
