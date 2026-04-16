import { NextResponse } from "next/server";

import type { Note } from "@/utils/pdf/Document";
import DocumentBulletin from "@/utils/pdf/DocumentBulletin";

const normalizeText = (value: string | null) => {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const data: Note[] = [
  {
    code: "MAT101",
    unite: "Mathématiques Générales",
    credit: 6,
    moyenne: 12.8,
    elements: [
      { designation: "Algèbre", cc: 14, examen: 12, rattrage: 0, credit: 3 },
      { designation: "Analyse", cc: 13, examen: 11, rattrage: 0, credit: 3 }
    ]
  },
  {
    code: "PHY101",
    unite: "Physique",
    credit: 5,
    moyenne: 11.4,
    elements: [
      { designation: "Mécanique", cc: 10, examen: 12, rattrage: 0, credit: 2 },
      { designation: "Électricité", cc: 12, examen: 11, rattrage: 0, credit: 2 },
      { designation: "Optique", cc: 13, examen: 10, rattrage: 0, credit: 1 }
    ]
  },
  {
    code: "INF101",
    unite: "Informatique",
    credit: 4,
    moyenne: 14.2,
    elements: [
      { designation: "Programmation", cc: 15, examen: 14, rattrage: 0, credit: 2 },
      { designation: "Algorithmique", cc: 14, examen: 13, rattrage: 0, credit: 2 }
    ]
  },
  {
    code: "CHM101",
    unite: "Chimie",
    credit: 4,
    moyenne: 10.5,
    elements: [
      { designation: "Chimie Générale", cc: 11, examen: 10, rattrage: 0, credit: 2 },
      { designation: "Chimie Organique", cc: 9, examen: 10, rattrage: 12, credit: 2 }
    ]
  },
  {
    code: "MEC201",
    unite: "Mécanique Appliquée",
    credit: 5,
    moyenne: 13.1,
    elements: [
      { designation: "Résistance des matériaux", cc: 13, examen: 14, rattrage: 0, credit: 2 },
      { designation: "Cinématique", cc: 12, examen: 13, rattrage: 0, credit: 2 },
      { designation: "Dynamique", cc: 14, examen: 12, rattrage: 0, credit: 1 }
    ]
  },
  {
    code: "TOP201",
    unite: "Topographie",
    credit: 3,
    moyenne: 12.0,
    elements: [
      { designation: "Levés topographiques", cc: 12, examen: 11, rattrage: 0, credit: 1 },
      { designation: "Cartographie", cc: 13, examen: 12, rattrage: 0, credit: 2 }
    ]
  },
  {
    code: "HYD201",
    unite: "Hydraulique",
    credit: 4,
    moyenne: 9.8,
    elements: [
      { designation: "Hydrostatique", cc: 10, examen: 9, rattrage: 11, credit: 2 },
      { designation: "Hydrodynamique", cc: 9, examen: 10, rattrage: 12, credit: 2 }
    ]
  },
  {
    code: "ELE201",
    unite: "Électricité Appliquée",
    credit: 3,
    moyenne: 13.7,
    elements: [
      { designation: "Circuits électriques", cc: 14, examen: 13, rattrage: 0, credit: 2 },
      { designation: "Machines électriques", cc: 13, examen: 14, rattrage: 0, credit: 1 }
    ]
  },
  {
    code: "CST301",
    unite: "Construction",
    credit: 5,
    moyenne: 11.9,
    elements: [
      { designation: "Matériaux de construction", cc: 12, examen: 11, rattrage: 0, credit: 2 },
      { designation: "Techniques de construction", cc: 11, examen: 12, rattrage: 0, credit: 2 },
      { designation: "Dessin technique", cc: 13, examen: 11, rattrage: 0, credit: 1 }
    ]
  },
  {
    code: "GPR301",
    unite: "Gestion de Projet",
    credit: 3,
    moyenne: 14.5,
    elements: [
      { designation: "Planification", cc: 15, examen: 14, rattrage: 0, credit: 1 },
      { designation: "Management", cc: 14, examen: 15, rattrage: 0, credit: 1 },
      { designation: "Économie", cc: 13, examen: 14, rattrage: 0, credit: 1 }
    ]
  }
];

export async function GET(request: Request) {
  const url = new URL(request.url);
  const title = normalizeText(url.searchParams.get("title")) ?? "Document test";

  const bulletin = new DocumentBulletin({ notes: data });
  bulletin.info({
    title,
    author: "Dashboard Agents",
    subject: "PDF test",
    keywords: "pdf, test",
  })

  await bulletin.generate("https://btp.inbtp.net");
  // await bulletin.background();
  const buffer = await bulletin.generateBuffer()

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'inline; filename="test.pdf"',
      "Cache-Control": "no-store",
    },
  });
}
