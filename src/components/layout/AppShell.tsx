"use client";

import { useState } from "react";
import Link from "next/link";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import type { Role } from "@/types";

const ceoNav = [
  { href: "/ceo/dashboard", label: "Dashboard", icon: "📊" },
  { href: "/ceo/projects", label: "Projects", icon: "📁" },
  { href: "/ceo/staff", label: "Staff", icon: "👥" },
];

const staffNav = [
  { href: "/staff/my-day", label: "My Day", icon: "☀️" },
  { href: "/staff/my-tasks", label: "My Tasks", icon: "📋" },
];

export function AppShell({
  role,
  activePath,
  name,
  title,
  children,
}: {
  role: Role;
  activePath: string;
  name: string;
  title: string;
  children: React.ReactNode;
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const items = role === "CEO" ? ceoNav : staffNav;

  return (
    <div className="flex min-h-screen bg-slate-50/70">
      {/* Desktop Sidebar */}
      <Sidebar role={role} activePath={activePath} />

      {/* Mobile Slide-over Drawer Backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Slide-over Drawer */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-72 transform bg-[#0F172A] px-4 py-6 text-white shadow-2xl transition-transform duration-200 ease-in-out md:hidden flex flex-col ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-2 pb-6 border-b border-slate-800 mb-5">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-[#E31E24] flex items-center justify-center font-display font-bold text-white shadow-md shadow-[#E31E24]/30">
              A
            </div>
            <div>
              <p className="font-display text-base font-bold text-white flex items-center gap-1.5">
                APIS
                <span className="rounded bg-[#14B8A6]/20 px-1.5 py-0.2 text-[10px] font-semibold text-[#14B8A6]">PRO</span>
              </p>
              <p className="text-xs text-[#94A3B8]">AdPulse Intelligence</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(false)}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700 text-slate-400 hover:text-white"
            aria-label="Close menu"
          >
            ✕
          </button>
        </div>

        <nav className="flex flex-1 flex-col gap-2">
          {items.map((item) => {
            const active = activePath === item.href || activePath.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 text-base font-semibold transition-all ${
                  active
                    ? "bg-[#E31E24] text-white shadow-md shadow-[#E31E24]/25 font-bold"
                    : "text-[#94A3B8] hover:bg-slate-800/70 hover:text-white"
                }`}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-slate-800 pt-4 mt-auto">
          <p className="text-xs text-[#94A3B8]/80 font-medium">Logged in as {name}</p>
          <p className="text-[11px] text-[#94A3B8]/50">AdPulse IMC Pvt Ltd</p>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex min-h-screen flex-1 flex-col pb-16 md:pb-0">
        <Topbar name={name} role={role} title={title} onMenuClick={() => setMobileMenuOpen(true)} />
        <main className="flex-1 px-4 py-5 sm:px-6 md:px-8 max-w-7xl w-full mx-auto">{children}</main>

        {/* Mobile Bottom Navigation Bar */}
        <div className="fixed bottom-0 inset-x-0 z-30 flex items-center justify-around border-t border-slate-200 bg-white/95 backdrop-blur py-2.5 px-3 md:hidden shadow-lg">
          {items.map((item) => {
            const active = activePath === item.href || activePath.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-0.5 text-xs font-semibold py-1 px-3 rounded-xl transition-colors ${
                  active ? "text-[#E31E24]" : "text-slate-500 hover:text-slate-900"
                }`}
              >
                <span className="text-lg">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
