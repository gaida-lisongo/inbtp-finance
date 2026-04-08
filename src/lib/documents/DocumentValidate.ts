import { Document, type PdfDocumentDefinition, type ReferenceItem } from "@/lib/documents/Document";
import { buildOfficialDocumentHeader } from "@/lib/documents/layout";

type ValidationMatiereItem = {
  designation: string;
  credit: number;
};

type ValidationUniteItem = {
  code: string;
  designation: string;
  statut: "V" | "NV";
  credit: number;
  matieres: ValidationMatiereItem[];
};

type ValidationSemestreItem = {
  designation: string;
  totalCredits: number;
  unites: ValidationUniteItem[];
  validatedCredits: number;
  nonValidatedCredits: number;
  casserolesCount: number;
};

export type DocumentValidatePayload = {
  studentName: string;
  studentEmail: string | null;
  studentPhone: string | null;
  matricule: string;
  programmeName: string;
  orderReference: string;
  semestres: ValidationSemestreItem[];
  verificationUrl: string;
};

const round = (value: number) => Math.round(value * 100) / 100;

const formatCredit = (value: number) => {
  return new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
};

export class DocumentValidate extends Document<DocumentValidatePayload> {
  info() {
    return {
      title: `Fiche de validation - ${this.payload.studentName}`,
      author: "Dashboard Agents",
      subject: "Validation des credits par semestre",
      keywords: "validation, credits, semestre, unites, matieres",
    };
  }

  reference(data: ReferenceItem[] = []) {
    return {
      table: {
        widths: [130, "*"],
        body: data.map((item) => [
          { text: item.label, color: "#6B7280", margin: [0, 4, 0, 4] },
          { text: item.value, bold: true, margin: [0, 4, 0, 4] },
        ]),
      },
      layout: "noBorders",
    };
  }

  student() {
    return {
      table: {
        widths: [130, "*"],
        body: [
          ["Nom complet", this.payload.studentName],
          ["Matricule", this.payload.matricule || "Non renseigne"],
          ["Email", this.payload.studentEmail ?? "Non renseigne"],
          ["Telephone", this.payload.studentPhone ?? "Non renseigne"],
          ["Promotion", this.payload.programmeName || "Non renseignee"],
        ],
      },
      layout: "lightHorizontalLines",
    };
  }

  private buildSemestreUnitesTable(semestre: ValidationSemestreItem) {
    const headerRow: Array<Record<string, unknown>> = [
      { text: "Code", style: "tableHeaderCenter" },
      { text: "Unites", style: "tableHeaderLeft" },
      { text: "Statut", style: "tableHeaderCenter" },
      { text: "Matieres", style: "tableHeaderLeft" },
      { text: "Credit", style: "tableHeaderCenter" },
    ];

    const body: unknown[] = [headerRow];

    for (const unite of semestre.unites) {
      const matieresStack =
        unite.matieres.length > 0
          ? unite.matieres.map((matiere, index) => ({
              text: `${index + 1}. ${matiere.designation}`,
              fontSize: 8.5,
              margin: [0, index === 0 ? 0 : 1, 0, 0],
            }))
          : [{ text: "Aucune matiere rattachee", italics: true, color: "#6B7280", fontSize: 8.5 }];

      body.push([
        { text: unite.code || "-", alignment: "center", fontSize: 8.5, margin: [0, 2, 0, 2] },
        {
          stack: [
            { text: unite.designation || "Unite", bold: true, fontSize: 8.5, margin: [0, 1, 0, 1] },
          ],
        },
        {
          text: unite.statut,
          alignment: "center",
          bold: true,
          fontSize: 8.5,
          color: unite.statut === "V" ? "#15803D" : "#B91C1C",
          margin: [0, 2, 0, 2],
        },
        { stack: matieresStack, margin: [0, 2, 0, 2] },
        {
          text: formatCredit(unite.credit),
          alignment: "center",
          bold: true,
          fontSize: 8.5,
          color: unite.statut === "V" ? "#15803D" : "#B91C1C",
          margin: [0, 2, 0, 2],
        },
      ]);
    }

    return {
      table: {
        headerRows: 1,
        widths: [44, 95, 35, "*", 40],
        body,
      },
      layout: {
        fillColor: (rowIndex: number) => (rowIndex === 0 ? "#E5E7EB" : null),
        hLineColor: () => "#D1D5DB",
        vLineColor: () => "#D1D5DB",
      },
    };
  }

  private buildSemestreSummary(semestre: ValidationSemestreItem) {
    return {
      table: {
        widths: ["*", 120],
        body: [
          [
            { text: "Credits valides", margin: [0, 3, 0, 3] },
            { text: formatCredit(semestre.validatedCredits), alignment: "right", bold: true, color: "#15803D", margin: [0, 3, 0, 3] },
          ],
          [
            { text: "Credits non valides", margin: [0, 3, 0, 3] },
            { text: formatCredit(semestre.nonValidatedCredits), alignment: "right", bold: true, color: "#B91C1C", margin: [0, 3, 0, 3] },
          ],
          [
            { text: "Casseroles (matieres a refaire)", margin: [0, 3, 0, 3] },
            { text: String(semestre.casserolesCount), alignment: "right", bold: true, margin: [0, 3, 0, 3] },
          ],
        ],
      },
      layout: "lightHorizontalLines",
    };
  }

  async content(docDefinition: PdfDocumentDefinition) {
    const today = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" }).format(new Date());
    const header = await buildOfficialDocumentHeader({
      dateLabel: today,
      sectionLabel: "Scolarite",
      referenceValue: this.payload.orderReference,
    });

    docDefinition.styles = {
      ...(docDefinition.styles ?? {}),
      tableHeaderLeft: {
        bold: true,
        alignment: "left",
        margin: [0, 6, 0, 6],
        color: "#111827",
      },
      tableHeaderCenter: {
        bold: true,
        alignment: "center",
        margin: [0, 6, 0, 6],
        color: "#111827",
      },
    };

    const content: unknown[] = [
      ...header,
      { text: "FICHE DE VALIDATION DES CREDITS", style: "title", margin: [0, 0, 0, 10] },
      this.reference([
        { label: "Reference commande", value: this.payload.orderReference },
        { label: "Promotion", value: this.payload.programmeName || "Non renseignee" },
      ]),
      { text: "", margin: [0, 6, 0, 6] },
      { text: "Identification de l'etudiant", style: "sectionLabel" },
      this.student(),
    ];

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

    content.push({ text: "", margin: [0, 10, 0, 6] });
    content.push({ text: "Synthese globale", style: "sectionLabel", margin: [0, 0, 0, 6] });
    content.push({
      table: {
        widths: ["*", 120],
        body: [
          [{ text: "Total credits valides", margin: [0, 4, 0, 4] }, { text: formatCredit(totalValidatedCredits), alignment: "right", bold: true, color: "#15803D", margin: [0, 4, 0, 4] }],
          [{ text: "Total credits non valides", margin: [0, 4, 0, 4] }, { text: formatCredit(totalNonValidatedCredits), alignment: "right", bold: true, color: "#B91C1C", margin: [0, 4, 0, 4] }],
          [{ text: "Total casseroles", margin: [0, 4, 0, 4] }, { text: String(totalCasseroles), alignment: "right", bold: true, margin: [0, 4, 0, 4] }],
        ],
      },
      layout: "lightHorizontalLines",
    });
    content.push({
      columns: [
        {
          width: "*",
          stack: [
            { text: "Authentification du document", style: "sectionLabel", margin: [0, 10, 0, 4] },
            {
              text: "Scannez le QR code pour verifier la validite de cette fiche sur la plateforme officielle.",
              fontSize: 9,
              color: "#374151",
              margin: [0, 0, 0, 3],
            },
            { text: this.payload.verificationUrl, fontSize: 8, color: "#2563EB" },
          ],
        },
        {
          width: 86,
          qr: this.payload.verificationUrl,
          fit: 76,
          alignment: "right",
          margin: [0, 10, 0, 0],
        },
      ],
    });

    this.payload.semestres.forEach((semestre) => {
      content.push({
        text: `${semestre.designation} - Credits du semestre: ${formatCredit(semestre.totalCredits)}`,
        style: "sectionLabel",
        margin: [0, 0, 0, 6],
        pageBreak: "before" as const,
      });

      content.push(this.buildSemestreUnitesTable(semestre));
      content.push({ text: "", margin: [0, 5, 0, 4] });
      content.push({ text: "Synthese du semestre", style: "sectionLabel", margin: [0, 0, 0, 4] });
      content.push(this.buildSemestreSummary(semestre));
    });

    docDefinition.content = content;
    return docDefinition;
  }
}
