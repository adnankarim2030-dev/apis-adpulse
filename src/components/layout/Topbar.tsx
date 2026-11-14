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
    <header className="flex items-center justify-between border-b border-border bg-surface px-4 py-3 md:px-8">
      <h1 className="text-lg md:text-xl font-bold text-text tracking-tight">{title}</h1>
      <div className="flex items-center gap-2 sm:gap-3">
        <InstallAppButton />
        <span className="hidden rounded-chip bg-primary-soft text-primary border border-primary-border/60 px-2.5 py-0.5 text-xs font-semibold sm:inline-block">
          {role === "CEO" ? "Executive Admin" : "Staff"}
        </span>
        <div className="flex items-center gap-2">
          <Avatar name={name} />
          <span className="hidden text-sm font-semibold text-text sm:inline">{name}</span>
        </div>
        <div className="hidden md:block pl-2 border-l border-border">
          <LogoutButton />
        </div>
      </div>
    </header>
  );
}
