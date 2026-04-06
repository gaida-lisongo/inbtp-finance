import { Document, type PdfDocumentDefinition, type ReferenceItem } from "@/lib/documents/Document";
import { buildOfficialDocumentHeader } from "@/lib/documents/layout";

export class DocumentSujet extends Document<Record<string, unknown>> {
  info() {
    return {
      title: "Document sujet",
      author: "Dashboard Agents",
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

    docDefinition.content = [
      ...header,
      { text: "PAGE DE GARDE - TRAVAIL DE RECHERCHE", style: "title", margin: [0, 30, 0, 20] },
      { text: "Modele initialise. Les donnees du sujet seront injectees dans une prochaine passe." },
    ];

    return docDefinition;
  }
}
