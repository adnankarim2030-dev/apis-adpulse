import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { listProjects } from "@/lib/queries/projects";
import { AppShell } from "@/components/layout/AppShell";
import { StatusBadge, PriorityBadge } from "@/components/ui/Badge";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Input } from "@/components/ui/Input";
import { formatDate } from "@/lib/format";

interface PageProps {
  searchParams: { status?: string; priority?: string; search?: string };
}

export default async function CeoProjectsPage({ searchParams }: PageProps) {
  const session = await getSession();
  if (!session || session.role !== "CEO") redirect("/login");

  const projects = await listProjects(session, {
    status: searchParams.status || undefined,
    priority: searchParams.priority || undefined,
    search: searchParams.search || undefined,
  });

  return (
    <AppShell role="CEO" activePath="/ceo/projects" name={session.name} title="Projects">
      <div className="mb-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <form className="flex flex-1 flex-wrap items-center gap-2" method="get">
          <Input name="search" defaultValue={searchParams.search} placeholder="Search by name or code" className="w-full sm:max-w-xs" />
          <div className="flex w-full sm:w-auto items-center gap-2">
            <Select name="status" defaultValue={searchParams.status || ""} className="flex-1 sm:max-w-[160px]">
              <option value="">All statuses</option>
              {["PLANNING", "NOT_STARTED", "IN_PROGRESS", "ON_HOLD", "AT_RISK", "DELAYED", "COMPLETED", "CANCELLED"].map((s) => (
                <option key={s} value={s}>
                  {s.replaceAll("_", " ")}
                </option>
              ))}
            </Select>
            <Select name="priority" defaultValue={searchParams.priority || ""} className="flex-1 sm:max-w-[140px]">
              <option value="">All priorities</option>
              {["CRITICAL", "HIGH", "MEDIUM", "LOW"].map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </Select>
            <Button type="submit" variant="secondary" size="sm">
              Filter
            </Button>
          </div>
        </form>
        <Link href="/ceo/projects/new" className="self-end sm:self-auto">
          <Button className="w-full sm:w-auto">+ New Project</Button>
        </Link>
      </div>

      {projects.length === 0 ? (
        <EmptyState title="No projects match these filters" description="Try clearing filters, or create a new project to get started." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200/80 bg-white shadow-sm">
          <table className="w-full text-left text-base">
            <thead>
              <tr className="border-b border-slate-100 text-xs font-bold uppercase tracking-wider text-slate-400 bg-slate-50/50">
                <th className="px-5 py-3.5 font-bold">Project</th>
                <th className="px-5 py-3.5 font-bold">Client</th>
                <th className="px-5 py-3.5 font-bold">Manager</th>
                <th className="px-5 py-3.5 font-bold">Status</th>
                <th className="px-5 py-3.5 font-bold">Priority</th>
                <th className="px-5 py-3.5 font-bold">Tasks</th>
                <th className="px-5 py-3.5 font-bold">Progress</th>
                <th className="px-5 py-3.5 font-bold">Deadline</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {projects.map((project) => (
                <tr key={project.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="px-5 py-4">
                    <Link href={`/ceo/projects/${project.id}`} className="font-semibold text-[#0F172A] hover:text-[#E31E24] transition-colors">
                      {project.name}
                    </Link>
                    <p className="text-xs text-slate-400 mt-0.5">{project.code}</p>
                  </td>
                  <td className="px-5 py-4 text-sm font-medium text-slate-600">{project.client?.name ?? "—"}</td>
                  <td className="px-5 py-4 text-sm font-medium text-slate-600">{project.projectManager?.name ?? "Unassigned"}</td>
                  <td className="px-5 py-4">
                    <StatusBadge status={project.status} />
                  </td>
                  <td className="px-5 py-4">
                    <PriorityBadge priority={project.priority} />
                  </td>
                  <td className="px-5 py-4 text-sm font-semibold tabular text-slate-700">{project._count.tasks}</td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <ProgressBar value={project.progressPercent} className="w-24" />
                      <span className="tabular text-xs font-semibold text-slate-500">{project.progressPercent}%</span>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-sm font-medium text-slate-600">{formatDate(project.expectedCompletionDate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AppShell>
  );
}
