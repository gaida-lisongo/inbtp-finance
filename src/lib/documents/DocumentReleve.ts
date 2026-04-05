import { Document, type PdfDocumentDefinition, type ReferenceItem } from "@/lib/documents/Document";
import { getSchoolPdfBrandingAssets } from "@/lib/assets/asset-images.server";

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
      { text: "RELEVE DE COTES", style: "title", margin: [0, 30, 0, 20] },
      { text: "Modele initialise. Le detail des cours et cotes sera branche dans une prochaine passe." },
    ];

    return docDefinition;
  }
}
