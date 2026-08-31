"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Field, Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";

interface MemberOption {
  id: string;
  name: string;
}

export function AddTaskForm({ projectId, members }: { projectId: string; members: MemberOption[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    const formData = new FormData(event.currentTarget);
    const dueDate = formData.get("dueDate");

    const payload = {
      projectId,
      title: formData.get("title"),
      assignedToId: formData.get("assignedToId") || undefined,
      priority: formData.get("priority") || undefined,
      dueDate: dueDate ? new Date(dueDate as string).toISOString() : undefined,
      estimatedHours: formData.get("estimatedHours") ? Number(formData.get("estimatedHours")) : undefined,
    };

    try {
      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await response.json();
      if (!response.ok) {
        setError(body.error || "Unable to create task");
        return;
      }
      setOpen(false);
      router.refresh();
    } catch {
      setError("Unable to reach the server. Try again.");
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>
        Add Task
      </Button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-3 rounded-md border border-line bg-paper px-4 py-4">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Task title" htmlFor="title">
          <Input id="title" name="title" required placeholder="Design homepage mockup" />
        </Field>
        <Field label="Assign to" htmlFor="assignedToId">
          <Select id="assignedToId" name="assignedToId" defaultValue="">
            <option value="">Unassigned</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Priority" htmlFor="priority">
          <Select id="priority" name="priority" defaultValue="MEDIUM">
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </Select>
        </Field>
        <Field label="Due date" htmlFor="dueDate">
          <Input id="dueDate" name="dueDate" type="date" />
        </Field>
        <Field label="Est. hours" htmlFor="estimatedHours">
          <Input id="estimatedHours" name="estimatedHours" type="number" min="0" step="0.5" />
        </Field>
      </div>
      {error && <p className="text-sm text-status-critical">{error}</p>}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
          Cancel
        </Button>
        <Button type="submit" size="sm" disabled={loading}>
          {loading ? "Adding…" : "Add Task"}
        </Button>
      </div>
    </form>
  );
}
