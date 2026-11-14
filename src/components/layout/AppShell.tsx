import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { MobileTabBar } from "@/components/layout/MobileTabBar";
import type { Role } from "@/types";

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
  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop Light Sidebar */}
      <Sidebar role={role} activePath={activePath} />

      {/* Main Content Area */}
      <div className="flex min-h-screen flex-1 flex-col pb-20 md:pb-8">
        <Topbar name={name} role={role} title={title} />
        <main className="flex-1 px-4 py-5 md:px-8 max-w-6xl w-full mx-auto">{children}</main>
      </div>

      {/* Mobile Fixed Bottom Navigation Bar */}
      <MobileTabBar role={role} activePath={activePath} />
    </div>
  );
}
