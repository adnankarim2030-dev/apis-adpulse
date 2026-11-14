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
    <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-surface px-4 py-6 md:flex">
      {/* Brand Header */}
      <div className="flex items-center gap-3 px-2 pb-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-button bg-primary text-white font-bold text-lg shadow-sm">
          A
        </div>
        <div>
          <p className="font-bold text-lg tracking-tight text-text leading-tight">APIS</p>
          <p className="text-xs text-subtle">AdPulse Management</p>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex flex-1 flex-col gap-1.5 pt-2">
        {items.map((item) => {
          const active = activePath === item.href || (item.href !== "/" && activePath.startsWith(item.href + "/"));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-button px-3.5 py-2.5 text-sm font-semibold transition-all duration-150 min-h-[44px] ${
                active
                  ? "bg-primary-soft text-primary border border-primary-border shadow-xs"
                  : "text-muted hover:bg-neutral hover:text-text border border-transparent"
              }`}
            >
              <span className="text-base">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
