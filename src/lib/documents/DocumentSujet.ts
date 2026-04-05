import { Document, type PdfDocumentDefinition, type ReferenceItem } from "@/lib/documents/Document";
import { getSchoolPdfBrandingAssets } from "@/lib/assets/asset-images.server";

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
    const { schoolLogo, drcFlag } = await getSchoolPdfBrandingAssets();

    docDefinition.content = [
      {
        columns: [
          {
            width: "*",
            stack: [
              { image: schoolLogo, fit: [120, 60], margin: [0, 0, 0, 6] },
              { text: "UNIVERSITE", bold: true, fontSize: 14 },
            ],
          },
          {
            width: 180,
            image: drcFlag,
            fit: [52, 34],
            alignment: "right",
          },
        ],
      },
      { text: "PAGE DE GARDE - TRAVAIL DE RECHERCHE", style: "title", margin: [0, 30, 0, 20] },
      { text: "Modele initialise. Les donnees du sujet seront injectees dans une prochaine passe." },
    ];

    return docDefinition;
  }
}
