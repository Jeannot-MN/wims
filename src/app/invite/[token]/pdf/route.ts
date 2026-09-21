import { NextResponse } from "next/server";
import { getDataSource } from "@/infrastructure/db/datasource";
import { WeddingInvitePdfRenderer } from "@/infrastructure/pdf/invite-pdf-renderer";
import { PdfService } from "@/application/services/pdf-service";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: { token: string } },
) {
  const ds = await getDataSource();
  const service = new PdfService(ds, new WeddingInvitePdfRenderer());
  const result = await service.renderByToken(params.token);
  if (!result) {
    return new NextResponse("Not found", { status: 404 });
  }
  return new NextResponse(result.buffer as unknown as BodyInit, {
    status: 200,
    headers: {
      "content-type": "application/pdf",
      "content-disposition": contentDisposition(result.filename),
      "cache-control": "private, no-cache",
    },
  });
}

/**
 * `attachment` so the invite saves straight to the guest's downloads instead
 * of opening a preview tab, where the filename tends to be ignored. The plain
 * `filename` is an ASCII-only fallback for old clients; `filename*` (RFC 5987)
 * carries accented guest names intact.
 */
function contentDisposition(filename: string): string {
  const ascii = filename
    // Decompose first so "Lévêque" degrades to "Leveque" rather than "Lvque".
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^\x20-\x7e]/g, "")
    .replace(/["\\]/g, "");
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}
