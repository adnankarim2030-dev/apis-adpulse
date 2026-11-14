"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Role } from "@/types";

interface MobileTabBarProps {
  role: Role;
  activePath: string;
}

export function MobileTabBar({ role, activePath }: MobileTabBarProps) {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  if (role === "CEO") {
    const ceoTabs = [
      { href: "/ceo/dashboard", label: "Dashboard", icon: "📊" },
      { href: "/ceo/projects", label: "Projects", icon: "📁" },
      { href: "/tasks", label: "Tasks", icon: "🗂️" },
      { href: "/performance", label: "Performance", icon: "📈" },
      { href: "/messages", label: "Chats", icon: "💬" },
    ];

    return (
      <nav className="fixed bottom-0 inset-x-0 z-40 bg-surface/95 backdrop-blur-md border-t border-border flex items-center justify-around px-1 py-1 md:hidden shadow-lg safe-bottom">
        {ceoTabs.map((tab) => {
          const active = activePath === tab.href || activePath.startsWith(tab.href + "/");
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex flex-col items-center justify-center flex-1 min-h-[48px] py-1 text-[11px] font-semibold rounded-button transition-colors ${
                active ? "text-primary font-bold" : "text-muted hover:text-text"
              }`}
            >
              <span className="text-lg leading-none">{tab.icon}</span>
              <span className="mt-1 leading-none">{tab.label}</span>
            </Link>
          );
        })}
      </nav>
    );
  }

  // Staff Tabs
  const staffTabs = [
    { href: "/staff/my-day", label: "My Day", icon: "☀️" },
    { href: "/tasks", label: "All Tasks", icon: "🗂️" },
    { href: "/performance", label: "Performance", icon: "📈" },
    { href: "/messages", label: "Chats", icon: "💬" },
  ];

  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 bg-surface/95 backdrop-blur-md border-t border-border flex items-center justify-around px-1 py-1 md:hidden shadow-lg safe-bottom">
      {staffTabs.map((tab) => {
        const active = activePath === tab.href || activePath.startsWith(tab.href + "/");
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`flex flex-col items-center justify-center flex-1 min-h-[48px] py-1 text-[11px] font-semibold rounded-button transition-colors ${
              active ? "text-primary font-bold" : "text-muted hover:text-text"
            }`}
          >
            <span className="text-lg leading-none">{tab.icon}</span>
            <span className="mt-1 leading-none">{tab.label}</span>
          </Link>
        );
      })}

      <button
        onClick={handleLogout}
        disabled={loggingOut}
        className="flex flex-col items-center justify-center flex-1 min-h-[48px] py-1 text-[11px] font-semibold text-muted hover:text-danger-text transition-colors disabled:opacity-50"
      >
        <span className="text-lg leading-none">🚪</span>
        <span className="mt-1 leading-none">{loggingOut ? "…" : "Logout"}</span>
      </button>
    </nav>
  );
}
