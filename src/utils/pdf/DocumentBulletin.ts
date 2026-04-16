import Document, { type Note } from "./Document";

type PdfCell = string | number | Record<string, unknown>;
type PdfRow = PdfCell[];

export type DocumentBulletinPayload = {
  notes: Note[];
  student?: {
    profile?: string;
    nom: string;
    sexe: string;
    ville: string;
  };
  parcour?: {
    promotion: string;
    systeme: string;
    matricule: string;
    annee: string;
  };
  contact?: {
    email: string;
    telephone: string;
    adresse: string;
  };
  document?: {
    type: string;
    ressource: string;
    detail: string;
    reference: string;
    dateCreate: string;
    other?: string;
  };
};

class DocumentBulletin extends Document {
  private items: PdfRow[] = [];
  private notes: Note[] = [];
  private student: { profile?: string; nom: string; sexe: string; ville: string } = {
    nom: "PierreMbenza MbenzaMbenza",
    sexe: "M",
    ville: "Kinshasa",
  };
  private parcour: { promotion: string; systeme: string; matricule: string; annee: string } = {
    promotion: "L3 Batiment",
    matricule: "BAT-2024-056",
    systeme: "LMD",
    annee: "2024-2025",
  };
  private contact: { email: string; telephone: string; adresse: string } = {
    email: "etudiant@inbtp.ac.cd",
    telephone: "+243 812 345 678",
    adresse: "Avenue de la Paix, Kinshasa",
  };
  private document: { type: string; ressource: string; detail: string; reference: string; dateCreate: string; other?: string } = {
    type: "Releve de notes",
    ressource: "Systeme academique",
    detail: "Releve de notes du semestre 1",
    reference: "RN-2024-001",
    dateCreate: "15/04/2026",
  };

  constructor(payload: DocumentBulletinPayload | null = null) {
    super();
    if (payload) {
      this.parseData(payload);
    }

    this.docDefinition.styles = {
        ...this.docDefinition.styles,
        tabUnite: {
            italics: true,
            bold: true,
            fontSize: this.chart.xs,
            alignment: 'right',
            lineHeight: 1 // 👈 au lieu de 1.35 (gros impact)
        },
        tabEC:{
            italics: true,
            fontSize: this.chart.xs,
            alignment: 'left',
        },
    }
  }

  parseData(data: DocumentBulletinPayload) {
    this.notes = data.notes ?? [];
    this.student = {
      ...this.student,
      ...(data.student ?? {}),
    };
    this.parcour = {
      ...this.parcour,
      ...(data.parcour ?? {}),
    };
    this.contact = {
      ...this.contact,
      ...(data.contact ?? {}),
    };
    
    const reference = `INBTP/${this.getService()}/FV/${(new Date()).getFullYear()}/${(Date.now()).toString().slice(-5)}`

    const document = {...data.document, reference}

    this.document = {
      ...this.document,
      ...(document ?? {}),
    };

    const parsedRows: PdfRow[] = this.notes.flatMap((u) => {
      const moyenneRow: PdfRow = [
        {
            columns: [
                {width: '*', text: u.code, fontSize: this.chart.xs, italics: true, bold: true},
                {
                    width: 'auto',
                    text: `${u.unite}`,
                    style: "tabUnite",
                    color: u.moyenne < 10 ? this.chart.secondary : this.chart.black
                }
            ],
            colSpan: 4,
        },
        "",
        "",
        "",
        {
          text: `${u.credit}`,
          style: "tabUnite",
          color: u.moyenne < 10 ? this.chart.secondary : this.chart.black,
        },
        {
          text: `${u.moyenne}`,
          style: "tabUnite",
          color: u.moyenne < 10 ? this.chart.secondary : this.chart.black,
        },
      ];

      const ecues: PdfRow[] = u.elements.map((ec) => {
        const sessionTotal = ec.examen + ec.cc;
        const bestTotal = sessionTotal > ec.rattrage ? sessionTotal : ec.rattrage;

        return [
          { text: ec.designation, style: "tabEC" },
          { text: String(ec.cc), style: "tabEC" },
          { text: String(ec.examen), style: "tabEC" },
          { text: String(ec.rattrage), style: "tabEC" },
          { text: String(ec.credit), style: "tabEC" },
          { text: bestTotal.toFixed(2), style: "tabEC" },
        ];
      });

      return [...ecues, moyenneRow];
    });

    this.items = parsedRows;
  }

  async generate(payload: string) {
    const syntheses = this.syntheses;
    const moyenne = syntheses.moyenne(this.notes);

    await this.background()
    await this.buildFooter(payload);

    await this.studentLayout(
      [
        {
          table: {
            headerRows: 1,
            widths: ["*", 25, 25, 25, 25, 25],
            body: [
              [
                { text: "Matière", style: "tabHeader" },
                { text: "CC", style: "tabHeader" },
                { text: "EX", style: "tabHeader" },
                { text: "RT", style: "tabHeader" },
                { text: "CRT", style: "tabHeader" },
                { text: "TOT", style: "tabHeader" },
              ],
              ...this.items,
            ],
          },
        },
        {
          margin: [0, 5, 0, 0],
          columns: [
            { width: "*", text: "" },
            {
              width: "auto",
              table: {
                widths: [60, 40],
                body: [
                  [{ text: "Synthèse des resultats", colSpan: 2, style: "tabHeader" }, ""],
                  [{ text: "NCV", style: "tabUnite" }, { text: String(syntheses.ncv(this.notes)), style: "tabUnite" }],
                  [{ text: "NCNV", style: "tabUnite" }, { text: String(syntheses.ncnv(this.notes)), style: "tabUnite" }],
                  [{ text: "MOYENNE", style: "tabUnite" }, { text: `${moyenne.toFixed(2)}/20`, style: "tabUnite" }],
                  [{ text: "MENTION", style: "tabUnite" }, { text: this.getMentions(moyenne), style: "tabUnite" }],
                  [
                    { text: "DECISION", style: "tabUnite" },
                    {
                      text: moyenne >= 10 ? "V" : "NV",
                      style: "tabUnite",
                      color: moyenne >= 10 ? this.chart.green : this.chart.secondary,
                    },
                  ],
                ],
              },
            },
          ],
        },
      ],
      this.student,
      this.parcour,
      this.contact,
      this.document,
    );
  }
}

export default DocumentBulletin;
