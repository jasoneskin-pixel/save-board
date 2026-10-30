import { requirePin } from "@/lib/auth";
import { listTagsWithCounts } from "@/lib/airtable";

export const dynamic = "force-dynamic";

/** GET /api/tags — every tag in use, with how many saves reference it. */
export async function GET(request: Request) {
  const denied = await requirePin(request);
  if (denied) return denied;

  try {
    const tags = await listTagsWithCounts();
    return Response.json({ tags });
  } catch (err) {
    console.error("GET /api/tags failed:", err);
    return Response.json({ error: "Failed to list tags." }, { status: 500 });
  }
}
