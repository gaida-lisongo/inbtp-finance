import { Document, type PdfDocumentDefinition, type ReferenceItem } from "@/lib/documents/Document";

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

  content(docDefinition: PdfDocumentDefinition) {
    docDefinition.content = [{ text: "DocumentSujet sera implemente dans une prochaine passe." }];
    return docDefinition;
  }
}
