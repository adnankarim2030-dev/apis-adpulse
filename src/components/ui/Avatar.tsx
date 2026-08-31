import { initials } from "@/lib/format";

export function Avatar({ name, size = 32 }: { name: string; size?: number }) {
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full bg-[#0F172A] text-xs font-bold text-white shadow-sm ring-1 ring-slate-200"
      style={{ width: size, height: size }}
      title={name}
    >
      {initials(name)}
    </div>
  );
}
