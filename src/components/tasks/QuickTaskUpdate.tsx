"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { StatusBadge, PriorityBadge } from "@/components/ui/Badge";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Button } from "@/components/ui/Button";
import { formatDate } from "@/lib/format";
import type { TaskListItem } from "@/types";

const STATUS_OPTIONS: Array<{ value: TaskListItem["status"]; label: string }> = [
  { value: "NOT_STARTED", label: "Not Started" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "ON_HOLD", label: "On Hold" },
  { value: "COMPLETED", label: "Completed" },
];

export function QuickTaskUpdate({ task }: { task: TaskListItem }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState(task.status);
  const [progress, setProgress] = useState(task.progressPercent);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const [statusRes, progressRes] = await Promise.all([
        status !== task.status
          ? fetch(`/api/tasks/${task.id}/status`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ status }),
            })
          : Promise.resolve(null),
        progress !== task.progressPercent
          ? fetch(`/api/tasks/${task.id}/progress`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ progressPercent: progress }),
            })
          : Promise.resolve(null),
      ]);

      if ((statusRes && !statusRes.ok) || (progressRes && !progressRes.ok)) {
        setError("Unable to save your update. Try again.");
        return;
      }

      setOpen(false);
      router.refresh();
    } catch {
      setError("Unable to reach the server. Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-md border border-line bg-paper-card px-4 py-3.5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-ink">{task.title}</p>
          <p className="mt-0.5 text-xs text-slate-soft">
            {task.project?.name ?? "—"}
            {task.dueDate && ` · due ${formatDate(task.dueDate)}`}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <PriorityBadge priority={task.priority} />
          <StatusBadge status={task.status} />
        </div>
      </div>

      <div className="mt-2.5 flex items-center gap-2">
        <ProgressBar value={task.progressPercent} className="flex-1" />
        <span className="tabular text-xs text-slate-soft">{task.progressPercent}%</span>
      </div>

      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="mt-2.5 text-sm font-medium text-signal-700 hover:underline"
        >
          Quick update
        </button>
      ) : (
        <div className="mt-3 space-y-3 border-t border-line pt-3">
          <div className="flex flex-wrap gap-1.5">
            {STATUS_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setStatus(option.value)}
                className={`rounded-sm border px-2.5 py-1 text-xs font-medium transition-colors ${
                  status === option.value
                    ? "border-ink bg-ink text-white"
                    : "border-line bg-white text-slate hover:border-ink-600"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
          <div>
            <label className="mb-1 flex items-center justify-between text-xs text-slate-soft">
              <span>Progress</span>
              <span className="tabular">{progress}%</span>
            </label>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={progress}
              onChange={(e) => setProgress(Number(e.target.value))}
              className="w-full accent-signal"
            />
          </div>
          {error && <p className="text-xs text-status-critical">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="button" size="sm" onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : "Save update"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
