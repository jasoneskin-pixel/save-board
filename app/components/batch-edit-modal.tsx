"use client";

import { useState } from "react";

export default function BatchEditModal({
  count,
  onClose,
  onApply,
}: {
  count: number;
  onClose: () => void;
  onApply: (fields: { savedBy?: string; addTags?: string[] }) => Promise<void>;
}) {
  const [savedBy, setSavedBy] = useState("");
  const [addTagsText, setAddTagsText] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addTags = addTagsText
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
  const canApply = (savedBy.trim().length > 0 || addTags.length > 0) && !saving;

  async function handleApply() {
    setSaving(true);
    setError(null);
    try {
      await onApply({
        savedBy: savedBy.trim() || undefined,
        addTags: addTags.length > 0 ? addTags : undefined,
      });
    } catch {
      setError("Failed to update some saves. Please try again.");
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold tracking-tight text-zinc-900">
            Edit {count} save{count === 1 ? "" : "s"}
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-600">
              Set author
            </label>
            <input
              value={savedBy}
              onChange={(e) => setSavedBy(e.target.value)}
              placeholder="Leave blank to keep unchanged"
              className="w-full rounded-lg border border-orange-200 px-3 py-2 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
            />
            <p className="mt-1 text-[11px] text-zinc-400">
              Overwrites the author on every selected save.
            </p>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-600">
              Add tags (comma-separated)
            </label>
            <input
              value={addTagsText}
              onChange={(e) => setAddTagsText(e.target.value)}
              placeholder="e.g. premiere, talent"
              className="w-full rounded-lg border border-orange-200 px-3 py-2 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
            />
            <p className="mt-1 text-[11px] text-zinc-400">
              Added on top of each save&apos;s existing tags — nothing is removed.
            </p>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            onClick={handleApply}
            disabled={!canApply}
            className="w-full rounded-lg bg-gradient-to-r from-orange-500 to-pink-600 px-4 py-2 text-sm font-medium text-white hover:from-orange-600 hover:to-pink-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {saving ? "Applying…" : `Apply to ${count} save${count === 1 ? "" : "s"}`}
          </button>
        </div>
      </div>
    </div>
  );
}
