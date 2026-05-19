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
      "content-disposition": `inline; filename="${result.filename}"`,
      "cache-control": "private, no-cache",
    },
  });
}
