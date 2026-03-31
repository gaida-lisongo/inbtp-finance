import { Document, type PdfDocumentDefinition, type ReferenceItem, type StudentDocumentIdentity } from "@/lib/documents/Document";

type StageRecipientSex = "M" | "F";

export type DocumentStagePayload = {
  stageTitle: string;
  student: StudentDocumentIdentity;
  recipientName: string;
  recipientQuality: string;
  recipientSex: StageRecipientSex;
};

const getRecipientTitle = (sex: StageRecipientSex) => (sex === "F" ? "Madame" : "Monsieur");

export class DocumentStage extends Document<DocumentStagePayload> {
  info() {
    return {
      title: `Lettre de stage - ${this.payload.student.fullName}`,
      author: "Dashboard Agents",
      subject: "Lettre de recommandation de stage",
      keywords: "stage, lettre, etudiant, recommandation",
    };
  }

  reference(data: ReferenceItem[] = []) {
    return {
      stack: [
        { text: "Universite", bold: true },
        { text: "Reference documentaire", margin: [0, 8, 0, 0] },
        ...data.map((item) => ({
          columns: [
            { text: item.label, width: 130, color: "#6B7280" },
            { text: item.value, bold: true },
          ],
          margin: [0, 4, 0, 0],
        })),
      ],
    };
  }

  student() {
    return {
      stack: [
        { text: "Etudiant concerne", style: "sectionLabel" },
        {
          table: {
            widths: [130, "*"],
            body: [
              ["Nom complet", this.payload.student.fullName],
              ["Email", this.payload.student.email ?? "Non renseigne"],
              ["Telephone", this.payload.student.telephone ?? "Non renseigne"],
            ],
          },
          layout: "lightHorizontalLines",
        },
      ],
    };
  }

  content(docDefinition: PdfDocumentDefinition) {
    const today = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" }).format(new Date());
    const recipientTitle = getRecipientTitle(this.payload.recipientSex);

    docDefinition.content = [
      {
        columns: [
          {
            width: "*",
            stack: [
              { text: "UNIVERSITE", bold: true, fontSize: 14 },
              { text: "Direction des affaires academiques", margin: [0, 6, 0, 0] },
            ],
          },
          {
            width: 220,
            stack: [
              { text: `${recipientTitle} ${this.payload.recipientName}`, alignment: "right", bold: true },
              { text: this.payload.recipientQuality, alignment: "right", margin: [0, 4, 0, 0] },
              { text: today, alignment: "right", margin: [0, 12, 0, 0] },
            ],
          },
        ],
      },
      { text: "LETTRE DE RECOMMANDATION DE STAGE", style: "title", margin: [0, 36, 0, 24] },
      this.reference([
        { label: "Objet", value: "Recommandation pour stage academique" },
        { label: "Section", value: this.payload.stageTitle },
      ]),
      { text: "", margin: [0, 8, 0, 8] },
      this.student(),
      {
        text: [
          "Par la presente, nous vous recommandons l'etudiant ",
          { text: this.payload.student.fullName, bold: true },
          " pour un stage academique dans le cadre de la section ",
          { text: this.payload.stageTitle, bold: true },
          ".",
        ],
        margin: [0, 28, 0, 12],
        alignment: "justify",
      },
      {
        text: "Nous vous serions reconnaissants de bien vouloir lui accorder un accueil favorable afin de lui permettre de completer sa formation pratique dans les meilleures conditions.",
        margin: [0, 0, 0, 12],
        alignment: "justify",
      },
      {
        text: "Cette lettre constitue une base de generation initiale et pourra etre enrichie selon les besoins de la filiere et de l'administration.",
        margin: [0, 0, 0, 28],
        alignment: "justify",
      },
      {
        columns: [
          { width: "*", text: "" },
          {
            width: 220,
            stack: [
              { text: "Pour l'administration academique", bold: true, alignment: "center" },
              { text: "Signature et cachet", margin: [0, 42, 0, 0], alignment: "center", color: "#6B7280" },
            ],
          },
        ],
      },
    ];

    return docDefinition;
  }
}
