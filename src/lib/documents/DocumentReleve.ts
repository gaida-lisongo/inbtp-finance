import { Document, type PdfDocumentDefinition, type ReferenceItem } from "@/lib/documents/Document";

export class DocumentReleve extends Document<Record<string, unknown>> {
  info() {
    return {
      title: "Releve de cotes",
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
    docDefinition.content = [{ text: "DocumentReleve sera implemente dans une prochaine passe." }];
    return docDefinition;
  }
}
