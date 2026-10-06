import { requirePin } from "@/lib/auth";
import { deleteSave, updateSave } from "@/lib/airtable";

export const dynamic = "force-dynamic";

/**
 * PATCH /api/saves/:id — edit a save's notes, tags, caption, or author.
 * Body: { notes?, tags?, caption?, manualCaption?, savedBy? }
 * (Manual thumbnail upload is handled by /api/saves/:id/thumbnail.)
 */
export async function PATCH(
  request: Request,
  ctx: RouteContext<"/api/saves/[id]">,
) {
  const denied = await requirePin(request);
  if (denied) return denied;

  const { id } = await ctx.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { notes, tags, caption, manualCaption, savedBy } = (body ?? {}) as {
    notes?: string | null;
    tags?: string[];
    caption?: string | null;
    manualCaption?: string | null;
    savedBy?: string | null;
  };

  if (tags !== undefined && !Array.isArray(tags)) {
    return Response.json(
      { error: "`tags` must be an array of strings." },
      { status: 400 },
    );
  }

  try {
    const save = await updateSave(id, {
      notes,
      tags,
      caption,
      manualCaption,
      savedBy,
    });
    return Response.json({ save });
  } catch (err) {
    console.error(`PATCH /api/saves/${id} failed:`, err);
    return Response.json({ error: "Failed to update save." }, { status: 500 });
  }
}

/** DELETE /api/saves/:id — delete a save. */
export async function DELETE(
  request: Request,
  ctx: RouteContext<"/api/saves/[id]">,
) {
  const denied = await requirePin(request);
  if (denied) return denied;

  const { id } = await ctx.params;

  try {
    await deleteSave(id);
    return Response.json({ ok: true });
  } catch (err) {
    console.error(`DELETE /api/saves/${id} failed:`, err);
    return Response.json({ error: "Failed to delete save." }, { status: 500 });
  }
}
