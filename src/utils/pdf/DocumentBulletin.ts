import Document, { type Note } from "./Document";

type PdfCell = string | number | Record<string, unknown>;
type PdfRow = PdfCell[];

class DocumentBulletin extends Document {
  private items: PdfRow[] = [];
  private notes: Note[] = [];

  constructor(notes: Note[] = []) {
    super();
    if (notes.length > 0) {
      this.parseData(notes);
    }
  }

  parseData(data: Note[]) {
    this.notes = data;

    const parsedRows: PdfRow[] = data.flatMap((u) => {
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

  async generate() {
    const syntheses = this.syntheses;
    const moyenne = syntheses.moyenne(this.notes);

    await this.background()

    await this.studentLayout([
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
                [{ text: "Synthèse du Semestre", colSpan: 2, style: "tabHeader" }, ""],
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
    ]);
  }
}

export default DocumentBulletin;
