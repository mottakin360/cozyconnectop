import { decorationClass } from "@/lib/profile-decorations";

type Props = {
  url?: string | null;
  name: string;
  accent?: string | null;
  size?: number;
  ring?: boolean;
  decoration?: string | null;
};

export function Avatar({ url, name, accent, size = 40, ring, decoration }: Props) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("") || "?";
  const bg = accent || "var(--primary)";
  const ringStyle = ring ? "ring-4 ring-background" : "";
  const deco = decorationClass(decoration);
  const padding = deco ? Math.max(4, Math.round(size * 0.08)) : 0;
  const wrapperSize = size + padding * 2;

  const inner = (
    <div
      className={`relative shrink-0 overflow-hidden rounded-full ${ringStyle}`}
      style={{ width: size, height: size, background: `linear-gradient(135deg, ${bg}, color-mix(in oklab, ${bg} 50%, black))` }}
    >
      {url ? (
        <img src={url} alt={name} className="h-full w-full object-cover" />
      ) : (
        <div className="grid h-full w-full place-items-center text-primary-foreground" style={{ fontSize: size * 0.4, fontWeight: 700 }}>
          {initials}
        </div>
      )}
    </div>
  );

  if (!deco) return inner;

  return (
    <div className={`avatar-deco ${deco}`} style={{ width: wrapperSize, height: wrapperSize, padding }}>
      {inner}
    </div>
  );
}
