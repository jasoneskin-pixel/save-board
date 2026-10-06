"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const SAVED_BY_KEY = "sb_saved_by";

function isHttpUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export default function AddForm() {
  const [url, setUrl] = useState("");
  const [tagsText, setTagsText] = useState("");
  const [savedBy, setSavedBy] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [error, setError] = useState<string | null>(null);

  // Remember the person's name so they don't retype it every time. Reading
  // localStorage must happen after mount (it's undefined during SSR), so a
  // one-time setState in an effect is the right tool despite the lint rule.
  useEffect(() => {
    const stored = localStorage.getItem(SAVED_BY_KEY);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (stored) setSavedBy(stored);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("saving");
    setError(null);
    const tags = tagsText
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    try {
      const res = await fetch("/api/save", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          url: url.trim(),
          tags,
          savedBy: savedBy.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Failed to save.");
      }
      if (savedBy.trim()) localStorage.setItem(SAVED_BY_KEY, savedBy.trim());
      setStatus("saved");
      setUrl("");
      setTagsText("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save.");
      setStatus("idle");
    }
  }

  const canSave = isHttpUrl(url.trim()) && status !== "saving";

  return (
    <div className="mx-auto w-full max-w-lg">
      <h2 className="mb-1 text-xl font-semibold tracking-tight text-zinc-900">
        Save a link
      </h2>
      <p className="mb-6 text-sm text-zinc-500">
        Paste an Instagram, TikTok, or website URL. We&apos;ll fetch the title
        and thumbnail automatically where possible.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700">
            Link
          </label>
          <input
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              if (status === "saved") setStatus("idle");
            }}
            autoFocus
            placeholder="https://…"
            className="w-full rounded-lg border border-orange-200 px-3 py-2 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700">
            Tags (comma-separated)
          </label>
          <input
            value={tagsText}
            onChange={(e) => setTagsText(e.target.value)}
            placeholder="talent, editorial, creators"
            className="w-full rounded-lg border border-orange-200 px-3 py-2 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700">
            Your name
          </label>
          <input
            value={savedBy}
            onChange={(e) => setSavedBy(e.target.value)}
            placeholder="e.g. JE"
            className="w-full rounded-lg border border-orange-200 px-3 py-2 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
          />
        </div>

        <button
          type="submit"
          disabled={!canSave}
          className="w-full rounded-lg bg-gradient-to-r from-orange-500 to-pink-600 px-4 py-2.5 text-sm font-medium text-white hover:from-orange-600 hover:to-pink-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {status === "saving" ? "Saving…" : "Save"}
        </button>

        {error && <p className="text-sm text-red-600">{error}</p>}

        {status === "saved" && (
          <div className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Saved!{" "}
            <Link href="/" className="font-medium underline">
              View on the board
            </Link>{" "}
            or paste another link above.
          </div>
        )}
      </form>
    </div>
  );
}
