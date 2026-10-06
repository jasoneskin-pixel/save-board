"use client";

import type { Save } from "@/lib/airtable";

export const PLATFORM_STYLES: Record<string, string> = {
  Instagram: "bg-pink-100 text-pink-700",
  TikTok: "bg-zinc-900 text-white",
  Website: "bg-amber-100 text-amber-800",
};

export default function SaveCard({
  save,
  onOpen,
  selectMode = false,
  checked = false,
  onToggleSelect,
}: {
  save: Save;
  onOpen: () => void;
  selectMode?: boolean;
  checked?: boolean;
  onToggleSelect?: () => void;
}) {
  return (
    <button
      onClick={selectMode ? onToggleSelect : onOpen}
      className={`group relative block w-full overflow-hidden rounded-xl bg-white text-left shadow-sm ring-1 transition hover:shadow-md hover:shadow-orange-200/50 ${
        selectMode && checked
          ? "ring-2 ring-orange-500"
          : "ring-orange-100"
      }`}
    >
      {selectMode && (
        <div
          className={`absolute top-2 left-2 z-10 flex h-6 w-6 items-center justify-center rounded-full border-2 shadow ${
            checked
              ? "border-orange-500 bg-gradient-to-r from-orange-500 to-pink-600 text-white"
              : "border-white bg-white/70 text-transparent"
          }`}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} className="h-3.5 w-3.5">
            <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      )}
      {save.thumbnailUrl ? (
        // Remote thumbnails come from many unpredictable hosts (Airtable CDN,
        // TikTok, arbitrary OG images), so a plain <img> is more robust here
        // than next/image domain config.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={save.thumbnailUrl}
          alt={save.caption ?? "Saved item"}
          className="w-full object-cover"
          loading="lazy"
        />
      ) : (
        <div className="flex aspect-square items-center justify-center bg-zinc-100 text-sm text-zinc-400">
          No thumbnail
        </div>
      )}
      <div className="p-3">
        <div className="mb-1 flex items-center gap-2">
          <span
            className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
              PLATFORM_STYLES[save.platform ?? ""] ?? "bg-zinc-100 text-zinc-600"
            }`}
          >
            {save.platform ?? "Link"}
          </span>
          {save.savedBy && (
            <span className="text-[11px] text-zinc-400">{save.savedBy}</span>
          )}
        </div>
        {save.caption && (
          <p className="line-clamp-2 text-sm text-zinc-700">{save.caption}</p>
        )}
        {save.tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {save.tags.map((t) => (
              <span
                key={t}
                className="rounded bg-orange-50 px-1.5 py-0.5 text-[10px] text-orange-700"
              >
                #{t}
              </span>
            ))}
          </div>
        )}
      </div>
    </button>
  );
}
