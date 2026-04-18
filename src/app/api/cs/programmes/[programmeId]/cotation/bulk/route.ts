import { NextResponse } from "next/server";

import { saveCsBulkRattrapageRows, type CsBulkRattrapageRow } from "@/lib/utils/supabase/cs-archive";

type RouteParams = {
  programmeId?: string;
};

export async function POST(
  request: Request,
  { params }: { params: Promise<RouteParams> },
) {
  const { programmeId } = await params;
  if (!programmeId) {
    return NextResponse.json({ error: "programme_required" }, { status: 400 });
  }

  let anneeId = "";
  let rowsRaw: unknown = [];
  try {
    const body = (await request.json()) as { anneeId?: unknown; rows?: unknown };
    anneeId = typeof body.anneeId === "string" ? body.anneeId : "";
    rowsRaw = body.rows ?? [];
  } catch {
    return NextResponse.json({ error: "invalid_bulk_payload" }, { status: 400 });
  }

  if (!anneeId) {
    return NextResponse.json({ error: "annee_required" }, { status: 400 });
  }
  if (!Array.isArray(rowsRaw)) {
    return NextResponse.json({ error: "invalid_bulk_payload" }, { status: 400 });
  }

  const rows: CsBulkRattrapageRow[] = rowsRaw.map((raw) => {
    const input = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
    const notes = Array.isArray(input.notes) ? input.notes : [];

    return {
      mail: typeof input.mail === "string" ? input.mail : "",
      notes: notes
        .map((item) => (item && typeof item === "object" ? (item as Record<string, unknown>) : null))
        .filter((item): item is Record<string, unknown> => Boolean(item))
        .map((item) => ({
          matiere_id: typeof item.matiere_id === "string" ? item.matiere_id : "",
          rattrapage: typeof item.rattrapage === "number" ? item.rattrapage : Number(item.rattrapage),
        }))
        .filter((item) => item.matiere_id.length > 0 && Number.isFinite(item.rattrapage)),
    };
  });

  try {
    const report = await saveCsBulkRattrapageRows(anneeId, programmeId, rows);
    return NextResponse.json(report);
  } catch (error) {
    const rawMessage = error instanceof Error ? error.message : "bulk_import_failed";
    const lowered = rawMessage.toLowerCase();
    const isGatewayHtml =
      rawMessage.includes("<!DOCTYPE html>") ||
      rawMessage.includes("Cloudflare") ||
      lowered.includes("bad gateway") ||
      lowered.includes("error code 502");

    return NextResponse.json(
      {
        error: isGatewayHtml ? "upstream_bad_gateway" : rawMessage,
      },
      { status: isGatewayHtml ? 502 : 500 },
    );
  }
}
