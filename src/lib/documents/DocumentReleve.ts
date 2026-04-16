import { Document, type PdfDocumentDefinition, type ReferenceItem } from "@/lib/documents/Document";
import { buildOfficialDocumentHeader } from "@/lib/documents/layout";
import { getChefSignatory } from "@/lib/documents/signatory";

export type ReleveUnitItem = {
  semestre: string;
  code: string;
  designation: string;
  statut: "V" | "NV";
  credit: number;
  moyenne: number;
  elements: Array<{
    designation: string;
    credit: number;
    cc: number;
    examen: number;
    noteSession: number;
    rattrapage: number;
    rachat: number;
    noteFinale: number;
  }>;
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
  studentVille: string;
  studentDateNaiss: Date;
  studentEmail: string | null;
  studentPhone: string | null;
  matricule: string;
  programmeName: string;
  anneeAcad: string;
  orderReference: string;
  serialNumber: string;
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

const formatGrade = (value: number) =>
  new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);

const normalizeSerial = (value: string) => {
  const normalized = (value ?? "").toString().toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (normalized.length >= 14) return normalized.slice(-14);
  return normalized.padStart(14, "0");
};

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
    const [headerTop] = await buildOfficialDocumentHeader({
      dateLabel: today,
      sectionLabel: null,
      referenceValue: null,
    });

    const serialNumber = normalizeSerial(this.payload.serialNumber);
    const serialCells = serialNumber.split("").map((char) => ({
      text: char,
      alignment: "center" as const,
      bold: true,
      fontSize: 10,
      margin: [0, 4, 0, 4] as [number, number, number, number],
    }));

    const unitsRows: unknown[] = this.payload.units.map((unit) => {
      const statusColor = unit.statut === "V" ? "#15803D" : "#B91C1C";

      return [
        { text: unit.code, alignment: "center", fontSize: 8, margin: [0, 1, 0, 1] },
        { text: unit.designation, fontSize: 8, margin: [0, 1, 0, 1] },
        { text: formatCredit(unit.credit), alignment: "center", fontSize: 8, margin: [0, 1, 0, 1] },
        { text: `${formatGrade(unit.moyenne)}/20`, alignment: "center", fontSize: 8, margin: [0, 1, 0, 1], bold: true },
        { text: unit.statut, alignment: "center", fontSize: 8, margin: [0, 1, 0, 1], bold: true, color: statusColor },
      ];
    });

    docDefinition.styles = {
      ...(docDefinition.styles ?? {}),
      tableHeader: { bold: true, alignment: "center", fontSize: 8, margin: [0, 3, 0, 3] },
      sectionRow: { bold: true, fontSize: 9, color: "#111827", margin: [0, 4, 0, 4] },
      metaLabel: { fontSize: 8.2, color: "#6B7280" },
      metaValue: { fontSize: 8.2, bold: true, color: "#111827" },
    };

    docDefinition.pageMargins = [18, 14, 18, 14];
    docDefinition.defaultStyle = {
      ...(docDefinition.defaultStyle ?? {}),
      fontSize: 8.5,
      lineHeight: 1.05,
    };

    const summaryTable = {
      table: {
        widths: [90, "*"],
        body: [
          [{ text: "NCV", style: "metaLabel" }, { text: String(this.payload.summary.ncv), style: "metaValue" }],
          [{ text: "NCNV", style: "metaLabel" }, { text: String(this.payload.summary.ncnv), style: "metaValue" }],
          [{ text: "Pourcentage", style: "metaLabel" }, { text: `${formatPercentage(this.payload.summary.pourcentage)}%`, style: "metaValue" }],
          [{ text: "Mention", style: "metaLabel" }, { text: this.payload.summary.mention, style: "metaValue" }],
          [{ text: "Decision", style: "metaLabel" }, { text: this.payload.summary.decision, style: "metaValue" }],
        ],
      },
      layout: "lightHorizontalLines",
    };

    const sectionLabel = process.env.NEXT_PUBLIC_SECTION?.trim() || "Non renseignée";

    const outerTableBody: unknown[] = [
      [
        {
          colSpan: 5,
          stack: [
            { ...(headerTop as Record<string, unknown>), margin: [0, 0, 0, 2] },
            { text: "RELEVE DE COTES", alignment: "center", bold: true, fontSize: 11, margin: [0, 0, 0, 2] },
          ],
        },
        "",
        "",
        "",
        "",
      ],
      [
        {
          colSpan: 5,
          columns: [
            {
              width: "*",
              table: {
                widths: [78, "*"],
                body: [
                  [{ text: "Étudiant", style: "metaLabel" }, { text: this.payload.studentName, style: "metaValue" }],
                  [{ text: "Matricule", style: "metaLabel" }, { text: this.payload.matricule || "Non renseigné", style: "metaValue" }],
                ],
              },
              layout: "noBorders",
              margin: [0, 1, 8, 1],
            },
            {
              width: "*",
              table: {
                widths: [65, "*"],
                body: [
                  [{ text: "Programme", style: "metaLabel" }, { text: this.payload.programmeName || "Non renseigné", style: "metaValue" }],
                  [{ text: "Section", style: "metaLabel" }, { text: sectionLabel, style: "metaValue" }],
                ],
              },
              layout: "noBorders",
              margin: [8, 1, 0, 1],
            },
          ],
          margin: [0, 0, 0, 0],
        },
        "",
        "",
        "",
        "",
      ],
      [
        {
          colSpan: 5,
          columns: [
            { width: 86, text: "N° de série", bold: true, fontSize: 8.5, margin: [0, 3, 0, 0] },
            {
              width: "*",
              table: { widths: new Array(14).fill("*"), body: [serialCells] },
              layout: {
                hLineColor: () => "#111827",
                vLineColor: () => "#111827",
                hLineWidth: () => 0.6,
                vLineWidth: () => 0.6,
                paddingLeft: () => 0,
                paddingRight: () => 0,
                paddingTop: () => 0,
                paddingBottom: () => 0,
              },
              margin: [0, 0, 0, 1],
            },
          ],
          margin: [0, 0, 0, 0],
        },
        "",
        "",
        "",
        "",
      ],
      [
        { text: "UNITÉS D’ENSEIGNEMENT — MOYENNES", colSpan: 5, style: "sectionRow", fillColor: "#E5E7EB" },
        "",
        "",
        "",
        "",
      ],
      [
        { text: "Code", style: "tableHeader" },
        { text: "Unité d’enseignement", style: "tableHeader" },
        { text: "Cr", style: "tableHeader" },
        { text: "Moy/20", style: "tableHeader" },
        { text: "Statut", style: "tableHeader" },
      ],
      ...unitsRows,
      [
        { text: "SYNTHÈSE — SIGNATURE — AUTHENTIFICATION", colSpan: 5, style: "sectionRow", fillColor: "#E5E7EB", margin: [0, 10, 0, 2] },
        "",
        "",
        "",
        "",
      ],
      [
        {
          colSpan: 5,
          columns: [
            {
              width: "*",
              stack: [
                { text: "Synthèse", style: "sectionLabel", margin: [0, 0, 0, 2] },
                summaryTable,
              ],
            },
            {
              width: 200,
              stack: [
                {
                  columns: [
                    { width: 78, qr: this.payload.verificationUrl, fit: 64, alignment: "left" },
                    {
                      width: "*",
                      stack: [
                        { text: "Authentification", style: "sectionLabel", margin: [0, 0, 0, 2], alignment: "left" },
                        { text: `Fait à Kinshasa, le ${today.toUpperCase()}`, fontSize: 8.2, color: "#6B7280", alignment: "left" },
                      ],
                      margin: [6, 0, 0, 0],
                    },
                  ],
                  margin: [0, 0, 0, 8],
                },
                { text: "Signature & cachet", style: "sectionLabel", alignment: "center", margin: [0, 0, 0, 8] },
                {
                  canvas: [{ type: "line", x1: 0, y1: 0, x2: 160, y2: 0, lineWidth: 0.7, lineColor: "#9CA3AF" }],
                  margin: [20, 30, 20, 0],
                },
                { text: "Le Chef de section", alignment: "center", fontSize: 8.5, margin: [0, 14, 0, 2] },
                { text: getChefSignatory(), alignment: "center", bold: true, fontSize: 9.5 },
              ],
            },
          ],
          margin: [0, 1, 0, 1],
        },
        "",
        "",
        "",
        "",
      ],
    ];

    docDefinition.content = [
      {
        table: {
          headerRows: 0,
          widths: [55, "*", 30, 45, 35],
          body: outerTableBody,
        },
        layout: {
          hLineColor: () => "#111827",
          vLineColor: () => "#111827",
          hLineWidth: (i: number, node: { table?: { body?: unknown[] } }) => {
            const rows = node.table?.body?.length ?? 0;
            if (i === 0 || i === rows) return 1.2;
            return 0.35;
          },
          vLineWidth: (i: number, node: { table?: { widths?: unknown[] } }) => {
            const cols = (node.table?.widths as unknown[] | undefined)?.length ?? 0;
            if (i === 0 || i === cols) return 1.2;
            return 0.35;
          },
          paddingLeft: () => 4,
          paddingRight: () => 4,
          paddingTop: () => 2.5,
          paddingBottom: () => 2.5,
        },
      },
    ];

    return docDefinition;
  }
}
