"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardBody } from "@/components/ui/Card";
import { Field, Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";

interface ClientOption {
  id: string;
  name: string;
  company: string | null;
}
interface StaffOption {
  id: string;
  name: string;
  jobTitle: string | null;
}

export function NewProjectForm({ clients, staff }: { clients: ClientOption[]; staff: StaffOption[] }) {
  const router = useRouter();
  const currentYear = new Date().getFullYear();
  const [projectCode, setProjectCode] = useState(`ADP-${currentYear}-01`);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function toggleMember(id: string) {
    setSelectedMembers((prev) => (prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(event.currentTarget);
    const payload: Record<string, unknown> = {
      name: formData.get("name"),
      code: formData.get("code") || projectCode,
      department: formData.get("department") || undefined,
      priority: formData.get("priority") || undefined,
      clientId: formData.get("clientId") || undefined,
      projectManagerId: formData.get("projectManagerId") || undefined,
      description: formData.get("description") || undefined,
      objectives: formData.get("objectives") || undefined,
      memberIds: selectedMembers.length ? selectedMembers : undefined,
    };

    const expectedCompletionDate = formData.get("expectedCompletionDate");
    if (expectedCompletionDate) {
      payload.expectedCompletionDate = new Date(expectedCompletionDate as string).toISOString();
    }
    const startDate = formData.get("startDate");
    if (startDate) {
      payload.startDate = new Date(startDate as string).toISOString();
    }

    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await response.json();
      if (!response.ok) {
        setError(body.error || "Unable to create project");
        return;
      }
      router.push(`/ceo/projects/${body.data.id}`);
      router.refresh();
    } catch {
      setError("Unable to reach the server. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="max-w-3xl mx-auto shadow-soft">
      <CardBody>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Main Required Fields (Visible Upfront) */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Project name *" htmlFor="name">
                <Input
                  id="name"
                  name="name"
                  required
                  placeholder="e.g. Q4 Brand Refresh"
                  className="text-base"
                />
              </Field>

              <Field label="Project code *" htmlFor="code" hint="Prefilled, editable">
                <Input
                  id="code"
                  name="code"
                  required
                  value={projectCode}
                  onChange={(e) => setProjectCode(e.target.value)}
                  placeholder={`ADP-${currentYear}-01`}
                  className="text-base font-mono font-medium"
                />
              </Field>
            </div>

            <Field label="Deadline / Target completion *" htmlFor="expectedCompletionDate">
              <Input
                id="expectedCompletionDate"
                name="expectedCompletionDate"
                type="date"
                required
                className="text-base"
              />
            </Field>

            {/* Who is working on it / Team */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-text">
                Who is working on it? (Team members)
              </label>
              <div className="flex flex-wrap gap-2">
                {staff.length === 0 && (
                  <p className="text-sm text-subtle">No staff accounts available.</p>
                )}
                {staff.map((s) => {
                  const isSelected = selectedMembers.includes(s.id);
                  return (
                    <button
                      type="button"
                      key={s.id}
                      onClick={() => toggleMember(s.id)}
                      className={`inline-flex items-center gap-1.5 rounded-chip px-3.5 py-2 text-sm font-semibold transition-all min-h-[44px] select-none ${
                        isSelected
                          ? "bg-primary text-white shadow-xs"
                          : "bg-neutral text-text hover:bg-neutral/80 border border-border"
                      }`}
                    >
                      <span>{isSelected ? "✓" : "+"}</span>
                      <span>{s.name}</span>
                      {s.jobTitle && <span className="text-xs opacity-75">({s.jobTitle})</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Collapsed "More details" */}
          <details className="group rounded-card border border-border bg-neutral/30 p-4 transition-all">
            <summary className="cursor-pointer text-sm font-bold text-primary select-none flex items-center justify-between">
              <span>More details (Client, Manager, Start date, Notes)</span>
              <span className="transition-transform group-open:rotate-180 text-xs">▼</span>
            </summary>

            <div className="space-y-4 pt-4 mt-3 border-t border-border/60">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Client" htmlFor="clientId">
                  <Select id="clientId" name="clientId" defaultValue="">
                    <option value="">No client</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                        {c.company ? ` (${c.company})` : ""}
                      </option>
                    ))}
                  </Select>
                </Field>

                <Field label="Project manager" htmlFor="projectManagerId">
                  <Select id="projectManagerId" name="projectManagerId" defaultValue="">
                    <option value="">Unassigned</option>
                    {staff.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                        {s.jobTitle ? ` — ${s.jobTitle}` : ""}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Field label="Department" htmlFor="department">
                  <Input id="department" name="department" placeholder="e.g. Creative" />
                </Field>
                <Field label="Priority" htmlFor="priority">
                  <Select id="priority" name="priority" defaultValue="MEDIUM">
                    <option value="CRITICAL">Urgent</option>
                    <option value="HIGH">High</option>
                    <option value="MEDIUM">Normal</option>
                    <option value="LOW">Low</option>
                  </Select>
                </Field>
                <Field label="Start date" htmlFor="startDate">
                  <Input id="startDate" name="startDate" type="date" />
                </Field>
              </div>

              <Field label="Description" htmlFor="description">
                <textarea
                  id="description"
                  name="description"
                  rows={2}
                  className="w-full rounded-input border border-border bg-surface px-3.5 py-2.5 text-base text-text placeholder:text-subtle focus:border-primary focus:outline-none"
                  placeholder="What is this project about?"
                />
              </Field>

              <Field label="Objectives" htmlFor="objectives">
                <textarea
                  id="objectives"
                  name="objectives"
                  rows={2}
                  className="w-full rounded-input border border-border bg-surface px-3.5 py-2.5 text-base text-text placeholder:text-subtle focus:border-primary focus:outline-none"
                  placeholder="What does success look like?"
                />
              </Field>
            </div>
          </details>

          {error && (
            <div className="rounded-input bg-danger/15 border border-danger/30 p-3 text-sm text-danger-text">
              {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
            <Button
              type="button"
              variant="ghost"
              size="md"
              onClick={() => router.back()}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="md" disabled={loading}>
              {loading ? "Creating…" : "Create Project"}
            </Button>
          </div>
        </form>
      </CardBody>
    </Card>
  );
}
