"use client";

import { useRef, useState } from "react";
import type { Save } from "@/lib/airtable";
import { getTikTokVideoId } from "@/lib/video-embeds";
import InstagramEmbed from "./instagram-embed";
import { PLATFORM_STYLES } from "./save-card";

export default function DetailModal({
  save,
  onClose,
  onUpdated,
  onDeleted,
}: {
  save: Save;
  onClose: () => void;
  onUpdated: (save: Save) => void;
  onDeleted: (id: string) => void;
}) {
  const [notes, setNotes] = useState(save.notes ?? "");
  const [tagsText, setTagsText] = useState(save.tags.join(", "));
  const [manualCaption, setManualCaption] = useState(save.manualCaption ?? "");
  const [savedBy, setSavedBy] = useState(save.savedBy ?? "");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const dirty =
    notes !== (save.notes ?? "") ||
    tagsText !== save.tags.join(", ") ||
    manualCaption !== (save.manualCaption ?? "") ||
    savedBy !== (save.savedBy ?? "");

  async function handleSave() {
    setSaving(true);
    setError(null);
    const tags = tagsText
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    try {
      const res = await fetch(`/api/saves/${save.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        // Only the manual override is written — never the auto "Caption/Title".
        body: JSON.stringify({ notes, tags, manualCaption, savedBy }),
      });
      if (!res.ok) throw new Error();
      const { save: updated } = await res.json();
      onUpdated(updated);
    } catch {
      setError("Failed to save changes.");
    } finally {
      setSaving(false);
    }
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`/api/saves/${save.id}/thumbnail`, {
        method: "POST",
        body: fd,
      });
      if (!res.ok) throw new Error();
      const { save: updated } = await res.json();
      onUpdated(updated);
    } catch {
      setError("Failed to upload thumbnail.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function handleDelete() {
    if (!window.confirm("Delete this save? This can't be undone.")) return;
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/saves/${save.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      onDeleted(save.id);
    } catch {
      setError("Failed to delete.");
      setDeleting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-3">
          <span
            className={`rounded px-2 py-0.5 text-xs font-semibold ${
              PLATFORM_STYLES[save.platform ?? ""] ?? "bg-zinc-100 text-zinc-600"
            }`}
          >
            {save.platform ?? "Link"}
          </span>
          <button
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4 p-5">
          <SaveMedia save={save} />

          {save.caption && (
            <p className="text-sm text-zinc-700">{save.caption}</p>
          )}

          <a
            href={save.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-lg bg-gradient-to-r from-orange-500 to-pink-600 px-3 py-1.5 text-sm font-medium text-white hover:from-orange-600 hover:to-pink-700"
          >
            Open on {save.platform ?? "site"} ↗
          </a>

          <div className="text-xs text-zinc-500">
            {new Date(save.createdTime).toLocaleString()}
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-600">
              Saved by
            </label>
            <input
              value={savedBy}
              onChange={(e) => setSavedBy(e.target.value)}
              className="w-full rounded-lg border border-orange-200 px-3 py-2 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
              placeholder="e.g. JE"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-600">
              Caption{save.platform === "Instagram" && " (handy for Instagram)"}
            </label>
            <textarea
              value={manualCaption}
              onChange={(e) => setManualCaption(e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-orange-200 px-3 py-2 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
              placeholder="Add a caption…"
            />
            <p className="mt-1 text-[11px] text-zinc-400">
              Manual override — shown on the card when no caption is
              auto-fetched. Doesn&apos;t touch the auto-fetched caption.
            </p>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-600">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-orange-200 px-3 py-2 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
              placeholder="Add notes…"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-600">
              Tags (comma-separated)
            </label>
            <input
              value={tagsText}
              onChange={(e) => setTagsText(e.target.value)}
              className="w-full rounded-lg border border-orange-200 px-3 py-2 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
              placeholder="talent, editorial, creators"
            />
          </div>

          <button
            onClick={handleSave}
            disabled={saving || !dirty}
            className="w-full rounded-lg bg-gradient-to-r from-orange-500 to-pink-600 px-4 py-2 text-sm font-medium text-white hover:from-orange-600 hover:to-pink-700 disabled:opacity-40"
          >
            {saving ? "Saving…" : "Save changes"}
          </button>

          <div className="border-t border-zinc-100 pt-4">
            <label className="mb-1 block text-xs font-medium text-zinc-600">
              Manual thumbnail {save.platform === "Instagram" && "(handy for Instagram)"}
            </label>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={handleUpload}
              disabled={uploading}
              className="block w-full text-sm text-zinc-600 file:mr-3 file:rounded-lg file:border-0 file:bg-zinc-100 file:px-3 file:py-1.5 file:text-sm file:font-medium hover:file:bg-zinc-200"
            />
            {uploading && (
              <p className="mt-1 text-xs text-zinc-400">Uploading…</p>
            )}
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="border-t border-zinc-100 pt-4">
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="text-sm font-medium text-red-600 hover:text-red-700 disabled:opacity-40"
            >
              {deleting ? "Deleting…" : "Delete save"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Plays the save inline when the platform supports it, falling back to the
 * thumbnail. The embed only mounts after a tap, rather than eagerly on open:
 * the real thumbnail is a plain <img> that's guaranteed to render, while the
 * third-party TikTok/Instagram embeds are heavier and can end up blank on
 * some mobile browsers (e.g. third-party-storage/autoplay restrictions) —
 * tap-to-play means there's always something visible either way, and it
 * satisfies the "needs a user gesture" rule those embeds rely on for audio.
 */
function SaveMedia({ save }: { save: Save }) {
  const [playing, setPlaying] = useState(false);
  const tikTokVideoId =
    save.platform === "TikTok" ? getTikTokVideoId(save.url) : null;
  const playableInline =
    (save.platform === "TikTok" && !!tikTokVideoId) ||
    save.platform === "Instagram";

  if (playableInline && playing) {
    if (tikTokVideoId) {
      return (
        <iframe
          src={`https://www.tiktok.com/player/v1/${tikTokVideoId}?embed_from=oembed&music_info=1&description=1&autoplay=1`}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; fullscreen; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          className="mx-auto aspect-[9/16] w-full max-w-72 rounded-lg border-0"
          loading="lazy"
        />
      );
    }
    return <InstagramEmbed url={save.url} />;
  }

  if (playableInline) {
    return (
      <button
        onClick={() => setPlaying(true)}
        aria-label="Play video"
        className="relative mx-auto block w-full max-w-72"
      >
        {save.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={save.thumbnailUrl}
            alt={save.caption ?? "Saved item"}
            className="aspect-[9/16] w-full rounded-lg bg-zinc-50 object-contain"
          />
        ) : (
          <div className="flex aspect-[9/16] items-center justify-center rounded-lg bg-zinc-100 text-sm text-zinc-400">
            No thumbnail yet
          </div>
        )}
        <span className="absolute inset-0 flex items-center justify-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-black/60 text-2xl text-white">
            ▶
          </span>
        </span>
      </button>
    );
  }

  if (save.thumbnailUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={save.thumbnailUrl}
        alt={save.caption ?? "Saved item"}
        className="max-h-72 w-full rounded-lg object-contain bg-zinc-50"
      />
    );
  }

  return (
    <div className="flex h-40 items-center justify-center rounded-lg bg-zinc-100 text-sm text-zinc-400">
      No thumbnail yet
    </div>
  );
}
