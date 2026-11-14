"use client";

import { useEffect } from "react";
import clsx from "./clsx";

export interface ToastProps {
  message: string;
  type?: "success" | "error" | "info";
  action?: {
    label: string;
    onClick: () => void;
  };
  onClose: () => void;
  durationMs?: number;
}

export function Toast({
  message,
  type = "success",
  action,
  onClose,
  durationMs = 5000,
}: ToastProps) {
  useEffect(() => {
    if (durationMs <= 0) return;
    const timer = setTimeout(() => {
      onClose();
    }, durationMs);
    return () => clearTimeout(timer);
  }, [durationMs, onClose]);

  const typeStyles = {
    success: "bg-surface text-text border-success-text/30 shadow-soft",
    error: "bg-danger text-danger-text border-danger/40 shadow-soft",
    info: "bg-surface text-text border-primary/30 shadow-soft",
  };

  return (
    <div className="fixed bottom-20 md:bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 rounded-card border px-4 py-3 shadow-lg transition-all animate-in fade-in slide-in-from-bottom-4 max-w-sm w-full mx-auto justify-between bg-surface">
      <div className="flex items-center gap-2">
        <span
          className={clsx(
            "h-2 w-2 rounded-full",
            type === "success" && "bg-success-text",
            type === "error" && "bg-danger-text",
            type === "info" && "bg-primary"
          )}
        />
        <span className="text-sm font-medium text-text">{message}</span>
      </div>

      <div className="flex items-center gap-2">
        {action && (
          <button
            onClick={() => {
              action.onClick();
              onClose();
            }}
            className="rounded-button bg-primary-soft text-primary hover:bg-primary-hover hover:text-white px-3 py-1 text-xs font-bold transition-colors min-h-[32px]"
          >
            {action.label}
          </button>
        )}
        <button
          onClick={onClose}
          className="text-subtle hover:text-text p-1 text-xs leading-none"
          aria-label="Close"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
