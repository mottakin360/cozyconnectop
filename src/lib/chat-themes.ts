export type ChatThemeType = "preset" | "color" | "gradient" | "image";

export type ChatThemePreset = {
  id: string;
  label: string;
  description: string;
  background: string;
  bubbleSelf?: string;
  accent: string;
};

export const THEME_PRESETS: ChatThemePreset[] = [
  {
    id: "default",
    label: "Default",
    description: "Classic Cozy Connect",
    background: "transparent",
    accent: "var(--primary)",
  },
  {
    id: "love-blush",
    label: "Love Blush",
    description: "For your special someone 💖",
    background: "linear-gradient(160deg, #ffd6e0 0%, #ffafcc 50%, #ff7eb3 100%)",
    bubbleSelf: "linear-gradient(135deg, #ff5b8a, #ff8fab)",
    accent: "#ff4d8a",
  },
  {
    id: "homie-hour",
    label: "Homie Hour",
    description: "Best friends, golden hour",
    background: "linear-gradient(160deg, #fff3b0 0%, #ffb86b 60%, #ff7a59 100%)",
    bubbleSelf: "linear-gradient(135deg, #ff9248, #ffb86b)",
    accent: "#ff7a3d",
  },
  {
    id: "fwb",
    label: "FWB",
    description: "Flirty + friendly vibes",
    background: "linear-gradient(160deg, #f9c5ff 0%, #c46bff 55%, #6b6bff 100%)",
    bubbleSelf: "linear-gradient(135deg, #b14dff, #ff6ec4)",
    accent: "#c44dff",
  },
  {
    id: "midnight",
    label: "Midnight",
    description: "Late night talks",
    background: "linear-gradient(160deg, #0f1535 0%, #1c2563 50%, #2d3a8c 100%)",
    bubbleSelf: "linear-gradient(135deg, #4f6bff, #8ea0ff)",
    accent: "#6b85ff",
  },
  {
    id: "forest",
    label: "Forest",
    description: "Calm & grounded",
    background: "linear-gradient(160deg, #0d2818 0%, #1f4a2e 55%, #5a8a5c 100%)",
    bubbleSelf: "linear-gradient(135deg, #3f9c5a, #79c089)",
    accent: "#4ec779",
  },
  {
    id: "sunset",
    label: "Sunset",
    description: "Warm cinematic glow",
    background: "linear-gradient(160deg, #ff5e62 0%, #ff9966 50%, #ffd17a 100%)",
    bubbleSelf: "linear-gradient(135deg, #ff5e62, #ff9966)",
    accent: "#ff6a3d",
  },
];

export type ResolvedTheme = {
  background: string;
  bubbleSelf?: string;
  accent: string;
};

export function resolveTheme(type: string | null | undefined, value: string | null | undefined, fallbackAccent: string): ResolvedTheme {
  if (!type || type === "preset") {
    const preset = THEME_PRESETS.find((p) => p.id === (value || "default")) ?? THEME_PRESETS[0];
    return {
      background: preset.background,
      bubbleSelf: preset.bubbleSelf,
      accent: preset.id === "default" ? fallbackAccent : preset.accent,
    };
  }
  if (type === "color") {
    const c = value || fallbackAccent;
    return { background: c, accent: fallbackAccent };
  }
  if (type === "gradient") {
    return { background: value || `linear-gradient(135deg, ${fallbackAccent}, #000)`, accent: fallbackAccent };
  }
  if (type === "image" && value) {
    return { background: `url(${value}) center/cover no-repeat`, accent: fallbackAccent };
  }
  return { background: "transparent", accent: fallbackAccent };
}
