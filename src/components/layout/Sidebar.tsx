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
    <aside className="hidden w-56 shrink-0 flex-col bg-ink px-3 py-5 text-white/90 md:flex">
      <div className="px-2 pb-6">
        <p className="font-display text-lg font-semibold tracking-tight text-white">APIS</p>
        <p className="text-xs text-white/50">AdPulse Intelligence</p>
      </div>
      <nav className="flex flex-1 flex-col gap-0.5">
        {items.map((item) => {
          const active = activePath === item.href || activePath.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded px-3 py-2 text-sm font-medium transition-colors ${
                active ? "bg-white/10 text-white" : "text-white/60 hover:bg-white/5 hover:text-white"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-white/10 px-2 pt-3">
        <p className="text-xs text-white/40">Phase 1 · Foundation</p>
      </div>
    </aside>
  );
}
