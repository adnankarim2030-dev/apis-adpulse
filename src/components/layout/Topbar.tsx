import { Avatar } from "@/components/ui/Avatar";
import { LogoutButton } from "@/components/layout/LogoutButton";
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
    <header className="flex items-center justify-between border-b border-line bg-paper-card px-5 py-3.5 md:px-7">
      <h1 className="font-display text-lg font-semibold text-ink">{title}</h1>
      <div className="flex items-center gap-4">
        <span className="hidden rounded-sm bg-line-soft px-2 py-0.5 text-xs font-medium text-slate sm:inline-block">
          {role === "CEO" ? "Executive" : "Staff"}
        </span>
        <div className="flex items-center gap-2">
          <Avatar name={name} />
          <span className="hidden text-sm font-medium text-ink sm:inline">{name}</span>
        </div>
        <LogoutButton />
      </div>
    </header>
  );
}
