"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Toast } from "@/components/ui/Toast";
import type { StatusRequestKind } from "@/types";

interface AskForUpdateModalProps {
  taskId?: string;
  projectId?: string;
  taskTitle?: string;
  assigneeId?: string | null;
  assigneeName?: string | null;
  availableStaff?: Array<{ id: string; name: string }>;
}

const UPDATE_CHOICES: Array<{ kind: StatusRequestKind; label: string; desc: string }> = [
  { kind: "STATUS", label: "Status update", desc: "Is this on track, stuck, or done?" },
  { kind: "PROGRESS", label: "Progress check", desc: "What percentage is completed?" },
  { kind: "DEADLINE", label: "Deadline outlook", desc: "Will this meet the deadline?" },
  { kind: "BLOCKER", label: "Blocker check", desc: "Are you waiting on anything?" },
];

export function AskForUpdateModal({
  taskId,
  projectId,
  taskTitle,
  assigneeId,
  assigneeName,
  availableStaff = [],
}: AskForUpdateModalProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [targetUserId, setTargetUserId] = useState<string>(assigneeId || (availableStaff[0]?.id ?? ""));
  const [selectedKind, setSelectedKind] = useState<StatusRequestKind>("STATUS");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type?: "success" | "error" } | null>(null);

  async function handleSend() {
    if (!targetUserId) {
      setToast({ message: "Please select who to ask", type: "error" });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/status-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId,
          projectId,
          requestedToId: targetUserId,
          kind: selectedKind,
          message: message || undefined,
        }),
      });

      if (!res.ok) throw new Error();

      setToast({ message: "Update request sent!", type: "success" });
      setOpen(false);
      setMessage("");
      router.refresh();
    } catch {
      setToast({
        message: "Couldn't send request. Check your connection.",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-button bg-surface border border-primary/40 hover:bg-primary-soft text-primary text-xs font-bold px-3 py-1.5 min-h-[36px] transition-colors shrink-0"
      >
        <span>💬</span>
        <span>Ask for update</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-text/40 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-t-card sm:rounded-card border border-border bg-surface p-6 shadow-2xl space-y-5 animate-in slide-in-from-bottom-6">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <div>
                <h4 className="text-base font-bold text-text">Ask for Status Update</h4>
                {taskTitle && (
                  <p className="text-xs text-muted truncate max-w-[280px]">For: {taskTitle}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="p-1 text-subtle hover:text-text text-sm"
              >
                ✕
              </button>
            </div>

            {/* Who: prefilled with assignee */}
            <div className="space-y-1.5">
              <label htmlFor="request-recipient" className="block text-xs font-semibold text-text uppercase tracking-wider">
                Who to ask
              </label>
              {assigneeId && assigneeName ? (
                <div className="rounded-input border border-border bg-neutral/50 px-3.5 py-2.5 text-sm font-bold text-text">
                  {assigneeName} (Assignee)
                </div>
              ) : (
                <select
                  id="request-recipient"
                  value={targetUserId}
                  onChange={(e) => setTargetUserId(e.target.value)}
                  className="w-full rounded-input border border-border bg-surface px-3.5 py-2.5 text-base text-text focus:border-primary focus:outline-none min-h-[44px]"
                >
                  <option value="">Select team member...</option>
                  {availableStaff.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* What: 4 Quick choices */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-text uppercase tracking-wider">
                What are you asking for?
              </label>
              <div className="grid grid-cols-2 gap-2">
                {UPDATE_CHOICES.map((choice) => {
                  const isSelected = selectedKind === choice.kind;
                  return (
                    <button
                      key={choice.kind}
                      type="button"
                      onClick={() => setSelectedKind(choice.kind)}
                      className={`rounded-button p-2.5 text-left text-xs transition-all min-h-[48px] ${
                        isSelected
                          ? "bg-primary-soft text-primary border-2 border-primary font-bold shadow-xs"
                          : "bg-surface hover:bg-neutral text-text border border-border font-medium"
                      }`}
                    >
                      <p className="font-bold leading-tight">{choice.label}</p>
                      <p className="text-[10px] text-muted truncate mt-0.5">{choice.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Optional message */}
            <div className="space-y-1.5">
              <label htmlFor="request-msg" className="block text-xs font-semibold text-text uppercase tracking-wider">
                Message (optional)
              </label>
              <input
                id="request-msg"
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="e.g. Client is asking for revision timeline"
                className="w-full rounded-input border border-border bg-surface px-3.5 py-2.5 text-base text-text placeholder:text-subtle focus:border-primary focus:outline-none min-h-[44px]"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-button border border-border px-4 py-2.5 text-sm font-semibold text-muted hover:bg-neutral min-h-[44px]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSend}
                disabled={loading}
                className="rounded-button bg-primary hover:bg-primary-hover text-white px-5 py-2.5 text-sm font-bold min-h-[44px] shadow-sm disabled:opacity-50"
              >
                {loading ? "Sending…" : "Send Request"}
              </button>
            </div>
          </div>
        </div>
      )}

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
