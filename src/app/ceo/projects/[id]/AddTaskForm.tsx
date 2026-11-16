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
    const startDate = formData.get("startDate");
    const dueDate = formData.get("dueDate");

    const payload = {
      projectId,
      title: formData.get("title"),
      assignedToId: formData.get("assignedToId") || undefined,
      priority: formData.get("priority") || undefined,
      startDate: startDate ? new Date(startDate as string).toISOString() : undefined,
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
      <Button size="md" variant="primary" onClick={() => setOpen(true)}>
        + Add Task
      </Button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full space-y-4 rounded-card border border-border bg-surface p-5 shadow-soft"
    >
      <div className="flex items-center justify-between pb-2 border-b border-border">
        <h4 className="text-base font-bold text-text">New Task</h4>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-subtle hover:text-text p-1 text-sm"
        >
          ✕
        </button>
      </div>

      {/* Visible upfront: Title, Assignee, Due date */}
      <div className="space-y-3">
        <Field label="Task title *" htmlFor="title">
          <Input id="title" name="title" required placeholder="e.g. Design homepage mockup" />
        </Field>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Field label="Assign" htmlFor="assignedToId">
            <Select id="assignedToId" name="assignedToId" defaultValue="">
              <option value="">Unassigned</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="From (Start date)" htmlFor="startDate">
            <Input id="startDate" name="startDate" type="date" />
          </Field>

          <Field label="To (Due date)" htmlFor="dueDate">
            <Input id="dueDate" name="dueDate" type="date" />
          </Field>
        </div>
      </div>

      {/* Priority and Hours under collapsible "More" */}
      <details className="group rounded-card border border-border bg-neutral/30 p-3">
        <summary className="cursor-pointer text-xs font-bold text-primary select-none flex items-center justify-between">
          <span>More options (Priority, Estimated hours)</span>
          <span className="transition-transform group-open:rotate-180 text-xs">▼</span>
        </summary>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 mt-2 border-t border-border/60">
          <Field label="Priority" htmlFor="priority">
            <Select id="priority" name="priority" defaultValue="MEDIUM">
              <option value="CRITICAL">Urgent</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Normal</option>
              <option value="LOW">Low</option>
            </Select>
          </Field>

          <Field label="Estimated hours" htmlFor="estimatedHours">
            <Input
              id="estimatedHours"
              name="estimatedHours"
              type="number"
              min="0"
              step="0.5"
              placeholder="e.g. 8"
            />
          </Field>
        </div>
      </details>

      {error && (
        <div className="rounded-input bg-danger/15 border border-danger/30 p-2.5 text-xs text-danger-text">
          {error}
        </div>
      )}

      <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
        <Button type="button" variant="ghost" size="md" onClick={() => setOpen(false)}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" size="md" disabled={loading}>
          {loading ? "Adding…" : "Add Task"}
        </Button>
      </div>
    </form>
  );
}
