import { initials } from "@/lib/format";

export function Avatar({ name, size = 28 }: { name: string; size?: number }) {
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full bg-ink text-xs font-semibold text-white"
      style={{ width: size, height: size }}
      title={name}
    >
      {initials(name)}
    </div>
  );
}
