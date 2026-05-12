export const FONT_OPTIONS: { id: string; label: string; css: string }[] = [
  { id: "default", label: "Default", css: "" },
  { id: "serif", label: "Serif", css: "ui-serif, Georgia, 'Times New Roman', serif" },
  { id: "mono", label: "Mono", css: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace" },
  { id: "cursive", label: "Cursive", css: "'Brush Script MT', 'Lucida Handwriting', cursive" },
  { id: "display", label: "Display", css: "'Impact', 'Bebas Neue', 'Arial Black', sans-serif" },
  { id: "rounded", label: "Rounded", css: "'Comic Sans MS', 'Chalkboard SE', 'Comic Neue', system-ui, sans-serif" },
];

export function displayNameStyle(font?: string | null, color?: string | null): React.CSSProperties {
  const f = FONT_OPTIONS.find((o) => o.id === (font || "default"));
  const s: React.CSSProperties = {};
  if (f && f.css) s.fontFamily = f.css;
  if (color) s.color = color;
  return s;
}
