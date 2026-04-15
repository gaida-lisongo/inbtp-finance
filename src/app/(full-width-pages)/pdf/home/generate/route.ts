import { NextResponse } from "next/server";

import { generatePdfBufferFromDefinition, type PdfDocumentDefinition } from "@/lib/documents/Document";
import Document from "@/utils/pdf/Document";

const normalizeText = (value: string | null) => {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

interface Note {
  unite: string,
  credit: number,
  moyenne: number,
  elements: {
    designation: string,
    cc: number,
    examen: number,
    rattrage: number,
    credit: number
  }[]
}

const data: Note[] = [
  {
    unite: "Mathématiques Générales",
    credit: 6,
    moyenne: 12.8,
    elements: [
      { designation: "Algèbre", cc: 14, examen: 12, rattrage: 0, credit: 3 },
      { designation: "Analyse", cc: 13, examen: 11, rattrage: 0, credit: 3 }
    ]
  },
  {
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
    unite: "Informatique",
    credit: 4,
    moyenne: 14.2,
    elements: [
      { designation: "Programmation", cc: 15, examen: 14, rattrage: 0, credit: 2 },
      { designation: "Algorithmique", cc: 14, examen: 13, rattrage: 0, credit: 2 }
    ]
  },
  {
    unite: "Chimie",
    credit: 4,
    moyenne: 10.5,
    elements: [
      { designation: "Chimie Générale", cc: 11, examen: 10, rattrage: 0, credit: 2 },
      { designation: "Chimie Organique", cc: 9, examen: 10, rattrage: 12, credit: 2 }
    ]
  },
  {
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
    unite: "Topographie",
    credit: 3,
    moyenne: 12.0,
    elements: [
      { designation: "Levés topographiques", cc: 12, examen: 11, rattrage: 0, credit: 1 },
      { designation: "Cartographie", cc: 13, examen: 12, rattrage: 0, credit: 2 }
    ]
  },
  {
    unite: "Hydraulique",
    credit: 4,
    moyenne: 9.8,
    elements: [
      { designation: "Hydrostatique", cc: 10, examen: 9, rattrage: 11, credit: 2 },
      { designation: "Hydrodynamique", cc: 9, examen: 10, rattrage: 12, credit: 2 }
    ]
  },
  {
    unite: "Électricité Appliquée",
    credit: 3,
    moyenne: 13.7,
    elements: [
      { designation: "Circuits électriques", cc: 14, examen: 13, rattrage: 0, credit: 2 },
      { designation: "Machines électriques", cc: 13, examen: 14, rattrage: 0, credit: 1 }
    ]
  },
  {
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
  const text = normalizeText(url.searchParams.get("text")) ?? "Hello world";
  const testFocument = new Document();
  testFocument.info({
    title,
    author: "Dashboard Agents",
    subject: "PDF test",
    keywords: "pdf, test",
  })

  const items = data.flatMap((u: Note) =>{
    const moyenne = [
      {text: `${u.unite}`, style: 'tabUnite', color: u.moyenne < 10 ? testFocument.chart.secondary : testFocument.chart.black, colSpan: 4}, 
      '',
      '',
      '',
      {text: `${u.credit}`, style: 'tabUnite', color: u.moyenne < 10 ? testFocument.chart.secondary : testFocument.chart.black,},
      {text: `${u.moyenne}`, style: 'tabUnite', color: u.moyenne < 10 ? testFocument.chart.secondary : testFocument.chart.black,}
    ]
    const ecues = u.elements.map(ec=>[
      {text: ec.designation, style: 'tabEC'},
      {text: String(ec.cc), style: 'tabEC'},
      {text: String(ec.examen), style: 'tabEC'},
      {text: String(ec.rattrage), style: 'tabEC'},
      {text: String(ec.credit), style: 'tabEC'},
      {text: ec.examen + ec.cc > ec.rattrage ? (ec.examen + ec.cc).toFixed(2) : ec.rattrage, style: 'tabEC'},
    ])

    return [
      ...ecues,
      moyenne
    ]
  })

  const syntheses = {
    ncv: (notes: Note[]) => notes.reduce((acc, n) => acc + (n.moyenne > 10 ? n.credit : 0), 0),
    ncnv: (notes: Note[]) => notes.reduce((acc, n) => acc + (n.moyenne < 10 ? n.credit : 0), 0),
    moyenne: (notes: Note[]) => {
      const totalCredits = notes.reduce((acc, n) => acc + n.credit, 0);
      const maxObtenu = notes.reduce((acc, n) => acc + (n.credit * n.moyenne), 0);

      return totalCredits > 0 ? (maxObtenu/totalCredits) : 0
    }
  }

  const getMentions = (moyenne: number): string => {
    switch (true) {
      case moyenne < 10: return "Échec";
      case moyenne < 12: return "Passable";
      case moyenne < 14: return "Assez Bien";
      case moyenne < 16: return "Bien";
      case moyenne < 18: return "Très Bien";
      default: return "Excellent";
    }
  };

  console.log("Data Notes : ", ...items)
  await testFocument.buildFooter("https://btp.inbtp.net");
  await testFocument.studentLayout([		
    {
			table: {
				headerRows: 1,
        widths: ['*', 25, 25, 25, 25, 25],
				// dontBreakRows: true,
				// keepWithHeaderRows: 1,
				body: [
					[
            {
              text: 'Matière', 
              style: 'tabHeader',
            },
            {
              text: 'CC', 
              style: 'tabHeader'
            }, 
            {
              text: 'EX', 
              style: 'tabHeader'
            },
            {
              text: 'RT', 
              style: 'tabHeader'
            },
            {
              text: 'CRT', 
              style: 'tabHeader'
            },
            {
              text: 'TOT', 
              style: 'tabHeader'
            } 
          ],
          ...items,
					/* [
						'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.',
						'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.',
						'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.',
					] */
				]
			}
		},
    {
      margin: [0, 5, 0, 0],
      columns: [
        { width: '*', text: '' }, // espace vide à gauche
        {
          width: 'auto',
          table: {
            widths: [60, 40],
            body: [
              [
                { text: 'Synthèse du Semestre', colSpan: 2, style: "tabHeader" },
                ''
              ],
              [{ text: 'NCV', style: 'tabUnite' }, { text: String(syntheses.ncv(data)), style: 'tabUnite' }],
              [{ text: 'NCNV', style: 'tabUnite' }, { text: String(syntheses.ncnv(data)), style: 'tabUnite' }],
              [{ text: 'MOYENNE', style: 'tabUnite' }, { text: `${syntheses.moyenne(data).toFixed(2)}/20`, style: 'tabUnite' }],
              [{ text: 'MENTION', style: 'tabUnite' }, { text: getMentions(syntheses.moyenne(data)), style: 'tabUnite' }],
              [{
                text: 'DECISION',
                style: 'tabUnite'
              }, {
                text: syntheses.moyenne(data) >= 10 ? 'V' : 'NV',
                style: 'tabUnite',
                color: syntheses.moyenne(data) >= 10 ? 'green' : testFocument.chart.secondary
              }]
            ]
          }
        }
      ]
    }
  ]);
  await testFocument.background();
  const buffer = await testFocument.generateBuffer()

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'inline; filename="test.pdf"',
      "Cache-Control": "no-store",
    },
  });
}
