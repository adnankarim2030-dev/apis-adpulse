import Link from "next/link";
import type { Role } from "@/types";

const ceoNav = [
  { href: "/ceo/dashboard", label: "Dashboard", icon: "📊" },
  { href: "/ceo/projects", label: "Projects", icon: "📁" },
  { href: "/tasks", label: "Tasks Hub", icon: "🗂️" },
  { href: "/performance", label: "Performance", icon: "📈" },
  { href: "/messages", label: "Chats", icon: "💬" },
  { href: "/ceo/staff", label: "Team", icon: "👥" },
];

const staffNav = [
  { href: "/staff/my-day", label: "My Day", icon: "☀️" },
  { href: "/staff/my-tasks", label: "My Tasks", icon: "📋" },
  { href: "/tasks", label: "All Tasks", icon: "🗂️" },
  { href: "/performance", label: "Performance", icon: "📈" },
  { href: "/messages", label: "Chats", icon: "💬" },
];

export function Sidebar({ role, activePath }: { role: Role; activePath: string }) {
  const items = role === "CEO" ? ceoNav : staffNav;

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-800 bg-[#0B132B] px-4 py-6 md:flex text-white shadow-md">
      {/* Brand Header with AdPulse Logo */}
      <div className="flex items-center gap-3 px-2 pb-6 border-b border-slate-800/80">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 p-1.5 shadow-inner border border-white/10">
          <img src="/adpulse-logo.png" alt="AdPulse Logo" className="h-full w-full object-contain" />
        </div>
        <div>
          <p className="font-extrabold text-base tracking-tight text-white leading-tight">APIS</p>
          <p className="text-[11px] font-semibold text-teal-400">AdPulse IMC</p>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex flex-1 flex-col gap-1.5 pt-4">
        {items.map((item) => {
          const active = activePath === item.href || (item.href !== "/" && activePath.startsWith(item.href + "/"));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-button px-3.5 py-2.5 text-sm font-semibold transition-all duration-150 min-h-[44px] ${
                active
                  ? "bg-teal-600 text-white shadow-sm font-bold"
                  : "text-slate-400 hover:bg-slate-800/70 hover:text-white"
              }`}
            >
              <span className="text-base">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom Status Indicator */}
      <div className="pt-4 border-t border-slate-800/80 px-2 flex items-center justify-between text-[11px] text-slate-500 font-medium">
        <span>Phase 1 • Enterprise</span>
        <span className="flex items-center gap-1.5 text-emerald-400 text-[10px]">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          Live
        </span>
      </div>
    </aside>
  );
}
