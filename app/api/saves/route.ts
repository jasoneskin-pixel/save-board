import { requirePin } from "@/lib/auth";
import { listSaves, type Platform } from "@/lib/airtable";

export const dynamic = "force-dynamic";

const PLATFORMS: Platform[] = ["Instagram", "TikTok", "Website"];

/**
 * GET /api/saves — list saves (newest first). Optional server-side filters:
 *   ?platform=Instagram|TikTok|Website  ?search=<text>
 * Tag filtering happens client-side (see the Board component).
 */
export async function GET(request: Request) {
  const denied = await requirePin(request);
  if (denied) return denied;

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") || undefined;

  const platformParam = searchParams.get("platform");
  const platform =
    platformParam && PLATFORMS.includes(platformParam as Platform)
      ? (platformParam as Platform)
      : undefined;

  try {
    const saves = await listSaves({ platform, search });
    return Response.json({ saves });
  } catch (err) {
    console.error("GET /api/saves failed:", err);
    return Response.json({ error: "Failed to list saves." }, { status: 500 });
  }
}
