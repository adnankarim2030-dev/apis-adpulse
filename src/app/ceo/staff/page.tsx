import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { listStaffWithWorkload } from "@/lib/queries/staff";
import { AppShell } from "@/components/layout/AppShell";
import { Avatar } from "@/components/ui/Avatar";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatWorkload } from "@/lib/labels";
import clsx from "@/components/ui/clsx";
import type { WorkloadLevel } from "@/lib/queries/staff";

const workloadStyle: Record<WorkloadLevel, string> = {
  Low: "bg-neutral text-neutral-text border-neutral-text/20",
  Balanced: "bg-success text-success-text border-success-text/20",
  High: "bg-warning text-warning-text border-warning-text/20",
  Overloaded: "bg-danger text-danger-text border-danger-text/20",
};

export default async function StaffListPage() {
  const session = await getSession();
  if (!session || session.role !== "CEO") redirect("/login");

  const staff = await listStaffWithWorkload();

  return (
    <AppShell role="CEO" activePath="/ceo/staff" name={session.name} title="Team">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-text">Team Members & Workload</h2>
            <p className="text-xs text-muted">Monitor team capacity and task distribution</p>
          </div>
          <span className="text-xs font-semibold rounded-chip bg-primary-soft text-primary px-3 py-1 border border-primary-border">
            {staff.length} Members
          </span>
        </div>

        {staff.length === 0 ? (
          <EmptyState
            title="No team accounts found"
            description="Team accounts will show up here once created."
            icon="👥"
          />
        ) : (
          <>
            {/* Mobile: Stacked Cards (No horizontal scroll!) */}
            <div className="space-y-3 md:hidden">
              {staff.map((member) => (
                <div
                  key={member.id}
                  className="rounded-card border border-border bg-surface p-4 shadow-soft space-y-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <Link
                      href={`/ceo/staff/${member.id}`}
                      className="flex items-center gap-3 min-w-0"
                    >
                      <Avatar name={member.name} size={36} />
                      <div className="min-w-0">
                        <p className="text-base font-bold text-text hover:text-primary transition-colors truncate">
                          {member.name}
                        </p>
                        <p className="text-xs text-subtle truncate">
                          {member.jobTitle ?? member.department ?? member.email}
                        </p>
                      </div>
                    </Link>

                    <span
                      className={clsx(
                        "inline-flex items-center gap-1 rounded-chip border px-2.5 py-0.5 text-xs font-semibold shrink-0",
                        workloadStyle[member.workload]
                      )}
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-75" />
                      {formatWorkload(member.workload)}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border/60 text-center text-xs">
                    <div className="rounded-button bg-neutral/50 p-2">
                      <span className="text-muted block text-[11px]">Active</span>
                      <span className="font-bold text-text text-sm">{member.activeTasks}</span>
                    </div>
                    <div className="rounded-button bg-neutral/50 p-2">
                      <span className="text-muted block text-[11px]">Urgent</span>
                      <span className="font-bold text-text text-sm">{member.criticalTasks}</span>
                    </div>
                    <div className="rounded-button bg-neutral/50 p-2">
                      <span className="text-muted block text-[11px]">Overdue</span>
                      <span
                        className={clsx(
                          "font-bold text-sm",
                          member.overdueTasks > 0 ? "text-danger-text" : "text-text"
                        )}
                      >
                        {member.overdueTasks}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table (md+) */}
            <div className="hidden md:block overflow-hidden rounded-card border border-border bg-surface shadow-soft">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border bg-neutral/50 text-xs font-semibold text-muted">
                    <th className="px-5 py-3">Team Member</th>
                    <th className="px-5 py-3">Department</th>
                    <th className="px-5 py-3">Active Tasks</th>
                    <th className="px-5 py-3">Urgent</th>
                    <th className="px-5 py-3">Overdue</th>
                    <th className="px-5 py-3">Workload</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {staff.map((member) => (
                    <tr key={member.id} className="hover:bg-neutral/30 transition-colors">
                      <td className="px-5 py-3.5">
                        <Link
                          href={`/ceo/staff/${member.id}`}
                          className="flex items-center gap-3 group"
                        >
                          <Avatar name={member.name} size={32} />
                          <div>
                            <p className="font-bold text-text group-hover:text-primary transition-colors">
                              {member.name}
                            </p>
                            <p className="text-xs text-subtle">
                              {member.jobTitle ?? member.email}
                            </p>
                          </div>
                        </Link>
                      </td>
                      <td className="px-5 py-3.5 text-muted font-medium">
                        {member.department ?? "—"}
                      </td>
                      <td className="px-5 py-3.5 text-text font-bold tabular">
                        {member.activeTasks}
                      </td>
                      <td className="px-5 py-3.5 text-text font-bold tabular">
                        {member.criticalTasks}
                      </td>
                      <td className="px-5 py-3.5 tabular">
                        <span
                          className={
                            member.overdueTasks > 0
                              ? "font-bold text-danger-text"
                              : "text-muted"
                          }
                        >
                          {member.overdueTasks}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={clsx(
                            "inline-flex items-center gap-1 rounded-chip border px-2.5 py-0.5 text-xs font-semibold",
                            workloadStyle[member.workload]
                          )}
                        >
                          <span className="h-1.5 w-1.5 rounded-full bg-current opacity-75" />
                          {formatWorkload(member.workload)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
