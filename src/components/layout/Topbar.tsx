import { Avatar } from "@/components/ui/Avatar";
import { LogoutButton } from "@/components/layout/LogoutButton";
import type { Role } from "@/types";

export function Topbar({
  name,
  role,
  title,
}: {
  name: string;
  role: Role;
  title: string;
}) {
  return (
    <header className="flex items-center justify-between border-b border-slate-200/80 bg-white px-6 py-4 md:px-8">
      <h1 className="font-display text-lg font-bold text-[#0F172A] tracking-tight">{title}</h1>
      <div className="flex items-center gap-4">
        <span className="hidden rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-[#0F172A] border border-slate-200 sm:inline-block">
          {role === "CEO" ? "👑 Executive" : "Staff"}
        </span>
        <div className="flex items-center gap-2.5">
          <Avatar name={name} />
          <span className="hidden text-sm font-semibold text-[#0F172A] sm:inline">{name}</span>
        </div>
        <LogoutButton />
      </div>
    </header>
  );
}
