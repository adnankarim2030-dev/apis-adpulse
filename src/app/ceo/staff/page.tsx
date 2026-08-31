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
        <div className="overflow-x-auto rounded-xl border border-slate-200/80 bg-white shadow-sm">
          <table className="w-full text-left text-base">
            <thead>
              <tr className="border-b border-slate-100 text-xs font-bold uppercase tracking-wider text-slate-400 bg-slate-50/50">
                <th className="px-5 py-3.5 font-bold">Staff</th>
                <th className="px-5 py-3.5 font-bold">Department</th>
                <th className="px-5 py-3.5 font-bold">Active Tasks</th>
                <th className="px-5 py-3.5 font-bold">Critical</th>
                <th className="px-5 py-3.5 font-bold">Overdue</th>
                <th className="px-5 py-3.5 font-bold">Workload</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {staff.map((member) => (
                <tr key={member.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="px-5 py-4">
                    <Link href={`/ceo/staff/${member.id}`} className="flex items-center gap-3">
                      <Avatar name={member.name} size={36} />
                      <div>
                        <p className="font-semibold text-[#0F172A] hover:text-[#E31E24] transition-colors">{member.name}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{member.jobTitle ?? member.email}</p>
                      </div>
                    </Link>
                  </td>
                  <td className="px-5 py-4 text-sm font-medium text-slate-600">{member.department ?? "—"}</td>
                  <td className="px-5 py-4 text-sm font-semibold tabular text-slate-700">{member.activeTasks}</td>
                  <td className="px-5 py-4 text-sm font-semibold tabular text-slate-700">{member.criticalTasks}</td>
                  <td className="px-5 py-4 text-sm font-semibold tabular">
                    <span className={member.overdueTasks > 0 ? "font-bold text-[#E31E24]" : "text-slate-700"}>{member.overdueTasks}</span>
                  </td>
                  <td className="px-5 py-4">
                    <span className={clsx("inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold", workloadStyle[member.workload])}>
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
