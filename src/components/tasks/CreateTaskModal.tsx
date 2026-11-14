"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Toast } from "@/components/ui/Toast";

interface ProjectOption {
  id: string;
  name: string;
  code?: string;
}

interface StaffOption {
  id: string;
  name: string;
  jobTitle?: string | null;
  department?: string | null;
}

interface CreateTaskModalProps {
  projects: ProjectOption[];
  staffList?: StaffOption[];
  currentUserId?: string;
  buttonLabel?: string;
  className?: string;
}

export function CreateTaskModal({
  projects,
  staffList: initialStaffList,
  currentUserId,
  buttonLabel = "Add Task",
  className = "",
}: CreateTaskModalProps) {
  const router = useRouter();

  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type?: "success" | "error" } | null>(null);

  const [staffList, setStaffList] = useState<StaffOption[]>(initialStaffList || []);
  const [title, setTitle] = useState("");
  const [projectId, setProjectId] = useState(projects[0]?.id || "");
  const [assignedToId, setAssignedToId] = useState(currentUserId || "");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState<"LOW" | "MEDIUM" | "HIGH" | "CRITICAL">("MEDIUM");
  const [estimatedHours, setEstimatedHours] = useState("");
  const [description, setDescription] = useState("");

  // Fetch staff list if not provided
  useEffect(() => {
    if (staffList.length === 0 && isOpen) {
      fetch("/api/staff")
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data.data)) {
            setStaffList(data.data);
          }
        })
        .catch(() => {});
    }
  }, [isOpen, staffList.length]);

  const handleQuickDate = (daysFromNow: number) => {
    const d = new Date();
    d.setDate(d.getDate() + daysFromNow);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    setDueDate(`${yyyy}-${mm}-${dd}`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Please enter a task title");
      return;
    }
    const targetProject = projectId || projects[0]?.id;
    if (!targetProject) {
      setError("Please select a project");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const payload: Record<string, unknown> = {
        title: title.trim(),
        projectId: targetProject,
        priority,
      };

      if (assignedToId) {
        payload.assignedToId = assignedToId;
      }

      if (dueDate) {
        payload.dueDate = new Date(`${dueDate}T17:00:00Z`).toISOString();
      }

      if (estimatedHours) {
        payload.estimatedHours = Number(estimatedHours);
      }

      if (description.trim()) {
        payload.description = description.trim();
      }

      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to create task");
      }

      setIsOpen(false);
      setTitle("");
      setDueDate("");
      setDescription("");
      setEstimatedHours("");
      setAssignedToId(currentUserId || "");
      setToast({ message: "Task added successfully! 🎉", type: "success" });
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Couldn't save task. Please try again.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setError(null);
          if (!projectId && projects.length > 0) {
            setProjectId(projects[0]!.id);
          }
          setIsOpen(true);
        }}
        className={`inline-flex items-center justify-center gap-2 rounded-button bg-primary hover:bg-primary-hover text-white text-sm font-bold px-4 py-2.5 min-h-[44px] shadow-sm transition-all active:scale-[0.98] ${className}`}
      >
        <span className="text-lg leading-none font-bold">+</span>
        <span>{buttonLabel}</span>
      </button>

      {/* Floating Toast */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
          durationMs={4000}
        />
      )}

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-text/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="relative w-full max-w-lg rounded-card border border-border bg-surface p-6 shadow-soft space-y-4 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div>
                <h3 className="text-lg font-bold text-text">Add New Task</h3>
                <p className="text-xs text-muted">Create a task and assign it to yourself or a teammate.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-full p-2 text-muted hover:text-text hover:bg-neutral transition-colors text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {error && (
              <div className="p-3 rounded-button bg-danger-soft border border-danger-text/20 text-danger-text text-xs font-semibold">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Task Title */}
              <div>
                <label className="block text-xs font-semibold text-text uppercase tracking-wider mb-1.5">
                  Task Title *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Design hero banners / Client feedback revisions"
                  className="w-full rounded-input border border-border bg-background px-3.5 py-2.5 text-base text-text placeholder:text-subtle focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary min-h-[44px]"
                />
              </div>

              {/* Project Selection */}
              <div>
                <label className="block text-xs font-semibold text-text uppercase tracking-wider mb-1.5">
                  Project *
                </label>
                {projects.length === 0 ? (
                  <p className="text-xs text-danger-text bg-danger-soft p-2.5 rounded-button border border-danger-text/20">
                    No active projects found.
                  </p>
                ) : (
                  <select
                    required
                    value={projectId || projects[0]?.id || ""}
                    onChange={(e) => setProjectId(e.target.value)}
                    className="w-full rounded-input border border-border bg-background px-3.5 py-2.5 text-base text-text focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary min-h-[44px]"
                  >
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} {p.code ? `(${p.code})` : ""}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Assignee Selection (PM & Staff Task Delegation) */}
              <div>
                <label className="block text-xs font-semibold text-text uppercase tracking-wider mb-1.5">
                  Assign To (Kis ko assign karna hai)
                </label>
                <select
                  value={assignedToId}
                  onChange={(e) => setAssignedToId(e.target.value)}
                  className="w-full rounded-input border border-border bg-background px-3.5 py-2.5 text-base text-text focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary min-h-[44px]"
                >
                  <option value="">Assign to Me (Myself)</option>
                  {staffList.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} {s.jobTitle ? `(${s.jobTitle})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* Due Date & Quick Presets */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-text uppercase tracking-wider">
                  Due Date
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full rounded-input border border-border bg-background px-3.5 py-2.5 text-base text-text focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary min-h-[44px]"
                />
                <div className="flex flex-wrap gap-1.5 pt-1">
                  <button
                    type="button"
                    onClick={() => handleQuickDate(0)}
                    className="text-xs px-2.5 py-1 rounded-chip border border-border bg-surface hover:bg-primary-soft hover:text-primary transition-colors"
                  >
                    Today
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickDate(1)}
                    className="text-xs px-2.5 py-1 rounded-chip border border-border bg-surface hover:bg-primary-soft hover:text-primary transition-colors"
                  >
                    Tomorrow
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickDate(3)}
                    className="text-xs px-2.5 py-1 rounded-chip border border-border bg-surface hover:bg-primary-soft hover:text-primary transition-colors"
                  >
                    In 3 Days
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickDate(7)}
                    className="text-xs px-2.5 py-1 rounded-chip border border-border bg-surface hover:bg-primary-soft hover:text-primary transition-colors"
                  >
                    Next Week
                  </button>
                </div>
              </div>

              {/* Priority Selection */}
              <div>
                <label className="block text-xs font-semibold text-text uppercase tracking-wider mb-1.5">
                  Priority
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "MEDIUM", label: "Normal" },
                    { id: "HIGH", label: "High" },
                    { id: "CRITICAL", label: "Urgent" },
                  ].map((p) => {
                    const isSelected = priority === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setPriority(p.id as typeof priority)}
                        className={`rounded-button border px-3 py-2 text-xs font-bold transition-all min-h-[44px] ${
                          isSelected
                            ? "bg-primary text-white border-primary shadow-xs"
                            : "bg-surface border-border text-muted hover:bg-neutral"
                        }`}
                      >
                        {p.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Estimated Hours & Description */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-text uppercase tracking-wider mb-1.5">
                    Estimated Hours (optional)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={estimatedHours}
                    onChange={(e) => setEstimatedHours(e.target.value)}
                    placeholder="e.g. 4"
                    className="w-full rounded-input border border-border bg-background px-3.5 py-2 text-base text-text focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary min-h-[44px]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text uppercase tracking-wider mb-1.5">
                    Notes (optional)
                  </label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Short description or link"
                    className="w-full rounded-input border border-border bg-background px-3.5 py-2 text-base text-text focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary min-h-[44px]"
                  />
                </div>
              </div>

              {/* Footer Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="rounded-button border border-border bg-surface hover:bg-neutral px-4 py-2.5 text-xs font-semibold text-muted min-h-[44px] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || projects.length === 0}
                  className="rounded-button bg-primary hover:bg-primary-hover text-white px-5 py-2.5 text-xs font-bold min-h-[44px] shadow-sm transition-all active:scale-[0.98] disabled:opacity-50"
                >
                  {loading ? "Creating..." : "Create Task"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
