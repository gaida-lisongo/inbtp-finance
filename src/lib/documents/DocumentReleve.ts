import { Document, type PdfDocumentDefinition, type ReferenceItem } from "@/lib/documents/Document";
import { buildOfficialDocumentHeader } from "@/lib/documents/layout";
import { getChefSignatory } from "@/lib/documents/signatory";

export type ReleveUnitItem = {
  semestre: string;
  code: string;
  designation: string;
  statut: "V" | "NV";
  credit: number;
};

export type ReleveSummary = {
  ncv: number;
  ncnv: number;
  totalObtenu: number;
  totalMax: number;
  pourcentage: number;
  mention: string;
  decision: string;
};

export type DocumentRelevePayload = {
  studentName: string;
  studentEmail: string | null;
  studentPhone: string | null;
  matricule: string;
  programmeName: string;
  orderReference: string;
  units: ReleveUnitItem[];
  summary: ReleveSummary;
  verificationUrl: string;
};

const formatCredit = (value: number) =>
  new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);

const formatPercentage = (value: number) =>
  new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);

export class DocumentReleve extends Document<DocumentRelevePayload> {
  info() {
    return {
      title: `Releve de notes - ${this.payload.studentName}`,
      author: "Dashboard Agents",
      subject: "Bulletin de notes",
      keywords: "releve, bulletin, note, credits",
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

  async content(docDefinition: PdfDocumentDefinition) {
    const today = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" }).format(new Date());
    const header = await buildOfficialDocumentHeader({
      dateLabel: today,
      sectionLabel: "Scolarite",
      referenceValue: this.payload.orderReference,
    });

    const summaryTable = {
      table: {
        widths: [120, 90],
        body: [
          ["NCV", String(this.payload.summary.ncv)],
          ["NCNV", String(this.payload.summary.ncnv)],
          ["Total obtenu", formatCredit(this.payload.summary.totalObtenu)],
          ["Total max", formatCredit(this.payload.summary.totalMax)],
          [
            "Pourcentage",
            `${formatPercentage(this.payload.summary.pourcentage)}%`,
          ],
          ["Mention", this.payload.summary.mention],
          ["Decision", this.payload.summary.decision],
        ],
      },
      layout: "lightHorizontalLines",
    };

    const tableBody = [
      [
        { text: "Semestre", style: "tableHeaderCenter" },
        { text: "Code", style: "tableHeaderCenter" },
        { text: "Unité", style: "tableHeaderLeft" },
        { text: "Statut", style: "tableHeaderCenter" },
        { text: "Crédit", style: "tableHeaderCenter" },
      ],
      ...this.payload.units.map((unit) => [
        { text: unit.semestre, alignment: "center", fontSize: 8 },
        { text: unit.code, alignment: "center", fontSize: 8 },
        { text: unit.designation, fontSize: 8 },
        {
          text: unit.statut,
          alignment: "center",
          bold: true,
          fontSize: 8,
          color: unit.statut === "V" ? "#15803D" : "#B91C1C",
        },
        { text: formatCredit(unit.credit), alignment: "center", fontSize: 8 },
      ]),
    ];

    docDefinition.styles = {
      ...(docDefinition.styles ?? {}),
      tableHeaderCenter: { bold: true, alignment: "center", fontSize: 9, margin: [0, 4, 0, 4] },
      tableHeaderLeft: { bold: true, alignment: "left", fontSize: 9, margin: [0, 4, 0, 4] },
    };

    docDefinition.content = [
      ...header,
      { text: "BULLETIN DE NOTES", style: "title", margin: [0, 0, 0, 12] },
      {
        columns: [
          {
            width: "*",
            stack: [
              {
                text: [
                  "Etudiant: ",
                  { text: this.payload.studentName, bold: true },
                ],
                margin: [0, 0, 0, 4],
              },
              {
                text: `Matricule: ${this.payload.matricule}`,
                margin: [0, 0, 0, 4],
              },
              {
                text: `Promotion: ${this.payload.programmeName}`,
                margin: [0, 0, 0, 6],
              },
              {
                text: `Email: ${this.payload.studentEmail ?? "Non renseigne"}`,
                fontSize: 9,
                margin: [0, 0, 0, 2],
              },
              {
                text: `Tel: ${this.payload.studentPhone ?? "Non renseigne"}`,
                fontSize: 9,
              },
            ],
          },
          {
            width: 120,
            stack: [
              { text: "Synthèse globale", style: "sectionLabel" },
              summaryTable,
            ],
          },
        ],
      },
      {
        text: "Detail des unites",
        style: "sectionLabel",
        margin: [0, 12, 0, 6],
      },
      {
        table: {
          headerRows: 1,
          widths: [60, 50, "*", 40, 40],
          body: tableBody,
        },
        layout: {
          fillColor: (rowIndex: number) => (rowIndex === 0 ? "#E5E7EB" : null),
          hLineColor: () => "#D1D5DB",
          vLineColor: () => "#D1D5DB",
        },
      },
    {
      columns: [
        {
          width: "*",
          stack: [
            { text: "Authentification du bulletin", style: "sectionLabel", margin: [0, 12, 0, 4] },
            {
              text: "Scannez le QR code pour verifier l'authenticite de ce document.",
              fontSize: 9,
              color: "#374151",
            },
            { text: this.payload.verificationUrl, fontSize: 8, color: "#2563EB" },
          ],
        },
        {
          width: 80,
          qr: this.payload.verificationUrl,
          fit: 72,
          alignment: "right",
        },
      ],
      margin: [0, 12, 0, 0],
    },
    {
      columns: [
        {
          width: "*",
          text: "",
        },
        {
          width: 200,
          stack: [
            { text: "Le Chef de section", bold: true, alignment: "center" },
            { text: getChefSignatory(), alignment: "center", margin: [0, 12, 0, 0], bold: true },
          ],
        },
      ],
      margin: [0, 12, 0, 0],
    },
  ];

    return docDefinition;
  }
}
