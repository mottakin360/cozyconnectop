export const FONT_OPTIONS: { id: string; label: string; css: string }[] = [
  { id: "default", label: "Default", css: "" },
  { id: "serif", label: "Serif", css: "ui-serif, Georgia, 'Times New Roman', serif" },
  { id: "mono", label: "Mono", css: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace" },
  { id: "cursive", label: "Cursive", css: "'Brush Script MT', 'Lucida Handwriting', cursive" },
  { id: "display", label: "Display", css: "'Impact', 'Bebas Neue', 'Arial Black', sans-serif" },
  { id: "rounded", label: "Rounded", css: "'Comic Sans MS', 'Chalkboard SE', 'Comic Neue', system-ui, sans-serif" },
  { id: "elegant", label: "Elegant", css: "'Playfair Display', 'Didot', Garamond, serif" },
  { id: "futuristic", label: "Futuristic", css: "'Orbitron', 'Eurostile', 'Segoe UI', sans-serif" },
  { id: "handwritten", label: "Handwritten", css: "'Caveat', 'Segoe Script', 'Bradley Hand', cursive" },
  { id: "typewriter", label: "Typewriter", css: "'Courier New', 'American Typewriter', monospace" },
  { id: "gothic", label: "Gothic", css: "'UnifrakturCook', 'Blackletter', 'Old English Text MT', serif" },
  { id: "graffiti", label: "Graffiti", css: "'Permanent Marker', 'Marker Felt', 'Comic Sans MS', cursive" },
  { id: "pixel", label: "Pixel", css: "'Press Start 2P', 'VT323', 'Courier New', monospace" },
  { id: "luxury", label: "Luxury", css: "'Cormorant Garamond', 'Bodoni MT', Didot, serif" },
  { id: "modern", label: "Modern", css: "'Montserrat', 'Helvetica Neue', Arial, sans-serif" },
  { id: "playful", label: "Playful", css: "'Fredoka', 'Quicksand', 'Comic Neue', sans-serif" },
];

export const ANIMATION_OPTIONS: { id: string; label: string; className: string }[] = [
  { id: "none", label: "None", className: "" },
  { id: "rainbow", label: "Rainbow", className: "dn-anim-rainbow" },
  { id: "glow", label: "Glow Pulse", className: "dn-anim-glow" },
  { id: "shimmer", label: "Shimmer", className: "dn-anim-shimmer" },
  { id: "bounce", label: "Bounce", className: "dn-anim-bounce" },
  { id: "gradient", label: "Gradient Flow", className: "dn-anim-gradient" },
];

export function displayNameStyle(font?: string | null, color?: string | null): React.CSSProperties {
  const f = FONT_OPTIONS.find((o) => o.id === (font || "default"));
  const s: React.CSSProperties = {};
  if (f && f.css) s.fontFamily = f.css;
  if (color) s.color = color;
  return s;
}

export function displayNameClass(animation?: string | null): string {
  const a = ANIMATION_OPTIONS.find((o) => o.id === (animation || "none"));
  return a?.className ?? "";
}
