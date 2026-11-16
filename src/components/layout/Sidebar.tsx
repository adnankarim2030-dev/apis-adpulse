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
    <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-700/60 bg-gradient-to-b from-[#0F172A] via-[#1E293B] to-[#0F172A] px-4 py-6 md:flex text-white shadow-xl relative overflow-hidden">
      {/* Decorative subtle ambient gradient accent */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-teal-500/10 rounded-full blur-2xl pointer-events-none" />

      {/* Brand Header with Solid White Logo Badge for 100% Crisp Visibility */}
      <div className="flex items-center gap-3 px-2 pb-5 border-b border-slate-700/60 relative z-10">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white p-2 shadow-md border border-white shrink-0">
          <img src="/adpulse-logo.png" alt="AdPulse Logo" className="h-full w-full object-contain" />
        </div>
        <div>
          <p className="font-extrabold text-lg tracking-tight text-white leading-tight">APIS</p>
          <p className="text-xs font-bold text-teal-400 tracking-wide">AdPulse IMC</p>
        </div>
      </div>

      {/* Navigation Links with vibrant gradient for active item */}
      <nav className="flex flex-1 flex-col gap-1.5 pt-5 relative z-10">
        {items.map((item) => {
          const active = activePath === item.href || (item.href !== "/" && activePath.startsWith(item.href + "/"));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-button px-3.5 py-2.5 text-sm font-bold transition-all duration-150 min-h-[44px] ${
                active
                  ? "bg-gradient-to-r from-teal-500 via-teal-600 to-emerald-600 text-white shadow-md shadow-teal-900/40 font-bold border border-teal-400/40"
                  : "text-slate-200 hover:bg-white/10 hover:text-white"
              }`}
            >
              <span className="text-base">{item.icon}</span>
              <span className="tracking-wide">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom Status Card */}
      <div className="pt-4 border-t border-slate-700/60 px-2 flex items-center justify-between text-xs text-slate-300 font-semibold relative z-10">
        <span>Phase 1 • Enterprise</span>
        <span className="flex items-center gap-1.5 text-emerald-400 text-xs font-bold">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          Live
        </span>
      </div>
    </aside>
  );
}
