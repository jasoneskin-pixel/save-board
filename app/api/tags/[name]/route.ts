import { requirePin } from "@/lib/auth";
import { deleteTag, renameTag } from "@/lib/airtable";

export const dynamic = "force-dynamic";

/**
 * PATCH /api/tags/:name — rename a tag across every save that has it.
 * Body: { newName: string }
 * Renaming to a tag that already exists merges the two (this is also how
 * "merge tag A into tag B" from the UI is implemented).
 */
export async function PATCH(
  request: Request,
  ctx: RouteContext<"/api/tags/[name]">,
) {
  const denied = await requirePin(request);
  if (denied) return denied;

  const { name } = await ctx.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { newName } = (body ?? {}) as { newName?: string };
  if (!newName || typeof newName !== "string" || !newName.trim()) {
    return Response.json(
      { error: "`newName` is required." },
      { status: 400 },
    );
  }

  try {
    const result = await renameTag(name, newName);
    return Response.json(result);
  } catch (err) {
    console.error(`PATCH /api/tags/${name} failed:`, err);
    return Response.json({ error: "Failed to rename tag." }, { status: 500 });
  }
}

/** DELETE /api/tags/:name — remove a tag from every save that has it. */
export async function DELETE(
  request: Request,
  ctx: RouteContext<"/api/tags/[name]">,
) {
  const denied = await requirePin(request);
  if (denied) return denied;

  const { name } = await ctx.params;

  try {
    const result = await deleteTag(name);
    return Response.json(result);
  } catch (err) {
    console.error(`DELETE /api/tags/${name} failed:`, err);
    return Response.json({ error: "Failed to delete tag." }, { status: 500 });
  }
}
