import Link from "next/link";
import type { Role } from "@/types";

const ceoNav = [
  { href: "/ceo/dashboard", label: "Dashboard" },
  { href: "/ceo/projects", label: "Projects" },
  { href: "/ceo/staff", label: "Staff" },
];

const staffNav = [
  { href: "/staff/my-day", label: "My Day" },
  { href: "/staff/my-tasks", label: "My Tasks" },
];

export function Sidebar({ role, activePath }: { role: Role; activePath: string }) {
  const items = role === "CEO" ? ceoNav : staffNav;
  return (
    <aside className="hidden w-60 shrink-0 flex-col bg-[#0F172A] px-3.5 py-6 text-white md:flex border-r border-slate-800">
      <div className="px-3 pb-6 border-b border-slate-800/80 mb-4">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-[#E31E24] flex items-center justify-center font-display font-bold text-white shadow-sm shadow-[#E31E24]/30">
            A
          </div>
          <div>
            <p className="font-display text-base font-bold tracking-tight text-white flex items-center gap-1.5">
              APIS
              <span className="rounded bg-[#14B8A6]/20 px-1.5 py-0.2 text-[10px] font-semibold text-[#14B8A6]">PRO</span>
            </p>
            <p className="text-[11px] text-[#94A3B8]">AdPulse Intelligence</p>
          </div>
        </div>
      </div>
      <nav className="flex flex-1 flex-col gap-1.5">
        {items.map((item) => {
          const active = activePath === item.href || activePath.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2.5 rounded-xl px-4 py-3 text-base font-semibold transition-all ${
                active
                  ? "bg-[#E31E24] text-white shadow-md shadow-[#E31E24]/25 font-bold"
                  : "text-[#94A3B8] hover:bg-slate-800/70 hover:text-white"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-slate-800 px-3 pt-3.5 mt-auto">
        <p className="text-xs text-[#94A3B8]/60">AdPulse IMC Pvt Ltd</p>
        <p className="text-[10px] text-[#94A3B8]/40">Phase 1 · Foundation</p>
      </div>
    </aside>
  );
}
