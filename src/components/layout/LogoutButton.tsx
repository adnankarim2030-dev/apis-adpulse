"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      onClick={handleLogout}
      disabled={loading}
      className="text-sm font-semibold text-muted hover:text-danger-text transition-colors disabled:opacity-50 min-h-[44px] px-2 flex items-center"
    >
      {loading ? "Signing out…" : "Sign out"}
    </button>
  );
}
