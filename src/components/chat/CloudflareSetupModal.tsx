"use client";

import React, { useState } from "react";

interface CloudflareSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSendLink: (name: string, url: string, size?: string) => void;
}

export function CloudflareSetupModal({
  isOpen,
  onClose,
  onSendLink,
}: CloudflareSetupModalProps) {
  const [tab, setTab] = useState<"DRIVE_LINK" | "R2_GUIDE">("DRIVE_LINK");
  const [fileName, setFileName] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const [fileSize, setFileSize] = useState("10 GB");

  if (!isOpen) return null;

  const handleSubmitLink = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fileName.trim() || !fileUrl.trim()) {
      alert("Please enter file name and download link.");
      return;
    }
    onSendLink(fileName.trim(), fileUrl.trim(), fileSize.trim());
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-2xl bg-white border border-slate-200 shadow-2xl p-6 text-slate-800 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="text-2xl">☁️</span>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">
                Heavy File Transfer (Up to 10 GB)
              </h3>
              <p className="text-xs text-slate-500">
                Direct Cloudflare R2 Upload & Cloud Link Sharing
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-lg p-1 rounded-lg hover:bg-slate-100"
          >
            ✕
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex gap-2 my-4 p-1 bg-slate-100 rounded-xl">
          <button
            type="button"
            onClick={() => setTab("DRIVE_LINK")}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
              tab === "DRIVE_LINK"
                ? "bg-white text-teal-700 shadow-xs"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            🔗 Instant 10 GB Link (Drive / WeTransfer)
          </button>
          <button
            type="button"
            onClick={() => setTab("R2_GUIDE")}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
              tab === "R2_GUIDE"
                ? "bg-white text-teal-700 shadow-xs"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            ⚡ Cloudflare R2 API Keys
          </button>
        </div>

        {/* Tab 1: Instant Cloud Link */}
        {tab === "DRIVE_LINK" && (
          <form onSubmit={handleSubmitLink} className="space-y-3.5">
            <p className="text-xs text-slate-600">
              Paste a Google Drive, Dropbox, or WeTransfer download link. It will render as a rich file card with a 1-click Download button.
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                File Title / Description
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Master_Project_Video_Render.mp4"
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 focus:bg-white focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Shareable Download URL
                </label>
                <input
                  type="url"
                  required
                  placeholder="https://drive.google.com/file/... or WeTransfer link"
                  value={fileUrl}
                  onChange={(e) => setFileUrl(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 focus:bg-white focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  File Size
                </label>
                <input
                  type="text"
                  placeholder="e.g. 7.5 GB"
                  value={fileSize}
                  onChange={(e) => setFileSize(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 focus:bg-white focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 rounded-xl shadow-xs"
              >
                Send 10 GB File Card ➤
              </button>
            </div>
          </form>
        )}

        {/* Tab 2: Cloudflare R2 Connection Guide */}
        {tab === "R2_GUIDE" && (
          <div className="space-y-3 text-xs text-slate-600">
            <div className="p-3 bg-teal-50 border border-teal-200 rounded-xl text-teal-900">
              <p className="font-bold mb-1">🎉 Cloudflare R2 Code is 100% Ready in APIS!</p>
              <p className="text-[11px] leading-relaxed">
                Cloudflare R2 provides <strong>10 GB monthly storage FREE</strong> with <strong>$0 Egress (Free unlimited downloads)</strong>.
              </p>
            </div>

            <p className="font-bold text-slate-800">Direct drag-and-drop 10 GB file uploads activate as soon as these 3 keys are added in Vercel / .env:</p>

            <ol className="list-decimal pl-4 space-y-1.5 text-[11px]">
              <li>
                Open <strong>dash.cloudflare.com</strong> and go to <strong>R2 Object Storage</strong>.
              </li>
              <li>
                Click <strong>Create Bucket</strong> (name it: <code>apis-uploads</code>).
              </li>
              <li>
                Click <strong>Manage R2 API Tokens</strong> &gt; <strong>Create Token</strong> (Permission: <em>Object Read &amp; Write</em>).
              </li>
              <li>
                Copy the 3 values and paste them in Vercel Settings &gt; Environment Variables:
                <div className="bg-slate-900 text-slate-100 p-2.5 rounded-lg font-mono text-[10px] mt-1.5 space-y-0.5">
                  <p>R2_ACCOUNT_ID=your_cloudflare_account_id</p>
                  <p>R2_ACCESS_KEY_ID=your_access_key_id</p>
                  <p>R2_SECRET_ACCESS_KEY=your_secret_access_key</p>
                  <p>R2_BUCKET_NAME=apis-uploads</p>
                </div>
              </li>
            </ol>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl"
              >
                Got It, Thanks!
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
