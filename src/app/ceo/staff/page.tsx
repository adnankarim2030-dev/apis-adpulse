import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { listStaffWithWorkload } from "@/lib/queries/staff";
import { AppShell } from "@/components/layout/AppShell";
import { Avatar } from "@/components/ui/Avatar";
import { EmptyState } from "@/components/ui/EmptyState";
import clsx from "@/components/ui/clsx";
import type { WorkloadLevel } from "@/lib/queries/staff";

const workloadStyle: Record<WorkloadLevel, string> = {
  Low: "bg-line-soft text-slate",
  Balanced: "bg-status-healthy/10 text-status-healthy",
  High: "bg-status-watch/10 text-status-watch",
  Overloaded: "bg-status-critical/10 text-status-critical",
};

export default async function StaffListPage() {
  const session = await getSession();
  if (!session || session.role !== "CEO") redirect("/login");

  const staff = await listStaffWithWorkload();

  return (
    <AppShell role="CEO" activePath="/ceo/staff" name={session.name} title="Staff">
      {staff.length === 0 ? (
        <EmptyState title="No staff accounts yet" description="Staff accounts are created from Settings in a later phase; seed data provides five to explore now." />
      ) : (
        <div className="overflow-x-auto rounded-md border border-line bg-paper-card">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-line text-xs text-slate-soft">
                <th className="px-4 py-2.5 font-medium">Staff</th>
                <th className="px-4 py-2.5 font-medium">Department</th>
                <th className="px-4 py-2.5 font-medium">Active Tasks</th>
                <th className="px-4 py-2.5 font-medium">Critical</th>
                <th className="px-4 py-2.5 font-medium">Overdue</th>
                <th className="px-4 py-2.5 font-medium">Workload</th>
              </tr>
            </thead>
            <tbody>
              {staff.map((member) => (
                <tr key={member.id} className="border-b border-line last:border-0 hover:bg-paper">
                  <td className="px-4 py-3">
                    <Link href={`/ceo/staff/${member.id}`} className="flex items-center gap-2.5">
                      <Avatar name={member.name} />
                      <div>
                        <p className="font-medium text-ink hover:underline">{member.name}</p>
                        <p className="text-xs text-slate-soft">{member.jobTitle ?? member.email}</p>
                      </div>
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate">{member.department ?? "—"}</td>
                  <td className="px-4 py-3 tabular text-slate">{member.activeTasks}</td>
                  <td className="px-4 py-3 tabular text-slate">{member.criticalTasks}</td>
                  <td className="px-4 py-3 tabular text-slate">
                    <span className={member.overdueTasks > 0 ? "font-medium text-status-critical" : ""}>{member.overdueTasks}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={clsx("inline-flex items-center rounded-sm px-2 py-0.5 text-xs font-medium", workloadStyle[member.workload])}>
                      {member.workload}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AppShell>
  );
}
