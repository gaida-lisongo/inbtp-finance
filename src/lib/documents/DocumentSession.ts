import { Document, type PdfDocumentDefinition, type ReferenceItem, type StudentDocumentIdentity } from "@/lib/documents/Document";
import { buildOfficialDocumentHeader } from "@/lib/documents/layout";

export type DocumentSessionMatiere = {
  matiere: string;
  dateEpreuve: string;
};

export type DocumentSessionPayload = {
  sessionTitle: string;
  sessionPeriod: {
    start: string | null;
    end: string | null;
  };
  amount: number | null;
  student: StudentDocumentIdentity;
  orderReference: string;
  matieres: DocumentSessionMatiere[];
  verificationUrl: string | null;
};

const formatDate = (value: string | null) => {
  if (!value) {
    return "Non renseignee";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" }).format(parsed);
};

const formatAmount = (value: number | null) => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "Non renseigne";
  }

  return `${value} USD`;
};

export class DocumentSession extends Document<DocumentSessionPayload> {
  info() {
    return {
      title: `Macaron session - ${this.payload.student.fullName}`,
      author: "Dashboard Agents",
      subject: "Macaron etudiant session",
      keywords: "session, macaron, invoice, qr, etudiant",
    };
  }

  reference(data: ReferenceItem[] = []) {
    return {
      table: {
        widths: [140, "*"],
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
        widths: [140, "*"],
        body: [
          ["Nom complet", this.payload.student.fullName],
          ["Email", this.payload.student.email ?? "Non renseigne"],
          ["Telephone", this.payload.student.telephone ?? "Non renseigne"],
        ],
      },
      layout: "lightHorizontalLines",
    };
  }

  async content(docDefinition: PdfDocumentDefinition) {
    const today = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" }).format(new Date());
    const header = await buildOfficialDocumentHeader({ dateLabel: today });
    const periodLabel = `${formatDate(this.payload.sessionPeriod.start)} au ${formatDate(this.payload.sessionPeriod.end)}`;
    const matieres =
      this.payload.matieres.length > 0
        ? this.payload.matieres
        : [{ matiere: "Aucune matiere renseignee", dateEpreuve: "-" }];
    const matieresBody = [
      [
        { text: "Matiere", bold: true, fillColor: "#F3F4F6" },
        { text: "Date d'epreuve", bold: true, fillColor: "#F3F4F6" },
      ],
      ...matieres.map((item) => [item.matiere, item.dateEpreuve]),
    ];

    docDefinition.content = [
      ...header,
      { text: "MACARON ETUDIANT - SESSION", style: "title", margin: [0, 34, 0, 20] },
      this.reference([
        { label: "Reference", value: this.payload.orderReference },
        { label: "Session", value: this.payload.sessionTitle },
        { label: "Periode", value: periodLabel },
        { label: "Montant", value: formatAmount(this.payload.amount) },
        { label: "Statut", value: "Etudiant en ordre" },
      ]),
      { text: "", margin: [0, 10, 0, 10] },
      { text: "Etudiant concerne", style: "sectionLabel" },
      this.student(),
      {
        margin: [0, 24, 0, 10],
        text: [
          "Le present macaron atteste que l'etudiant ",
          { text: this.payload.student.fullName, bold: true },
          " est en ordre pour la session ",
          { text: this.payload.sessionTitle, bold: true },
          ".",
        ],
        alignment: "justify",
      },
      { text: "Matieres et dates d'epreuve", style: "sectionLabel", margin: [0, 6, 0, 6] },
      {
        table: {
          widths: ["*", 140],
          body: matieresBody,
        },
        layout: "lightHorizontalLines",
      },
      ...(this.payload.verificationUrl
        ? [
            {
              columns: [
                {
                  width: "*",
                  stack: [
                    { text: "Verification publique", style: "sectionLabel" },
                    {
                      text: "Le QR code ci-contre permet de verifier l'authenticite du macaron (commande payee).",
                      margin: [0, 0, 0, 8],
                    },
                    { text: this.payload.verificationUrl, color: "#2563EB", fontSize: 9 },
                  ],
                },
                {
                  width: 140,
                  qr: this.payload.verificationUrl,
                  fit: 120,
                  alignment: "right",
                },
              ],
              margin: [0, 20, 0, 0],
            },
          ]
        : []),
    ];
    return docDefinition;
  }
}
