import { Document, type PdfDocumentDefinition, type ReferenceItem } from "@/lib/documents/Document";

export class DocumentValidate extends Document<Record<string, unknown>> {
  info() {
    return {
      title: "Fiche de validation",
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
    docDefinition.content = [{ text: "DocumentValidate sera implemente dans une prochaine passe." }];
    return docDefinition;
  }
}
