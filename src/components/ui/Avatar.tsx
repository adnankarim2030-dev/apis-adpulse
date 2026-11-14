import { initials } from "@/lib/format";

const AVATAR_MAP: Record<string, string> = {
  "khurram jaffrani": "/avatars/khurram_jaffrani.png",
  "khurram": "/avatars/khurram_jaffrani.png",
  "adnan karim": "/avatars/adnan_karim.png",
  "adnan": "/avatars/adnan_karim.png",
  "syed abeel ahmed": "/avatars/syed_abeel_ahmed.png",
  "abeel": "/avatars/syed_abeel_ahmed.png",
  "syeda musfira": "/avatars/syeda_musfira.png",
  "musfira": "/avatars/syeda_musfira.png",
  "naeem ahmed": "/avatars/naeem_ahmed.png",
  "naeem": "/avatars/naeem_ahmed.png",
  "kashif aghani": "/avatars/kashif_aghani.png",
  "kashif": "/avatars/kashif_aghani.png",
  "noel francis": "/avatars/noel_francis.png",
  "noel": "/avatars/noel_francis.png",
  "shoaib jaffrani": "/avatars/shoaib_jaffrani.png",
  "shoaib": "/avatars/shoaib_jaffrani.png",
  "maha": "/avatars/maha.png",
};

export function Avatar({
  name,
  size = 32,
  src,
}: {
  name: string;
  size?: number;
  src?: string | null;
}) {
  const normalized = (name || "").toLowerCase().trim();
  const avatarSrc = src || AVATAR_MAP[normalized] || null;

  if (avatarSrc) {
    return (
      <img
        src={avatarSrc}
        alt={name}
        title={name}
        className="rounded-full object-cover shrink-0 border border-border shadow-xs"
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-white shadow-xs select-none"
      style={{ width: size, height: size }}
      title={name}
    >
      {initials(name)}
    </div>
  );
}
