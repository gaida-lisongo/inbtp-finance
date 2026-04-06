import { Document, type PdfDocumentDefinition, type ReferenceItem } from "@/lib/documents/Document";
import { buildOfficialDocumentHeader } from "@/lib/documents/layout";

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

  async content(docDefinition: PdfDocumentDefinition) {
    const today = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" }).format(new Date());
    const header = await buildOfficialDocumentHeader({ dateLabel: today });

    docDefinition.content = [
      ...header,
      { text: "FICHE DE VALIDATION DES CREDITS", style: "title", margin: [0, 32, 0, 22] },
      {
        text: "Modele de fiche de validation pret pour integration des credits par unite, semestre et decision de jury.",
        margin: [0, 0, 0, 12],
      },
      {
        text: "La prochaine passe branchera les donnees metier dynamiques pour l'etudiant, la promotion et les signatures officielles.",
      },
    ];

    return docDefinition;
  }
}
