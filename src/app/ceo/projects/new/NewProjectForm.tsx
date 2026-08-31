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
      code: formData.get("code"),
      department: formData.get("department") || undefined,
      priority: formData.get("priority") || undefined,
      clientId: formData.get("clientId") || undefined,
      projectManagerId: formData.get("projectManagerId") || undefined,
      description: formData.get("description") || undefined,
      objectives: formData.get("objectives") || undefined,
      memberIds: selectedMembers.length ? selectedMembers : undefined,
    };
    const expectedCompletionDate = formData.get("expectedCompletionDate");
    if (expectedCompletionDate) payload.expectedCompletionDate = new Date(expectedCompletionDate as string).toISOString();
    const startDate = formData.get("startDate");
    if (startDate) payload.startDate = new Date(startDate as string).toISOString();

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
    <Card>
      <CardBody>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Project name" htmlFor="name">
              <Input id="name" name="name" required placeholder="Q4 Brand Refresh" />
            </Field>
            <Field label="Project code" htmlFor="code" hint="Letters, numbers and dashes">
              <Input id="code" name="code" required placeholder="ADP-Q4-01" />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
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

          <div className="grid grid-cols-3 gap-4">
            <Field label="Department" htmlFor="department">
              <Input id="department" name="department" placeholder="Creative" />
            </Field>
            <Field label="Priority" htmlFor="priority">
              <Select id="priority" name="priority" defaultValue="MEDIUM">
                <option value="CRITICAL">Critical</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </Select>
            </Field>
            <Field label="Target completion" htmlFor="expectedCompletionDate">
              <Input id="expectedCompletionDate" name="expectedCompletionDate" type="date" />
            </Field>
          </div>

          <Field label="Start date" htmlFor="startDate">
            <Input id="startDate" name="startDate" type="date" className="max-w-xs" />
          </Field>

          <Field label="Assign staff" htmlFor="members" hint="These staff members will be able to see this project">
            <div className="flex flex-wrap gap-2">
              {staff.length === 0 && <p className="text-sm text-slate-soft">No active staff accounts yet.</p>}
              {staff.map((s) => (
                <button
                  type="button"
                  key={s.id}
                  onClick={() => toggleMember(s.id)}
                  className={`rounded-sm border px-3 py-1.5 text-sm transition-colors ${
                    selectedMembers.includes(s.id)
                      ? "border-ink bg-ink text-white"
                      : "border-line bg-white text-ink hover:border-ink-600"
                  }`}
                >
                  {s.name}
                </button>
              ))}
            </div>
          </Field>

          <Field label="Description" htmlFor="description">
            <textarea
              id="description"
              name="description"
              rows={3}
              className="w-full rounded border border-line bg-white px-3 py-2 text-sm text-ink focus:border-ink-600"
              placeholder="What is this project about?"
            />
          </Field>

          <Field label="Objectives" htmlFor="objectives">
            <textarea
              id="objectives"
              name="objectives"
              rows={2}
              className="w-full rounded border border-line bg-white px-3 py-2 text-sm text-ink focus:border-ink-600"
              placeholder="What does success look like?"
            />
          </Field>

          {error && <p className="text-sm text-status-critical">{error}</p>}

          <div className="flex justify-end gap-2 border-t border-line pt-4">
            <Button type="submit" disabled={loading}>
              {loading ? "Creating…" : "Create Project"}
            </Button>
          </div>
        </form>
      </CardBody>
    </Card>
  );
}
