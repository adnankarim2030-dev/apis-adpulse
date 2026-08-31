import { Avatar } from "@/components/ui/Avatar";
import { LogoutButton } from "@/components/layout/LogoutButton";
import type { Role } from "@/types";

export function Topbar({
  name,
  role,
  title,
  onMenuClick,
}: {
  name: string;
  role: Role;
  title: string;
  onMenuClick?: () => void;
}) {
  return (
    <header className="flex items-center justify-between border-b border-slate-200/80 bg-white px-4 py-3.5 sm:px-6 md:px-8">
      <div className="flex items-center gap-3">
        {onMenuClick && (
          <button
            type="button"
            onClick={onMenuClick}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 md:hidden"
            aria-label="Open menu"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        )}
        <h1 className="font-display text-base font-bold text-[#0F172A] tracking-tight sm:text-lg">{title}</h1>
      </div>
      <div className="flex items-center gap-3 sm:gap-4">
        <span className="hidden rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-[#0F172A] border border-slate-200 sm:inline-block">
          {role === "CEO" ? "👑 Executive" : "Staff"}
        </span>
        <div className="flex items-center gap-2 sm:gap-2.5">
          <Avatar name={name} size={32} />
          <span className="hidden text-sm font-semibold text-[#0F172A] sm:inline">{name}</span>
        </div>
        <LogoutButton />
      </div>
    </header>
  );
}
