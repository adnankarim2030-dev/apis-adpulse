import { Avatar } from "@/components/ui/Avatar";
import { LogoutButton } from "@/components/layout/LogoutButton";
import { InstallAppButton } from "@/components/pwa/InstallAppButton";
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
    <header className="flex items-center justify-between border-b border-slate-200/80 bg-white/95 backdrop-blur-md px-4 py-3 md:px-8 shadow-xs sticky top-0 z-30">
      <div className="flex items-center gap-3">
        {/* Mobile Crisp White Logo Badge */}
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white p-1 shadow-md border border-slate-200 md:hidden shrink-0">
          <img src="/adpulse-logo.png" alt="AdPulse" className="h-full w-full object-contain" />
        </div>
        <h1 className="text-lg md:text-xl font-extrabold text-slate-900 tracking-tight">{title}</h1>
      </div>
      <div className="flex items-center gap-2 sm:gap-3">
        <InstallAppButton />
        <span className="hidden rounded-full bg-gradient-to-r from-teal-600 to-emerald-600 text-white shadow-xs px-3 py-0.5 text-xs font-bold sm:inline-block tracking-wide">
          {role === "CEO" ? "Executive Admin" : "Staff"}
        </span>
        <div className="flex items-center gap-2">
          <Avatar name={name} />
          <span className="hidden text-sm font-bold text-slate-800 sm:inline">{name}</span>
        </div>
        <div className="hidden md:block pl-2 border-l border-slate-200">
          <LogoutButton />
        </div>
      </div>
    </header>
  );
}
