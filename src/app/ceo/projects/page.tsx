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
import { friendlyDate } from "@/lib/format";
import { projectStatusLabels, priorityLabels } from "@/lib/labels";
import type { ProjectStatus, Priority } from "@/types";

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
      <div className="space-y-6">
        {/* Top Controls: Search & Filter + New Project Button */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <form className="flex flex-1 flex-wrap items-center gap-2" method="get">
            <Input
              name="search"
              defaultValue={searchParams.search}
              placeholder="Search by name or code"
              className="max-w-xs"
            />
            <Select name="status" defaultValue={searchParams.status || ""} className="max-w-[160px]">
              <option value="">All statuses</option>
              {(Object.keys(projectStatusLabels) as ProjectStatus[]).map((s) => (
                <option key={s} value={s}>
                  {projectStatusLabels[s]}
                </option>
              ))}
            </Select>
            <Select name="priority" defaultValue={searchParams.priority || ""} className="max-w-[140px]">
              <option value="">All priorities</option>
              {(Object.keys(priorityLabels) as Priority[]).map((p) => (
                <option key={p} value={p}>
                  {priorityLabels[p]}
                </option>
              ))}
            </Select>
            <Button type="submit" variant="secondary" size="md">
              Filter
            </Button>
          </form>

          <Link href="/ceo/projects/new" className="shrink-0">
            <Button variant="primary" size="md" className="w-full sm:w-auto">
              + New Project
            </Button>
          </Link>
        </div>

        {projects.length === 0 ? (
          <EmptyState
            title="No projects match these filters"
            description="Try clearing filters, or create a new project to get started."
            icon="📁"
          />
        ) : (
          <>
            {/* Mobile: Stacked Cards (No horizontal scroll!) */}
            <div className="space-y-3 md:hidden">
              {projects.map((project) => (
                <div
                  key={project.id}
                  className="rounded-card border border-border bg-surface p-4 shadow-soft space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <Link
                        href={`/ceo/projects/${project.id}`}
                        className="text-base font-bold text-text hover:text-primary transition-colors block leading-snug"
                      >
                        {project.name}
                      </Link>
                      <p className="text-xs text-subtle font-medium">
                        {project.code} {project.client?.name && `• ${project.client.name}`}
                      </p>
                    </div>
                    <StatusBadge status={project.status} />
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs text-muted">
                      <span>Progress</span>
                      <span className="font-bold tabular">{project.progressPercent}%</span>
                    </div>
                    <ProgressBar value={project.progressPercent} />
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-border/60 text-xs font-medium text-muted">
                    <span>Manager: {project.projectManager?.name ?? "Unassigned"}</span>
                    <span>Deadline: {friendlyDate(project.expectedCompletionDate)}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table (md+) */}
            <div className="hidden md:block overflow-hidden rounded-card border border-border bg-surface shadow-soft">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border bg-neutral/50 text-xs font-semibold text-muted">
                    <th className="px-5 py-3">Project</th>
                    <th className="px-5 py-3">Client</th>
                    <th className="px-5 py-3">Manager</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Priority</th>
                    <th className="px-5 py-3">Tasks</th>
                    <th className="px-5 py-3">Progress</th>
                    <th className="px-5 py-3">Deadline</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {projects.map((project) => (
                    <tr key={project.id} className="hover:bg-neutral/30 transition-colors">
                      <td className="px-5 py-3.5">
                        <Link
                          href={`/ceo/projects/${project.id}`}
                          className="font-bold text-text hover:text-primary transition-colors block"
                        >
                          {project.name}
                        </Link>
                        <p className="text-xs text-subtle">{project.code}</p>
                      </td>
                      <td className="px-5 py-3.5 text-muted font-medium">
                        {project.client?.name ?? "—"}
                      </td>
                      <td className="px-5 py-3.5 text-muted font-medium">
                        {project.projectManager?.name ?? "Unassigned"}
                      </td>
                      <td className="px-5 py-3.5">
                        <StatusBadge status={project.status} />
                      </td>
                      <td className="px-5 py-3.5">
                        <PriorityBadge priority={project.priority} />
                      </td>
                      <td className="px-5 py-3.5 text-muted font-medium tabular">
                        {project._count.tasks}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <ProgressBar value={project.progressPercent} className="w-20" />
                          <span className="text-xs font-semibold text-muted tabular">
                            {project.progressPercent}%
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-xs font-medium text-muted">
                        {friendlyDate(project.expectedCompletionDate)}
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
