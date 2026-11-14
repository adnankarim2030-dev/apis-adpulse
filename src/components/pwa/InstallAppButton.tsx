"use client";

import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

export function InstallAppButton({ className = "" }: { className?: string }) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIosHelp, setShowIosHelp] = useState(false);

  useEffect(() => {
    // 1. Register service worker
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch((err) => {
        console.warn("SW registration:", err);
      });
    }

    // 2. Check if already running in standalone mode (installed)
    if (
      typeof window !== "undefined" &&
      (window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as any).standalone === true)
    ) {
      setIsInstalled(true);
    }

    // 3. Detect iOS device
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    // 4. Listen for native browser PWA install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === "accepted") {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    } else if (isIOS) {
      setShowIosHelp(!showIosHelp);
    } else {
      // Fallback manual instructions
      alert(
        "To download / install APIS:\n\n• On Chrome/Edge (Desktop): Click the install icon in your address bar (top-right).\n• On Android: Tap the 3-dots menu -> 'Install app' or 'Add to Home screen'."
      );
    }
  };

  if (isInstalled) {
    return null;
  }

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={handleInstallClick}
        title="Download APIS app to Desktop or Mobile"
        className={`inline-flex items-center gap-1.5 rounded-button bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 px-3 py-1.5 text-xs font-bold transition-all active:scale-[0.98] min-h-[36px] ${className}`}
      >
        <span className="text-sm">📲</span>
        <span>Download App</span>
      </button>

      {showIosHelp && (
        <div className="absolute right-0 top-full mt-2 w-64 p-3 bg-surface border border-border rounded-card shadow-lg z-50 text-xs text-text space-y-1">
          <p className="font-bold">Install on iPhone / iPad:</p>
          <p className="text-muted">
            Tap the <strong>Share</strong> button at bottom, then tap <strong>&ldquo;Add to Home Screen&rdquo;</strong>.
          </p>
          <button
            type="button"
            onClick={() => setShowIosHelp(false)}
            className="text-[10px] text-primary font-bold mt-1"
          >
            Got it ✕
          </button>
        </div>
      )}
    </div>
  );
}
