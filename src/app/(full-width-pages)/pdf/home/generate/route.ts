import { NextResponse } from "next/server";

import { generatePdfBufferFromDefinition, type PdfDocumentDefinition } from "@/lib/documents/Document";

const normalizeText = (value: string | null) => {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const title = normalizeText(url.searchParams.get("title")) ?? "Document test";
  const text = normalizeText(url.searchParams.get("text")) ?? "Hello world";

  const docDefinition: PdfDocumentDefinition = {
    info: {
      title,
      author: "Dashboard Agents",
      subject: "PDF test",
      keywords: "pdf, test",
    },
    pageSize: "A4",
    pageMargins: [48, 56, 48, 56],
    defaultStyle: {
      fontSize: 11,
      lineHeight: 1.3,
    },
    content: [{ text, fontSize: 14 }],
  };

  const buffer = await generatePdfBufferFromDefinition(docDefinition);

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'inline; filename="test.pdf"',
      "Cache-Control": "no-store",
    },
  });
}

