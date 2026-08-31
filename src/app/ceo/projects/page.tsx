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
      <div className="mb-5 flex items-center justify-between gap-4">
        <form className="flex flex-1 flex-wrap items-center gap-2" method="get">
          <Input name="search" defaultValue={searchParams.search} placeholder="Search by name or code" className="max-w-xs" />
          <Select name="status" defaultValue={searchParams.status || ""} className="max-w-[160px]">
            <option value="">All statuses</option>
            {["PLANNING", "NOT_STARTED", "IN_PROGRESS", "ON_HOLD", "AT_RISK", "DELAYED", "COMPLETED", "CANCELLED"].map((s) => (
              <option key={s} value={s}>
                {s.replaceAll("_", " ")}
              </option>
            ))}
          </Select>
          <Select name="priority" defaultValue={searchParams.priority || ""} className="max-w-[140px]">
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
        </form>
        <Link href="/ceo/projects/new">
          <Button>New Project</Button>
        </Link>
      </div>

      {projects.length === 0 ? (
        <EmptyState title="No projects match these filters" description="Try clearing filters, or create a new project to get started." />
      ) : (
        <div className="overflow-x-auto rounded-md border border-line bg-paper-card">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-line text-xs text-slate-soft">
                <th className="px-4 py-2.5 font-medium">Project</th>
                <th className="px-4 py-2.5 font-medium">Client</th>
                <th className="px-4 py-2.5 font-medium">Manager</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
                <th className="px-4 py-2.5 font-medium">Priority</th>
                <th className="px-4 py-2.5 font-medium">Tasks</th>
                <th className="px-4 py-2.5 font-medium">Progress</th>
                <th className="px-4 py-2.5 font-medium">Deadline</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((project) => (
                <tr key={project.id} className="border-b border-line last:border-0 hover:bg-paper">
                  <td className="px-4 py-3">
                    <Link href={`/ceo/projects/${project.id}`} className="font-medium text-ink hover:underline">
                      {project.name}
                    </Link>
                    <p className="text-xs text-slate-soft">{project.code}</p>
                  </td>
                  <td className="px-4 py-3 text-slate">{project.client?.name ?? "—"}</td>
                  <td className="px-4 py-3 text-slate">{project.projectManager?.name ?? "Unassigned"}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={project.status} />
                  </td>
                  <td className="px-4 py-3">
                    <PriorityBadge priority={project.priority} />
                  </td>
                  <td className="px-4 py-3 text-slate">{project._count.tasks}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <ProgressBar value={project.progressPercent} className="w-20" />
                      <span className="tabular text-xs text-slate-soft">{project.progressPercent}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate">{formatDate(project.expectedCompletionDate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AppShell>
  );
}
