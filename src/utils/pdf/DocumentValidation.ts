import Document from "./Document";

export type ValidationMatiereItem = {
  designation: string;
  credit: number;
};

export type ValidationUniteItem = {
  code: string;
  designation: string;
  statut: "V" | "NV";
  credit: number;
  matieres: ValidationMatiereItem[];
};

export type ValidationSemestreItem = {
  designation: string;
  totalCredits: number;
  unites: ValidationUniteItem[];
  validatedCredits: number;
  nonValidatedCredits: number;
  casserolesCount: number;
};

export type DocumentValidationPayload = {
  studentName: string;
  studentEmail: string | null;
  studentPhone: string | null;
  matricule: string;
  programmeName: string;
  orderReference: string;
  semestres: ValidationSemestreItem[];
  verificationUrl: string;
};

type PdfCell = string | number | Record<string, unknown>;
type PdfRow = PdfCell[];

const round = (value: number) => Math.round(value * 100) / 100;

class DocumentValidation extends Document {
  private payload: DocumentValidationPayload | null = null;

  constructor(payload: DocumentValidationPayload | null = null) {
    super();
    if (payload) {
      this.payload = payload;
    }

    this.docDefinition.styles = {
      ...this.docDefinition.styles,
      tabCell: {
        fontSize: this.chart.xs,
        lineHeight: 1,
      },
      tabCellBold: {
        fontSize: this.chart.xs,
        bold: true,
        lineHeight: 1,
      },
    };
  }

  private formatCredit(value: number) {
    return new Intl.NumberFormat("fr-FR", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(value);
  }

  private buildUnitesTable(semestre: ValidationSemestreItem) {
    const header: PdfRow = [
      { text: "Code", style: "tabHeader", alignment: "center" },
      { text: "Unités", style: "tabHeader", alignment: "left" },
      { text: "Statut", style: "tabHeader", alignment: "center" },
      { text: "Matières", style: "tabHeader", alignment: "left" },
      { text: "Crédit", style: "tabHeader", alignment: "center" },
    ];

    const body: PdfRow[] = [header];

    for (const unite of semestre.unites) {
      const isValid = unite.statut === "V";
      const statusColor = isValid ? this.chart.green : this.chart.secondary;

      const matieresStack =
        unite.matieres.length > 0
          ? unite.matieres.map((matiere, index) => ({
              text: `${index + 1}. ${matiere.designation}`,
              fontSize: this.chart.xs,
              margin: [0, index === 0 ? 0 : 1, 0, 0],
            }))
          : [{ text: "Aucune matière rattachée", italics: true, color: this.chart.gray, fontSize: this.chart.xs }];

      body.push([
        { text: unite.code || "-", style: "tabCell", alignment: "center", margin: [0, 2, 0, 2] },
        { text: unite.designation || "Unité", style: "tabCellBold", margin: [0, 2, 0, 2] },
        { text: unite.statut, style: "tabCellBold", alignment: "center", color: statusColor, margin: [0, 2, 0, 2] },
        { stack: matieresStack, margin: [0, 2, 0, 2] },
        {
          text: this.formatCredit(unite.credit),
          style: "tabCellBold",
          alignment: "center",
          color: statusColor,
          margin: [0, 2, 0, 2],
        },
      ]);
    }

    return {
      table: {
        headerRows: 1,
        widths: [44, 120, 40, "*", 44],
        body,
      },
      layout: {
        hLineColor: () => this.chart.gray,
        vLineColor: () => this.chart.gray,
      },
    };
  }

  private buildSemestreSummary(semestre: ValidationSemestreItem) {
    return {
      table: {
        widths: ["*", 120],
        body: [
          [
            { text: "Crédits validés", style: "tabCell", margin: [0, 3, 0, 3] },
            {
              text: this.formatCredit(semestre.validatedCredits),
              style: "tabCellBold",
              alignment: "right",
              color: this.chart.green,
              margin: [0, 3, 0, 3],
            },
          ],
          [
            { text: "Crédits non validés", style: "tabCell", margin: [0, 3, 0, 3] },
            {
              text: this.formatCredit(semestre.nonValidatedCredits),
              style: "tabCellBold",
              alignment: "right",
              color: this.chart.secondary,
              margin: [0, 3, 0, 3],
            },
          ],
          [
            { text: "Casseroles (matières à refaire)", style: "tabCell", margin: [0, 3, 0, 3] },
            { text: String(semestre.casserolesCount), style: "tabCellBold", alignment: "right", margin: [0, 3, 0, 3] },
          ],
        ],
      },
      layout: "lightHorizontalLines",
    };
  }

  async generate(verificationUrl: string) {
    if (!this.payload) {
      throw new Error("Données manquantes pour la fiche de validation.");
    }

    await this.background();
    await this.buildFooter(verificationUrl);

    const totalValidatedCredits = round(
      this.payload.semestres.reduce((sum, semestre) => sum + (Number.isFinite(semestre.validatedCredits) ? semestre.validatedCredits : 0), 0),
    );
    const totalNonValidatedCredits = round(
      this.payload.semestres.reduce(
        (sum, semestre) => sum + (Number.isFinite(semestre.nonValidatedCredits) ? semestre.nonValidatedCredits : 0),
        0,
      ),
    );
    const totalCasseroles = this.payload.semestres.reduce((sum, semestre) => sum + semestre.casserolesCount, 0);

    const rows: PdfRow[] = [
      [
        {
          text: "FICHE DE VALIDATION DES CRÉDITS",
          style: "title",
          alignment: "center",
          colSpan: 3,
          margin: [0, 4, 0, 10],
        },
        "",
        "",
      ],
      [
        {
          table: {
            widths: [140, "*"],
            body: [
              [{ text: "Référence commande", style: "tabCell" }, { text: this.payload.orderReference, style: "tabCellBold" }],
              [{ text: "Promotion", style: "tabCell" }, { text: this.payload.programmeName || "Non renseignée", style: "tabCellBold" }],
            ],
          },
          layout: "lightHorizontalLines",
          colSpan: 3,
        },
        "",
        "",
      ],
      [
        { text: "Identification de l'étudiant", style: "subtitle", colSpan: 3, margin: [0, 10, 0, 4] },
        "",
        "",
      ],
      [
        {
          table: {
            widths: [140, "*"],
            body: [
              [{ text: "Nom complet", style: "tabCell" }, { text: this.payload.studentName, style: "tabCellBold" }],
              [{ text: "Matricule", style: "tabCell" }, { text: this.payload.matricule || "Non renseigné", style: "tabCellBold" }],
              [{ text: "Email", style: "tabCell" }, { text: this.payload.studentEmail ?? "Non renseigné", style: "tabCellBold" }],
              [{ text: "Téléphone", style: "tabCell" }, { text: this.payload.studentPhone ?? "Non renseigné", style: "tabCellBold" }],
            ],
          },
          layout: "lightHorizontalLines",
          colSpan: 3,
        },
        "",
        "",
      ],
      [
        { text: "Synthèse globale", style: "subtitle", colSpan: 3, margin: [0, 10, 0, 4] },
        "",
        "",
      ],
      [
        {
          table: {
            widths: ["*", 120],
            body: [
              [{ text: "Total crédits validés", style: "tabCell" }, { text: this.formatCredit(totalValidatedCredits), style: "tabCellBold", alignment: "right", color: this.chart.green }],
              [{ text: "Total crédits non validés", style: "tabCell" }, { text: this.formatCredit(totalNonValidatedCredits), style: "tabCellBold", alignment: "right", color: this.chart.secondary }],
              [{ text: "Total casseroles", style: "tabCell" }, { text: String(totalCasseroles), style: "tabCellBold", alignment: "right" }],
            ],
          },
          layout: "lightHorizontalLines",
          colSpan: 3,
        },
        "",
        "",
      ],
    ];

    this.payload.semestres.forEach((semestre, index) => {
      rows.push([
        {
          text: `${semestre.designation} — Crédits du semestre: ${this.formatCredit(semestre.totalCredits)}`,
          style: "title",
          colSpan: 3,
          margin: [0, 14, 0, 6],
          pageBreak: index === 0 ? undefined : ("before" as const),
        },
        "",
        "",
      ]);

      rows.push([{ ...(this.buildUnitesTable(semestre) as Record<string, unknown>), colSpan: 3 }, "", ""]);
      rows.push([{ text: "Synthèse du semestre", style: "subtitle", colSpan: 3, margin: [0, 6, 0, 4] }, "", ""]);
      rows.push([{ ...(this.buildSemestreSummary(semestre) as Record<string, unknown>), colSpan: 3 }, "", ""]);
    });

    await this.adminLayout(rows);
  }
}

export default DocumentValidation;

