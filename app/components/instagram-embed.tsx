"use client";

import { useEffect, useRef } from "react";

declare global {
  interface Window {
    instgrm?: { Embeds: { process: () => void } };
  }
}

const SCRIPT_SRC = "https://www.instagram.com/embed.js";

function loadEmbedScript(): Promise<void> {
  if (window.instgrm) return Promise.resolve();
  const existing = document.querySelector<HTMLScriptElement>(
    `script[src="${SCRIPT_SRC}"]`,
  );
  if (existing) {
    return new Promise((resolve) => existing.addEventListener("load", () => resolve()));
  }
  return new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = SCRIPT_SRC;
    script.async = true;
    script.onload = () => resolve();
    document.body.appendChild(script);
  });
}

/**
 * Renders Instagram's official embeddable post widget, which plays Reels
 * inline instead of linking out to the Instagram app. Uses Meta's public
 * embed.js (the same one blogs/news sites use) — there's no API for pulling
 * the raw video file, and this is the only sanctioned way to get inline
 * playback for a public post.
 */
export default function InstagramEmbed({ url }: { url: string }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    loadEmbedScript().then(() => {
      if (!cancelled) window.instgrm?.Embeds.process();
    });
    return () => {
      cancelled = true;
    };
    // Re-process whenever the embedded URL changes (e.g. switching saves
    // while the modal stays mounted between renders isn't possible here
    // since DetailModal remounts per save via `key`, but this stays correct
    // either way).
  }, [url]);

  return (
    <div ref={containerRef} className="flex justify-center overflow-hidden rounded-lg">
      <blockquote
        className="instagram-media"
        data-instgrm-permalink={url}
        data-instgrm-version="14"
        style={{ margin: 0, width: "100%" }}
      />
    </div>
  );
}
