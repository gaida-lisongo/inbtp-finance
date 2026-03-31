import { Document, type PdfDocumentDefinition, type ReferenceItem } from "@/lib/documents/Document";

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

  content(docDefinition: PdfDocumentDefinition) {
    docDefinition.content = [{ text: "DocumentSession sera implemente dans une prochaine passe." }];
    return docDefinition;
  }
}
