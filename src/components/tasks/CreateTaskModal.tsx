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
  const [projectList, setProjectList] = useState<ProjectOption[]>(projects);
  const [showAddProject, setShowAddProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [creatingProject, setCreatingProject] = useState(false);

  const [title, setTitle] = useState("");
  const [projectId, setProjectId] = useState(projects[0]?.id || "");
  const [assignedToId, setAssignedToId] = useState(currentUserId || "");
  const [startDate, setStartDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState<"LOW" | "MEDIUM" | "HIGH" | "CRITICAL">("MEDIUM");
  const [estimatedHours, setEstimatedHours] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    setProjectList(projects);
    if (!projectId && projects.length > 0) {
      setProjectId(projects[0]!.id);
    }
  }, [projects]);

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

  const handleCreateProject = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;
    try {
      setCreatingProject(true);
      const code = `ADP-${new Date().getFullYear()}-${String(projectList.length + 1).padStart(2, "0")}`;
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newProjectName.trim(),
          code,
          status: "IN_PROGRESS",
          priority: "MEDIUM",
        }),
      });
      if (res.ok) {
        const result = await res.json();
        const created = result.data;
        setProjectList((prev) => [created, ...prev]);
        setProjectId(created.id);
        setNewProjectName("");
        setShowAddProject(false);
      } else {
        const errData = await res.json().catch(() => ({}));
        setError(errData.error || "Failed to create project");
      }
    } catch {
      setError("Failed to create project. Please try again.");
    } finally {
      setCreatingProject(false);
    }
  };

  const handlePresetDuration = (preset: "today" | "tomorrow" | "3days" | "1week") => {
    const today = new Date();
    const formatDate = (d: Date) => {
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      return `${yyyy}-${mm}-${dd}`;
    };

    const startStr = formatDate(today);
    setStartDate(startStr);

    if (preset === "today") {
      setDueDate(startStr);
    } else if (preset === "tomorrow") {
      const d = new Date(today);
      d.setDate(d.getDate() + 1);
      setDueDate(formatDate(d));
    } else if (preset === "3days") {
      const d = new Date(today);
      d.setDate(d.getDate() + 3);
      setDueDate(formatDate(d));
    } else if (preset === "1week") {
      const d = new Date(today);
      d.setDate(d.getDate() + 7);
      setDueDate(formatDate(d));
    }
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

      if (startDate) {
        payload.startDate = new Date(`${startDate}T09:00:00Z`).toISOString();
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
      setStartDate("");
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

              {/* Project Selection with inline + New Project */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-text uppercase tracking-wider">
                    Project *
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowAddProject(!showAddProject)}
                    className="text-sm font-extrabold text-teal-700 hover:text-teal-800 bg-teal-50 hover:bg-teal-100/90 px-3 py-1.5 rounded-lg border border-teal-300 transition-all flex items-center gap-1.5 shadow-xs"
                  >
                    <span>{showAddProject ? "✕ Cancel" : "+ New Project"}</span>
                  </button>
                </div>

                {showAddProject && (
                  <div className="mb-2 p-3 rounded-button bg-primary-soft border border-primary-border space-y-2 animate-in fade-in duration-100">
                    <p className="text-xs font-bold text-text">Add New Project Name:</p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newProjectName}
                        onChange={(e) => setNewProjectName(e.target.value)}
                        placeholder="e.g. Edenrobe Summer Campaign"
                        className="flex-1 rounded-input border border-border bg-surface px-3 py-1.5 text-sm text-text placeholder:text-subtle focus:border-primary focus:outline-none"
                      />
                      <button
                        type="button"
                        disabled={creatingProject || !newProjectName.trim()}
                        onClick={handleCreateProject}
                        className="rounded-button bg-primary hover:bg-primary-hover text-white text-xs font-bold px-3 py-1.5 transition-colors disabled:opacity-50"
                      >
                        {creatingProject ? "Adding…" : "Add Project"}
                      </button>
                    </div>
                  </div>
                )}

                {projectList.length === 0 ? (
                  <p className="text-xs text-danger-text bg-danger-soft p-2.5 rounded-button border border-danger-text/20">
                    No active projects found. Click &quot;+ New Project&quot; above to create one.
                  </p>
                ) : (
                  <select
                    required
                    value={projectId || projectList[0]?.id || ""}
                    onChange={(e) => setProjectId(e.target.value)}
                    className="w-full rounded-input border border-border bg-background px-3.5 py-2.5 text-base text-text focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary min-h-[44px]"
                  >
                    {projectList.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} {p.code ? `(${p.code})` : ""}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Assignee Selection (Myself + All Staff Members) */}
              <div>
                <label className="block text-xs font-semibold text-text uppercase tracking-wider mb-1.5">
                  Assign
                </label>
                <select
                  value={assignedToId}
                  onChange={(e) => setAssignedToId(e.target.value)}
                  className="w-full rounded-input border border-border bg-background px-3.5 py-2.5 text-base text-text focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary min-h-[44px]"
                >
                  <option value="">Myself (Self Assigned)</option>
                  {staffList.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} {s.jobTitle ? `— ${s.jobTitle}` : s.department ? `— ${s.department}` : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* Duration (Timeline: From & To) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-text uppercase tracking-wider">
                    Duration (Timeline)
                  </label>
                  <span className="text-[11px] font-semibold text-subtle">From & To Dates</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-subtle uppercase mb-1">
                      From (Start Date)
                    </label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full rounded-input border border-border bg-background px-3.5 py-2.5 text-base text-text focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary min-h-[44px]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-subtle uppercase mb-1">
                      To (Due Date)
                    </label>
                    <input
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="w-full rounded-input border border-border bg-background px-3.5 py-2.5 text-base text-text focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary min-h-[44px]"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5 pt-1">
                  <span className="text-[11px] font-semibold text-subtle self-center mr-1">Presets:</span>
                  <button
                    type="button"
                    onClick={() => handlePresetDuration("today")}
                    className="text-xs px-2.5 py-1 rounded-chip border border-border bg-surface hover:bg-primary-soft hover:text-primary transition-colors font-medium"
                  >
                    Today
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePresetDuration("tomorrow")}
                    className="text-xs px-2.5 py-1 rounded-chip border border-border bg-surface hover:bg-primary-soft hover:text-primary transition-colors font-medium"
                  >
                    Tomorrow
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePresetDuration("3days")}
                    className="text-xs px-2.5 py-1 rounded-chip border border-border bg-surface hover:bg-primary-soft hover:text-primary transition-colors font-medium"
                  >
                    In 3 Days
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePresetDuration("1week")}
                    className="text-xs px-2.5 py-1 rounded-chip border border-border bg-surface hover:bg-primary-soft hover:text-primary transition-colors font-medium"
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
