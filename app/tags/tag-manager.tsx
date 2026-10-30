"use client";

import { useEffect, useState } from "react";

type TagCount = { name: string; count: number };

export default function TagManager() {
  const [tags, setTags] = useState<TagCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function load() {
    setLoading(true);
    setError(null);
    return fetch("/api/tags")
      .then((r) => r.json())
      .then((d) => setTags(d.tags ?? []))
      .catch(() => setError("Failed to load tags."))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="mx-auto w-full max-w-2xl">
      <h2 className="mb-1 text-xl font-semibold tracking-tight text-zinc-900">
        Manage tags
      </h2>
      <p className="mb-6 text-sm text-zinc-500">
        Rename a tag, merge it into another, or delete it — changes apply to
        every save that has it.
      </p>

      {loading ? (
        <p className="text-sm text-zinc-400">Loading…</p>
      ) : error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : tags.length === 0 ? (
        <p className="text-sm text-zinc-400">No tags yet.</p>
      ) : (
        <div className="space-y-2">
          {tags.map((tag) => (
            <TagRow
              key={tag.name}
              tag={tag}
              otherTagNames={tags
                .map((t) => t.name)
                .filter((n) => n !== tag.name)}
              onChanged={load}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function TagRow({
  tag,
  otherTagNames,
  onChanged,
}: {
  tag: TagCount;
  otherTagNames: string[];
  onChanged: () => void;
}) {
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(tag.name);
  const [mergeTarget, setMergeTarget] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const countLabel = `${tag.count} save${tag.count === 1 ? "" : "s"}`;

  async function rename(newName: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/tags/${encodeURIComponent(tag.name)}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ newName }),
      });
      if (!res.ok) throw new Error();
      onChanged();
    } catch {
      setError("Failed to update. Try again.");
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (
      !window.confirm(
        `Delete "#${tag.name}"? It will be removed from all ${countLabel} that have it. This can't be undone.`,
      )
    )
      return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/tags/${encodeURIComponent(tag.name)}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error();
      onChanged();
    } catch {
      setError("Failed to delete. Try again.");
      setBusy(false);
    }
  }

  function handleRenameSubmit() {
    const trimmed = renameValue.trim();
    if (!trimmed || trimmed.toLowerCase() === tag.name) {
      setRenaming(false);
      return;
    }
    rename(trimmed);
  }

  function handleMergeSelect(target: string) {
    if (!target) return;
    const ok = window.confirm(
      `Merge "#${tag.name}" into "#${target}"? All ${countLabel} tagged "#${tag.name}" will be retagged "#${target}", and "#${tag.name}" will disappear. This can't be undone.`,
    );
    setMergeTarget("");
    if (ok) rename(target);
  }

  return (
    <div className="rounded-lg border border-orange-100 bg-white px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {renaming ? (
            <input
              autoFocus
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleRenameSubmit();
                if (e.key === "Escape") setRenaming(false);
              }}
              className="rounded-lg border border-orange-200 px-2 py-1 text-sm outline-none focus:border-orange-500"
            />
          ) : (
            <span className="font-medium text-zinc-900">#{tag.name}</span>
          )}
          <span className="text-xs text-zinc-400">{countLabel}</span>
        </div>

        <div className="flex items-center gap-2">
          {renaming ? (
            <>
              <button
                onClick={handleRenameSubmit}
                disabled={busy}
                className="rounded-lg bg-gradient-to-r from-orange-500 to-pink-600 px-2.5 py-1 text-xs font-medium text-white disabled:opacity-40"
              >
                Save
              </button>
              <button
                onClick={() => setRenaming(false)}
                disabled={busy}
                className="text-xs font-medium text-zinc-400 hover:text-zinc-700"
              >
                Cancel
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => {
                  setRenameValue(tag.name);
                  setRenaming(true);
                }}
                disabled={busy}
                className="rounded-lg border border-orange-200 px-2.5 py-1 text-xs font-medium text-orange-700 hover:bg-orange-50 disabled:opacity-40"
              >
                Rename
              </button>

              {otherTagNames.length > 0 && (
                <select
                  value={mergeTarget}
                  onChange={(e) => handleMergeSelect(e.target.value)}
                  disabled={busy}
                  className="rounded-lg border border-violet-200 bg-white px-2 py-1 text-xs text-violet-700 outline-none disabled:opacity-40"
                >
                  <option value="">Merge into…</option>
                  {otherTagNames.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              )}

              <button
                onClick={handleDelete}
                disabled={busy}
                className="text-xs font-medium text-red-600 hover:text-red-700 disabled:opacity-40"
              >
                Delete
              </button>
            </>
          )}
        </div>
      </div>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
