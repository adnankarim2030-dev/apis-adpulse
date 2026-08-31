import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
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
    <div className="flex min-h-screen bg-paper">
      <Sidebar role={role} activePath={activePath} />
      <div className="flex min-h-screen flex-1 flex-col">
        <Topbar name={name} role={role} title={title} />
        <main className="flex-1 px-5 py-6 md:px-7">{children}</main>
      </div>
    </div>
  );
}
