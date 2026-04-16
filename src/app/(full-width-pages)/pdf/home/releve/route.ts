import { NextResponse } from "next/server";

import { getChef } from "@/lib/documents/layout";
import type { DocumentRelevePayload } from "@/lib/documents/DocumentReleve";
import DocumentReleve from "@/utils/pdf/DocumentReleve";

const normalizeText = (value: string | null) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const qrPayload = normalizeText(url.searchParams.get("qr")) ?? "https://btp.inbtp.net";

  const units = Array.from({ length: 15 }, (_unused, index) => {
    const position = index + 1;
    const moyenne = 7 + ((position * 1.15) % 13); // 7..20
    const statut = moyenne >= 10 ? ("V" as const) : ("NV" as const);
    const credit = 2 + (position % 5); // 2..6

    return {
      semestre: position <= 8 ? "Semestre 1" : "Semestre 2",
      code: `UE${String(position).padStart(2, "0")}`,
      designation: `Unité d'enseignement ${position} - ${position <= 8 ? "Fondamentale" : "Appliquée"}`,
      statut,
      credit,
      moyenne: Number(moyenne.toFixed(2)),
      elements: [],
    };
  });

  const payload: DocumentRelevePayload = {
    studentName: "Godefroid BIMA SANTEY",
    studentVille: "Kinshasa",
    studentDateNaiss: new Date("2002-03-14"),
    studentEmail: "etudiant@inbtp.ac.cd",
    studentPhone: "+243 812 345 678",
    matricule: "BTP.026.001",
    programmeName: "L1-CIB",
    anneeAcad: "2024-2025",
    orderReference: "STG-TEST-0001",
    serialNumber: "INBTP/BTP/RC/026/8456",
    units,
    summary: {
      ncv: 11,
      ncnv: 5,
      totalObtenu: 125.5,
      totalMax: 200,
      pourcentage: 62.75,
      mention: "P",
      decision: "Admis",
    },
    verificationUrl: qrPayload,
  };

  const document = new DocumentReleve(payload);
  document.info({
    title: "Releve de cotes (mock)",
    author: "Dashboard Agents",
    subject: "PDF test",
    keywords: "pdf, test, releve",
  });

  await document.generate(payload.verificationUrl, { nom: getChef(), titre: "Chef de Section" });
  const buffer = await document.generateBuffer();

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'inline; filename="releve-mock.pdf"',
      "Cache-Control": "no-store",
    },
  });
}
