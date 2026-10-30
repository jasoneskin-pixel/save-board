"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Save } from "@/lib/airtable";
import { isCampaignTag } from "@/lib/campaign-tags";
import SaveCard from "./save-card";
import DetailModal from "./detail-modal";
import BatchEditModal from "./batch-edit-modal";

export default function Board() {
  const [saves, setSaves] = useState<Save[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [author, setAuthor] = useState("");
  const [selected, setSelected] = useState<Save | null>(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [batchEditing, setBatchEditing] = useState(false);

  const loadSaves = useCallback(() => {
    return fetch("/api/saves")
      .then((r) => r.json())
      .then((d) => setSaves(d.saves ?? []))
      .catch(() => setSaves([]));
  }, []);

  // Fetch all saves once, then filter everything (platform, search, tags)
  // in-memory so the tag list is always complete and filtering is instant.
  useEffect(() => {
    loadSaves().finally(() => setLoading(false));
  }, [loadSaves]);

  function refresh() {
    setRefreshing(true);
    loadSaves().finally(() => setRefreshing(false));
  }

  // Every tag in use, sorted, for the filter chips — split into content
  // categories and campaign titles so they display as two visually distinct
  // groups (filtering itself still treats them identically).
  const { contentTags, campaignTags } = useMemo(() => {
    const set = new Set<string>();
    for (const s of saves) for (const t of s.tags) set.add(t);
    const sorted = [...set].sort((a, b) => a.localeCompare(b));
    return {
      contentTags: sorted.filter((t) => !isCampaignTag(t)),
      campaignTags: sorted.filter((t) => isCampaignTag(t)),
    };
  }, [saves]);

  // Every author who has saved something, sorted, for the author filter.
  const allAuthors = useMemo(() => {
    const set = new Set<string>();
    for (const s of saves) if (s.savedBy) set.add(s.savedBy);
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [saves]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return saves.filter((s) => {
      if (author && s.savedBy !== author) return false;
      if (
        selectedTags.length > 0 &&
        // "any" semantics: show a save matching at least one selected tag.
        !selectedTags.some((t) => s.tags.includes(t))
      )
        return false;
      if (term) {
        const haystack = [s.caption, s.notes, s.tags.join(" ")]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(term)) return false;
      }
      return true;
    });
  }, [saves, search, selectedTags, author]);

  function toggleTag(tag: string) {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  }

  function toggleSelectMode() {
    setSelectMode((prev) => !prev);
    setSelectedIds([]);
  }

  function toggleSelected(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function selectAllVisible() {
    setSelectedIds(
      selectedIds.length === filtered.length ? [] : filtered.map((s) => s.id),
    );
  }

  async function applyBatchEdit(fields: { savedBy?: string; addTags?: string[] }) {
    await Promise.all(
      selectedIds.map((id) => {
        const save = saves.find((s) => s.id === id);
        if (!save) return Promise.resolve();
        const body: { savedBy?: string; tags?: string[] } = {};
        if (fields.savedBy !== undefined) body.savedBy = fields.savedBy;
        if (fields.addTags !== undefined)
          body.tags = [...save.tags, ...fields.addTags];
        return fetch(`/api/saves/${id}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        }).then((res) => {
          if (!res.ok) throw new Error();
        });
      }),
    );
    await loadSaves();
    setBatchEditing(false);
    setSelectMode(false);
    setSelectedIds([]);
  }

  function onUpdated(updated: Save) {
    setSaves((list) => list.map((s) => (s.id === updated.id ? updated : s)));
    setSelected(updated);
  }

  function onDeleted(id: string) {
    setSaves((list) => list.filter((s) => s.id !== id));
    setSelected(null);
  }

  return (
    <div className="flex flex-1 flex-col">
      {/* Filter bar */}
      <div className="sticky top-0 z-10 flex flex-col gap-3 border-b border-orange-100 bg-white/90 px-6 py-3 backdrop-blur">
        <div className="flex flex-wrap items-center gap-3">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search notes, captions & tags…"
            className="ml-auto w-64 rounded-lg border border-orange-200 px-3 py-1.5 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
          />

          <button
            onClick={refresh}
            disabled={refreshing}
            aria-label="Refresh"
            title="Refresh"
            className="rounded-lg border border-orange-200 p-1.5 text-orange-500 transition hover:bg-orange-50 hover:text-orange-700 disabled:opacity-50"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
            >
              <path d="M21 12a9 9 0 0 1-9 9 9 9 0 0 1-9-9 9 9 0 0 1 9-9c2.52 0 4.79 1.06 6.4 2.76" />
              <path d="M21 3v6h-6" />
            </svg>
          </button>

          <button
            onClick={toggleSelectMode}
            className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
              selectMode
                ? "border-orange-500 bg-orange-500 text-white"
                : "border-orange-200 text-orange-700 hover:bg-orange-50"
            }`}
          >
            {selectMode ? "Cancel" : "Select"}
          </button>
        </div>

        {/* Selection action bar */}
        {selectMode && (
          <div className="flex flex-wrap items-center gap-3 rounded-lg bg-orange-50 px-3 py-2">
            <span className="text-sm font-medium text-orange-800">
              {selectedIds.length} selected
            </span>
            <button
              onClick={selectAllVisible}
              className="text-xs font-medium text-orange-600 hover:text-orange-800"
            >
              {selectedIds.length === filtered.length ? "Deselect all" : "Select all"}
            </button>
            <button
              onClick={() => setBatchEditing(true)}
              disabled={selectedIds.length === 0}
              className="ml-auto rounded-lg bg-gradient-to-r from-orange-500 to-pink-600 px-3 py-1.5 text-sm font-medium text-white hover:from-orange-600 hover:to-pink-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Edit {selectedIds.length > 0 ? selectedIds.length : ""}
            </button>
          </div>
        )}

        {/* Content-category tag chips */}
        {contentTags.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            {contentTags.map((tag) => {
              const active = selectedTags.includes(tag);
              return (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className={`rounded-full px-2.5 py-1 text-xs font-medium transition ${
                    active
                      ? "bg-gradient-to-r from-orange-500 to-pink-600 text-white"
                      : "bg-orange-50 text-orange-800 hover:bg-orange-100"
                  }`}
                >
                  #{tag}
                </button>
              );
            })}
            {selectedTags.some((t) => contentTags.includes(t)) && (
              <button
                onClick={() =>
                  setSelectedTags((prev) => prev.filter((t) => !contentTags.includes(t)))
                }
                className="ml-1 text-xs font-medium text-zinc-400 hover:text-zinc-700"
              >
                Clear
              </button>
            )}
          </div>
        )}

        {/* Campaign tag chips — kept visually separate from content categories. */}
        {campaignTags.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-violet-400">
              Campaigns
            </span>
            {campaignTags.map((tag) => {
              const active = selectedTags.includes(tag);
              return (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className={`rounded-full px-2.5 py-1 text-xs font-medium transition ${
                    active
                      ? "bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white"
                      : "bg-violet-50 text-violet-800 hover:bg-violet-100"
                  }`}
                >
                  #{tag}
                </button>
              );
            })}
            {selectedTags.some((t) => campaignTags.includes(t)) && (
              <button
                onClick={() =>
                  setSelectedTags((prev) => prev.filter((t) => !campaignTags.includes(t)))
                }
                className="ml-1 text-xs font-medium text-zinc-400 hover:text-zinc-700"
              >
                Clear
              </button>
            )}
          </div>
        )}

        {/* Author chips — a distinct filter axis from tags, so styled separately. */}
        {allAuthors.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-indigo-400">
              By
            </span>
            {allAuthors.map((a) => {
              const active = author === a;
              return (
                <button
                  key={a}
                  onClick={() => setAuthor(active ? "" : a)}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
                    active
                      ? "bg-indigo-900 text-white"
                      : "bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
                  }`}
                >
                  {a}
                </button>
              );
            })}
            {author && (
              <button
                onClick={() => setAuthor("")}
                className="ml-1 text-xs font-medium text-zinc-400 hover:text-zinc-700"
              >
                Clear
              </button>
            )}
          </div>
        )}
      </div>

      {/* Grid */}
      <div className="flex-1 p-6">
        {loading ? (
          <p className="text-center text-sm text-zinc-400">Loading…</p>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-1 py-24 text-center">
            <p className="text-zinc-500">
              {saves.length === 0 ? "No saves yet." : "No saves match those filters."}
            </p>
            <p className="text-sm text-zinc-400">
              {saves.length === 0
                ? "Save a link from the desktop paste page or the iOS Shortcut."
                : "Try clearing a filter."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 items-start gap-4 md:grid-cols-3 lg:grid-cols-4">
            {filtered.map((save) => (
              <SaveCard
                key={save.id}
                save={save}
                onOpen={() => setSelected(save)}
                selectMode={selectMode}
                checked={selectedIds.includes(save.id)}
                onToggleSelect={() => toggleSelected(save.id)}
              />
            ))}
          </div>
        )}
      </div>

      {selected && (
        <DetailModal
          save={selected}
          onClose={() => setSelected(null)}
          onUpdated={onUpdated}
          onDeleted={onDeleted}
        />
      )}

      {batchEditing && (
        <BatchEditModal
          count={selectedIds.length}
          onClose={() => setBatchEditing(false)}
          onApply={applyBatchEdit}
        />
      )}
    </div>
  );
}
