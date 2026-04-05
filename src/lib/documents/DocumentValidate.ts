import { Document, type PdfDocumentDefinition, type ReferenceItem } from "@/lib/documents/Document";
import { getSchoolPdfBrandingAssets } from "@/lib/assets/asset-images";

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
    const { schoolLogo, drcFlag } = await getSchoolPdfBrandingAssets();
    const today = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" }).format(new Date());

    docDefinition.content = [
      {
        columns: [
          {
            width: "*",
            stack: [
              { image: schoolLogo, fit: [120, 60], margin: [0, 0, 0, 6] },
              { text: "UNIVERSITE", bold: true, fontSize: 14 },
              { text: "Direction academique", margin: [0, 6, 0, 0] },
            ],
          },
          {
            width: 180,
            stack: [
              { image: drcFlag, fit: [52, 34], alignment: "right", margin: [0, 0, 0, 8] },
              { text: today, alignment: "right" },
            ],
          },
        ],
      },
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
