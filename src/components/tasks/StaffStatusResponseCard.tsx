"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Toast } from "@/components/ui/Toast";
import type { StatusResponseStatus, DeadlineOutlook, BlockerReason } from "@/types";

interface PendingRequest {
  id: string;
  taskId?: string | null;
  taskTitle?: string | null;
  projectName?: string | null;
  requestedByName: string;
  message?: string | null;
}

const BLOCKER_REASONS: Array<{ value: BlockerReason; label: string; icon: string }> = [
  { value: "WAITING_CLIENT", label: "Waiting on client", icon: "👤" },
  { value: "WAITING_APPROVAL", label: "Waiting for approval", icon: "⏳" },
  { value: "WAITING_TEAMMATE", label: "Waiting on teammate", icon: "🤝" },
  { value: "TECHNICAL_ISSUE", label: "Technical issue", icon: "💻" },
  { value: "NEED_INFORMATION", label: "Need information", icon: "❓" },
  { value: "OTHER", label: "Other reason", icon: "💬" },
];

export function StaffStatusResponseCard({ request, staffName }: { request: PendingRequest; staffName: string }) {
  const router = useRouter();
  const firstName = staffName.split(" ")[0];

  const [responseStatus, setResponseStatus] = useState<StatusResponseStatus>("ON_TRACK");
  const [responseProgress, setResponseProgress] = useState<number>(50);
  const [deadlineOutlook, setDeadlineOutlook] = useState<DeadlineOutlook>("WILL_MEET");
  const [blockerReason, setBlockerReason] = useState<BlockerReason>("WAITING_CLIENT");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type?: "success" | "error" } | null>(null);

  async function handleSendResponse() {
    setLoading(true);
    try {
      const res = await fetch(`/api/status-requests/${request.id}/respond`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          responseStatus,
          responseProgress,
          deadlineOutlook,
          responseNote: note || undefined,
          blockerReason: responseStatus === "STUCK" ? blockerReason : undefined,
        }),
      });

      if (!res.ok) throw new Error();

      setToast({ message: "Update sent to CEO!", type: "success" });
      router.refresh();
    } catch {
      setToast({ message: "Couldn't send update. Please try again.", type: "error" });
    } finally {
      setLoading(false);
    }
  }

  const statusOptions: Array<{ value: StatusResponseStatus; label: string; icon: string }> = [
    { value: "ON_TRACK", label: "On track", icon: "🟢" },
    { value: "SLIGHTLY_LATE", label: "Slightly late", icon: "🟡" },
    { value: "STUCK", label: "Stuck", icon: "🔴" },
    { value: "DONE", label: "Done", icon: "✅" },
  ];

  const deadlineOptions: Array<{ value: DeadlineOutlook; label: string }> = [
    { value: "WILL_MEET", label: "Will meet" },
    { value: "MAY_NEED_EXTENSION", label: "May need extension" },
    { value: "CANNOT_MEET", label: "Can't meet" },
  ];

  return (
    <>
      <div className="rounded-card border-2 border-primary/40 bg-primary-soft/40 p-5 shadow-soft space-y-5 animate-in fade-in">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <span className="inline-flex items-center gap-1.5 rounded-chip bg-primary text-white text-[11px] font-bold px-2.5 py-0.5">
              <span>⚡ Update Requested</span>
            </span>
            <h3 className="text-base md:text-lg font-bold text-text leading-tight">
              {firstName}, the CEO asked for an update on{" "}
              <span className="text-primary underline">{request.taskTitle || request.projectName || "your task"}</span>
            </h3>
            {request.message && (
              <p className="text-xs text-muted italic bg-surface/70 border border-border p-2 rounded-button">
                &ldquo;{request.message}&rdquo;
              </p>
            )}
          </div>
        </div>

        {/* 1. 4 Big Status Buttons */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-text uppercase tracking-wider">
            Current Status
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {statusOptions.map((opt) => {
              const isSelected = responseStatus === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setResponseStatus(opt.value)}
                  className={`flex items-center justify-center gap-2 rounded-button p-3 text-sm font-bold transition-all min-h-[48px] ${
                    isSelected
                      ? "bg-primary text-white shadow-xs ring-2 ring-primary"
                      : "bg-surface text-text hover:bg-neutral border border-border"
                  }`}
                >
                  <span>{opt.icon}</span>
                  <span>{opt.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* If Stuck is chosen: Reuse Blocker Reason Picker */}
        {responseStatus === "STUCK" && (
          <div className="rounded-card bg-surface border border-warning-text/30 p-4 space-y-3 animate-in fade-in">
            <label className="block text-xs font-bold text-warning-text uppercase tracking-wider">
              Why are you stuck?
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {BLOCKER_REASONS.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => setBlockerReason(r.value)}
                  className={`flex items-center gap-2 rounded-button p-2.5 text-xs text-left min-h-[44px] transition-all ${
                    blockerReason === r.value
                      ? "bg-warning/20 border-2 border-warning-text text-warning-text font-bold"
                      : "bg-surface hover:bg-neutral text-text border border-border font-medium"
                  }`}
                >
                  <span>{r.icon}</span>
                  <span>{r.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 2. Progress Chips (0, 25, 50, 75, 100%) */}
        {responseStatus !== "DONE" && (
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-text uppercase tracking-wider">
              Estimated Progress
            </label>
            <div className="grid grid-cols-5 gap-2">
              {[0, 25, 50, 75, 100].map((percent) => (
                <button
                  key={percent}
                  type="button"
                  onClick={() => setResponseProgress(percent)}
                  className={`flex items-center justify-center rounded-chip min-h-[44px] text-xs font-bold transition-all ${
                    responseProgress === percent
                      ? "bg-primary text-white shadow-xs"
                      : "bg-surface text-text hover:bg-neutral border border-border"
                  }`}
                >
                  {percent}%
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 3. Deadline Choice */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-text uppercase tracking-wider">
            Deadline Outlook
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {deadlineOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setDeadlineOutlook(opt.value)}
                className={`flex items-center justify-center rounded-button p-2.5 text-xs font-bold transition-all min-h-[44px] ${
                  deadlineOutlook === opt.value
                    ? "bg-primary text-white shadow-xs"
                    : "bg-surface text-text hover:bg-neutral border border-border"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* 4. Optional One-Line Note */}
        <div className="space-y-1.5">
          <label htmlFor="resp-note" className="block text-xs font-semibold text-text uppercase tracking-wider">
            Short Note (optional)
          </label>
          <input
            id="resp-note"
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. Logo files received, final review in progress"
            className="w-full rounded-input border border-border bg-surface px-3.5 py-2.5 text-base text-text placeholder:text-subtle focus:border-primary focus:outline-none min-h-[44px]"
          />
        </div>

        {/* Single Send Button */}
        <div className="flex justify-end pt-2 border-t border-border/60">
          <button
            type="button"
            onClick={handleSendResponse}
            disabled={loading}
            className="w-full sm:w-auto rounded-button bg-primary hover:bg-primary-hover text-white text-sm font-bold px-6 py-3 min-h-[48px] shadow-sm transition-all active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? "Sending update…" : "Send Update to CEO"}
          </button>
        </div>
      </div>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </>
  );
}
