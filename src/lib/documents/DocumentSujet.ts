import { Document, type PdfDocumentDefinition, type ReferenceItem, type StudentDocumentIdentity } from "@/lib/documents/Document";
import { buildOfficialDocumentHeader } from "@/lib/documents/layout";

export type DocumentSujetPayload = {
  title: string;
  director: string;
  coDirector?: string | null;
  student: StudentDocumentIdentity;
  jury?: Array<{
    membre: string;
    enseignant: string;
  }> | null;
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
    const juryRows =
      this.payload.jury
        ?.map((row) => ({
          membre: row.membre?.trim() ?? "",
          enseignant: row.enseignant?.trim() ?? "",
        }))
        .filter((row) => row.membre.length > 0 && row.enseignant.length > 0) ?? [];

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
      ...(juryRows.length > 0
        ? [
            { text: "Jury", style: "title", margin: [0, 26, 0, 10], fontSize: 13 },
            {
              table: {
                widths: [170, "*"],
                body: [
                  ["Membre", "Enseignant"],
                  ...juryRows.map((row) => [row.membre, row.enseignant]),
                ],
              },
              layout: "lightHorizontalLines",
            },
          ]
        : []),
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
