import { requirePin } from "@/lib/auth";
import { uploadManualThumbnail } from "@/lib/airtable";

export const dynamic = "force-dynamic";

const MAX_BYTES = 5 * 1024 * 1024; // Airtable base64 uploadAttachment limit.

/**
 * POST /api/saves/:id/thumbnail — upload a manual thumbnail image.
 * Accepts multipart/form-data with a `file` field.
 */
export async function POST(
  request: Request,
  ctx: RouteContext<"/api/saves/[id]">,
) {
  const denied = await requirePin(request);
  if (denied) return denied;

  const { id } = await ctx.params;

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return Response.json(
      { error: "Expected multipart/form-data." },
      { status: 400 },
    );
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return Response.json({ error: "Missing `file`." }, { status: 400 });
  }
  if (file.size === 0) {
    return Response.json({ error: "File is empty." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return Response.json(
      { error: "File too large (max 5 MB)." },
      { status: 400 },
    );
  }

  try {
    const base64 = Buffer.from(await file.arrayBuffer()).toString("base64");
    const save = await uploadManualThumbnail(id, {
      filename: file.name || "thumbnail",
      contentType: file.type || "application/octet-stream",
      base64,
    });
    return Response.json({ save });
  } catch (err) {
    console.error(`POST /api/saves/${id}/thumbnail failed:`, err);
    return Response.json(
      { error: "Failed to upload thumbnail." },
      { status: 500 },
    );
  }
}
