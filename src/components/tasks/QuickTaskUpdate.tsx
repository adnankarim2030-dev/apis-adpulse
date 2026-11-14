"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { StatusBadge, PriorityBadge } from "@/components/ui/Badge";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Toast } from "@/components/ui/Toast";
import { friendlyDate, daysUntil } from "@/lib/format";
import { formatBlockerReason } from "@/lib/labels";
import type { TaskListItem, TaskStatus, BlockerReason } from "@/types";

interface QuickTaskUpdateProps {
  task: TaskListItem;
  onStatusChange?: (taskId: string, newStatus: TaskStatus) => void;
}

const BLOCKER_REASONS: Array<{ value: BlockerReason; label: string; icon: string }> = [
  { value: "WAITING_CLIENT", label: "Waiting on client", icon: "👤" },
  { value: "WAITING_APPROVAL", label: "Waiting for approval", icon: "⏳" },
  { value: "WAITING_TEAMMATE", label: "Waiting on teammate", icon: "🤝" },
  { value: "TECHNICAL_ISSUE", label: "Technical issue", icon: "💻" },
  { value: "NEED_INFORMATION", label: "Need information", icon: "❓" },
  { value: "OTHER", label: "Other reason", icon: "💬" },
];

export function QuickTaskUpdate({ task, onStatusChange }: QuickTaskUpdateProps) {
  const router = useRouter();

  // Optimistic local state
  const [currentStatus, setCurrentStatus] = useState<TaskStatus>(task.status);
  const [currentProgress, setCurrentProgress] = useState<number>(task.progressPercent);

  // Active blocker state
  const initialActiveBlocker = task.blockers?.find((b) => !b.resolvedAt) || null;
  const [activeBlocker, setActiveBlocker] = useState<{
    reason: BlockerReason;
    note?: string | null;
  } | null>(initialActiveBlocker ? { reason: initialActiveBlocker.reason, note: initialActiveBlocker.note } : null);

  // Modals / Bottom Sheets
  const [isUpdateOpen, setIsUpdateOpen] = useState(false);
  const [isStuckModalOpen, setIsStuckModalOpen] = useState(false);
  const [selectedProgress, setSelectedProgress] = useState<number>(task.progressPercent);
  const [selectedBlockerReason, setSelectedBlockerReason] = useState<BlockerReason>("WAITING_CLIENT");
  const [note, setNote] = useState("");
  const [blockerNote, setBlockerNote] = useState("");
  const [loading, setLoading] = useState(false);

  // Toast notification state
  const [toast, setToast] = useState<{
    message: string;
    type?: "success" | "error" | "info";
    action?: { label: string; onClick: () => void };
  } | null>(null);

  const dueDiff = task.dueDate ? daysUntil(task.dueDate) : null;
  const isLate = dueDiff !== null && dueDiff < 0 && currentStatus !== "COMPLETED";

  // ONE-TAP DONE
  async function handleMarkDone() {
    const prevStatus = currentStatus;
    const prevProgress = currentProgress;

    setCurrentStatus("COMPLETED");
    setCurrentProgress(100);
    setActiveBlocker(null);
    if (onStatusChange) onStatusChange(task.id, "COMPLETED");

    setToast({
      message: "Marked done",
      type: "success",
      action: {
        label: "Undo",
        onClick: async () => {
          setCurrentStatus(prevStatus);
          setCurrentProgress(prevProgress);
          if (onStatusChange) onStatusChange(task.id, prevStatus);

          try {
            await fetch(`/api/tasks/${task.id}/status`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ status: prevStatus }),
            });
            router.refresh();
          } catch {
            setToast({
              message: "Couldn't save. Check your connection and try again.",
              type: "error",
            });
          }
        },
      },
    });

    try {
      const res = await fetch(`/api/tasks/${task.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "COMPLETED" }),
      });
      if (!res.ok) throw new Error();
      router.refresh();
    } catch {
      setCurrentStatus(prevStatus);
      setCurrentProgress(prevProgress);
      if (onStatusChange) onStatusChange(task.id, prevStatus);
      setToast({
        message: "Couldn't save. Check your connection and try again.",
        type: "error",
      });
    }
  }

  // SUBMIT BLOCKER (B1: Stuck asks why)
  async function handleSubmitBlocker() {
    setLoading(true);
    const prevStatus = currentStatus;

    setCurrentStatus("ON_HOLD");
    setActiveBlocker({ reason: selectedBlockerReason, note: blockerNote });
    if (onStatusChange) onStatusChange(task.id, "ON_HOLD");
    setIsStuckModalOpen(false);

    setToast({
      message: "Task marked as stuck",
      type: "info",
    });

    try {
      const res = await fetch(`/api/tasks/${task.id}/blocker`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason: selectedBlockerReason,
          note: blockerNote || undefined,
        }),
      });
      if (!res.ok) throw new Error();
      router.refresh();
    } catch {
      setCurrentStatus(prevStatus);
      setActiveBlocker(null);
      if (onStatusChange) onStatusChange(task.id, prevStatus);
      setToast({
        message: "Couldn't save. Check your connection and try again.",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  }

  // BACK TO WORK (Clears blocker and sets status to Working on it)
  async function handleBackToWork() {
    setLoading(true);
    const prevStatus = currentStatus;

    setCurrentStatus("IN_PROGRESS");
    setActiveBlocker(null);
    if (onStatusChange) onStatusChange(task.id, "IN_PROGRESS");

    setToast({
      message: "Resumed! Status set to Working on it",
      type: "success",
    });

    try {
      const res = await fetch(`/api/tasks/${task.id}/blocker`, {
        method: "PATCH",
      });
      if (!res.ok) throw new Error();
      router.refresh();
    } catch {
      setCurrentStatus(prevStatus);
      if (onStatusChange) onStatusChange(task.id, prevStatus);
      setToast({
        message: "Couldn't save. Check your connection and try again.",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  }

  // SAVE PROGRESS
  async function handleSaveProgress() {
    setLoading(true);
    let targetStatus = currentStatus;

    if (selectedProgress > 0 && currentStatus === "NOT_STARTED") {
      targetStatus = "IN_PROGRESS";
    }
    if (selectedProgress === 100) {
      targetStatus = "COMPLETED";
    }

    const prevProgress = currentProgress;
    const prevStatus = currentStatus;

    setCurrentProgress(selectedProgress);
    setCurrentStatus(targetStatus);
    if (onStatusChange) onStatusChange(task.id, targetStatus);
    setIsUpdateOpen(false);

    try {
      const promises: Promise<Response>[] = [
        fetch(`/api/tasks/${task.id}/progress`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ progressPercent: selectedProgress }),
        }),
      ];

      if (targetStatus !== prevStatus) {
        promises.push(
          fetch(`/api/tasks/${task.id}/status`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: targetStatus }),
          })
        );
      }

      const results = await Promise.all(promises);
      if (results.some((r) => !r.ok)) throw new Error();

      setToast({ message: "Saved", type: "success" });
      router.refresh();
    } catch {
      setCurrentProgress(prevProgress);
      setCurrentStatus(prevStatus);
      if (onStatusChange) onStatusChange(task.id, prevStatus);
      setToast({
        message: "Couldn't save. Check your connection and try again.",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="rounded-card border border-border bg-surface p-5 shadow-soft transition-all duration-150 space-y-4">
        {/* Header Row: Title & Badges */}
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1 min-w-0">
            <h3 className="text-[18px] font-bold text-text leading-snug break-words">
              {task.title}
            </h3>
            <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-muted">
              <span>{task.project?.name ?? "No Project"}</span>
              <span>•</span>
              <span className={isLate ? "text-danger-text font-bold" : "text-subtle"}>
                {task.dueDate ? friendlyDate(task.dueDate) : "No due date"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <PriorityBadge priority={task.priority} />
            <StatusBadge status={currentStatus} />
          </div>
        </div>

        {/* If Task is Stuck: Show Blocker Banner & "Back to work" button */}
        {currentStatus === "ON_HOLD" && (
          <div className="rounded-button bg-warning/15 border border-warning-text/30 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in">
            <div className="space-y-0.5">
              <p className="text-xs font-bold text-warning-text flex items-center gap-1.5">
                <span>⚠️ Stuck:</span>
                <span>
                  {activeBlocker ? formatBlockerReason(activeBlocker.reason) : "Waiting on blocker"}
                </span>
              </p>
              {activeBlocker?.note && (
                <p className="text-xs text-text italic">&ldquo;{activeBlocker.note}&rdquo;</p>
              )}
            </div>

            <button
              type="button"
              onClick={handleBackToWork}
              disabled={loading}
              className="inline-flex items-center justify-center rounded-button bg-primary hover:bg-primary-hover text-white text-xs font-bold px-4 py-2 min-h-[44px] transition-all active:scale-[0.98] shrink-0 shadow-xs"
            >
              ▶ Back to work
            </button>
          </div>
        )}

        {/* Progress Bar & Percentage */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs font-semibold text-muted">
            <span>Progress</span>
            <span className="tabular">{currentProgress}%</span>
          </div>
          <ProgressBar value={currentProgress} />
        </div>

        {/* Big Action Button Row */}
        <div className="grid grid-cols-3 gap-2 pt-1 border-t border-border/60">
          <button
            type="button"
            onClick={() => {
              setSelectedProgress(currentProgress);
              setIsUpdateOpen(true);
            }}
            className="flex items-center justify-center rounded-button bg-surface border border-border hover:bg-neutral text-text text-sm font-semibold min-h-[44px] transition-all active:scale-[0.98]"
          >
            Update
          </button>

          <button
            type="button"
            onClick={handleMarkDone}
            className="flex items-center justify-center rounded-button bg-success/20 hover:bg-success/30 text-success-text border border-success-text/30 text-sm font-bold min-h-[44px] transition-all active:scale-[0.98]"
          >
            Done ✓
          </button>

          <button
            type="button"
            onClick={() => setIsStuckModalOpen(true)}
            className="flex items-center justify-center rounded-button bg-warning/20 hover:bg-warning/30 text-warning-text border border-warning-text/30 text-sm font-semibold min-h-[44px] transition-all active:scale-[0.98]"
          >
            Stuck
          </button>
        </div>
      </div>

      {/* Progress Bottom Sheet */}
      {isUpdateOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-text/40 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-t-card sm:rounded-card border border-border bg-surface p-6 shadow-2xl space-y-5 animate-in slide-in-from-bottom-6">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <div>
                <h4 className="text-base font-bold text-text">Update Progress</h4>
                <p className="text-xs text-muted truncate max-w-[280px]">{task.title}</p>
              </div>
              <button
                type="button"
                onClick={() => setIsUpdateOpen(false)}
                className="p-1 text-subtle hover:text-text text-sm"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-semibold text-text uppercase tracking-wider">
                Select Progress
              </label>
              <div className="grid grid-cols-5 gap-2">
                {[0, 25, 50, 75, 100].map((percent) => (
                  <button
                    key={percent}
                    type="button"
                    onClick={() => setSelectedProgress(percent)}
                    className={`flex items-center justify-center rounded-chip min-h-[44px] text-sm font-bold transition-all ${
                      selectedProgress === percent
                        ? "bg-primary text-white shadow-sm ring-2 ring-primary ring-offset-2"
                        : "bg-neutral text-text hover:bg-neutral/80 border border-border"
                    }`}
                  >
                    {percent}%
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="task-note" className="block text-xs font-semibold text-text uppercase tracking-wider">
                Short Note (optional)
              </label>
              <input
                id="task-note"
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. Design draft ready for client"
                className="w-full rounded-input border border-border bg-surface px-3.5 py-2.5 text-base text-text placeholder:text-subtle focus:border-primary focus:outline-none min-h-[44px]"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsUpdateOpen(false)}
                className="rounded-button border border-border px-4 py-2.5 text-sm font-semibold text-muted hover:bg-neutral min-h-[44px]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveProgress}
                disabled={loading}
                className="rounded-button bg-primary hover:bg-primary-hover text-white px-5 py-2.5 text-sm font-bold min-h-[44px] shadow-sm disabled:opacity-50"
              >
                {loading ? "Saving…" : "Save update"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* B1: STUCK REASON PICKER (6 Big Buttons) */}
      {isStuckModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-text/40 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in">
          <div className="w-full max-w-lg rounded-t-card sm:rounded-card border border-border bg-surface p-6 shadow-2xl space-y-5 animate-in slide-in-from-bottom-6">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <div>
                <h4 className="text-base font-bold text-text">What is keeping you stuck?</h4>
                <p className="text-xs text-muted truncate max-w-[280px]">
                  Select reason so your manager can unblock you
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsStuckModalOpen(false)}
                className="p-1 text-subtle hover:text-text text-sm"
              >
                ✕
              </button>
            </div>

            {/* 6 Big Reason Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {BLOCKER_REASONS.map((r) => {
                const isSelected = selectedBlockerReason === r.value;
                return (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => setSelectedBlockerReason(r.value)}
                    className={`flex items-center gap-3 rounded-button p-3 text-left transition-all min-h-[52px] ${
                      isSelected
                        ? "bg-primary-soft text-primary border-2 border-primary shadow-xs font-bold"
                        : "bg-surface hover:bg-neutral text-text border border-border font-medium"
                    }`}
                  >
                    <span className="text-xl shrink-0">{r.icon}</span>
                    <span className="text-sm leading-snug">{r.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Optional note */}
            <div className="space-y-1.5">
              <label htmlFor="blocker-note" className="block text-xs font-semibold text-text uppercase tracking-wider">
                Note or explanation (optional)
              </label>
              <input
                id="blocker-note"
                type="text"
                value={blockerNote}
                onChange={(e) => setBlockerNote(e.target.value)}
                placeholder="e.g. Waiting for logo files from client"
                className="w-full rounded-input border border-border bg-surface px-3.5 py-2.5 text-base text-text placeholder:text-subtle focus:border-primary focus:outline-none min-h-[44px]"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <button
                type="button"
                onClick={() => setIsStuckModalOpen(false)}
                className="rounded-button border border-border px-4 py-2.5 text-sm font-semibold text-muted hover:bg-neutral min-h-[44px]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmitBlocker}
                disabled={loading}
                className="rounded-button bg-warning/30 hover:bg-warning/40 text-warning-text border border-warning-text/40 px-5 py-2.5 text-sm font-bold min-h-[44px] shadow-sm disabled:opacity-50"
              >
                {loading ? "Saving…" : "Confirm Stuck"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          action={toast.action}
          onClose={() => setToast(null)}
        />
      )}
    </>
  );
}
