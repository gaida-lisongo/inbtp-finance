import { Document, type PdfDocumentDefinition, type ReferenceItem, type StudentDocumentIdentity } from "@/lib/documents/Document";
import { buildOfficialDocumentHeader } from "@/lib/documents/layout";

export type DocumentSujetPayload = {
  title: string;
  director: string;
  coDirector?: string | null;
  student: StudentDocumentIdentity;
};

export class DocumentSujet extends Document<DocumentSujetPayload> {
  info() {
    return {
      title: `Page de garde - ${this.payload.title}`,
      author: "Dashboard Agents",
      subject: "Page de garde du sujet de recherche",
      keywords: "sujet, recherche, page de garde",
    };
  }

  reference(data: ReferenceItem[] = []) {
    return data;
  }

  student() {
    return null;
  }

  async content(docDefinition: PdfDocumentDefinition) {
    const today = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" }).format(new Date());
    const header = await buildOfficialDocumentHeader({ dateLabel: today });
    const coDirector = this.payload.coDirector?.trim();

    docDefinition.content = [
      ...header,
      { text: "PAGE DE GARDE", style: "title", margin: [0, 36, 0, 8] },
      { text: "SUJET DE RECHERCHE", style: "title", margin: [0, 0, 0, 34] },
      {
        text: this.payload.title,
        fontSize: 16,
        bold: true,
        alignment: "center",
        margin: [24, 0, 24, 40],
      },
      {
        table: {
          widths: [170, "*"],
          body: [
            ["Etudiant", this.payload.student.fullName],
            ["Directeur", this.payload.director],
            ...(coDirector ? [["Co-directeur", coDirector]] : []),
          ],
        },
        layout: "lightHorizontalLines",
      },
      {
        text: "Document genere automatiquement via le workflow de soumission du sujet de recherche.",
        margin: [0, 24, 0, 0],
        fontSize: 9,
        color: "#6B7280",
        alignment: "center",
      },
    ];

    return docDefinition;
  }
}
