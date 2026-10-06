"use client";

import { useState } from "react";

export default function ShareButton() {
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    const url = window.location.origin;
    if (navigator.share) {
      try {
        await navigator.share({ title: "Social Ideas", url });
      } catch {
        // User dismissed the share sheet — nothing to do.
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copy this link to share:", url);
    }
  }

  return (
    <button
      onClick={handleShare}
      className="rounded-lg px-3 py-1.5 text-sm font-medium text-orange-100/80 transition-colors hover:bg-white/10 hover:text-white"
    >
      {copied ? "Link copied!" : "Share"}
    </button>
  );
}
