import { Document, type PdfDocumentDefinition, type ReferenceItem } from "@/lib/documents/Document";
import { buildOfficialDocumentHeader } from "@/lib/documents/layout";

export class DocumentSession extends Document<Record<string, unknown>> {
  info() {
    return {
      title: "Document de session",
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

    docDefinition.content = [...header, { text: "DocumentSession sera implemente dans une prochaine passe." }];
    return docDefinition;
  }
}
