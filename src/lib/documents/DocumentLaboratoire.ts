import { Document, type PdfDocumentDefinition, type ReferenceItem, type StudentDocumentIdentity } from "@/lib/documents/Document";
import { getSchoolPdfBrandingAssets } from "@/lib/assets/asset-images.server";

export type DocumentLaboratoirePayload = {
  laboratoryTitle: string;
  student: StudentDocumentIdentity;
  verificationUrl: string;
  invoiceNumber: string;
};

export class DocumentLaboratoire extends Document<DocumentLaboratoirePayload> {
  info() {
    return {
      title: `Facture laboratoire - ${this.payload.student.fullName}`,
      author: "Dashboard Agents",
      subject: "Facture et attestation de regularite laboratoire",
      keywords: "laboratoire, facture, qr, authentique",
    };
  }

  reference(data: ReferenceItem[] = []) {
    return {
      table: {
        widths: [130, "*"],
        body: data.map((item) => [
          { text: item.label, color: "#6B7280", margin: [0, 4, 0, 4] },
          { text: item.value, bold: true, margin: [0, 4, 0, 4] },
        ]),
      },
      layout: "noBorders",
    };
  }

  student() {
    return {
      table: {
        widths: [130, "*"],
        body: [
          ["Nom complet", this.payload.student.fullName],
          ["Email", this.payload.student.email ?? "Non renseigne"],
          ["Telephone", this.payload.student.telephone ?? "Non renseigne"],
        ],
      },
      layout: "lightHorizontalLines",
    };
  }

  async content(docDefinition: PdfDocumentDefinition) {
    const today = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" }).format(new Date());
    const { schoolLogo, drcFlag } = await getSchoolPdfBrandingAssets();

    docDefinition.content = [
      {
        columns: [
          {
            width: "*",
            stack: [
              { image: schoolLogo, fit: [120, 60], margin: [0, 0, 0, 6] },
              { text: "UNIVERSITE", bold: true, fontSize: 14 },
              { text: "Service des laboratoires", margin: [0, 6, 0, 0] },
            ],
          },
          {
            width: 180,
            stack: [
              { image: drcFlag, fit: [52, 34], alignment: "right", margin: [0, 0, 0, 8] },
              { text: "FACTURE / ATTESTATION", alignment: "right", bold: true, fontSize: 12 },
              { text: today, alignment: "right", margin: [0, 8, 0, 0] },
            ],
          },
        ],
      },
      { text: "FACTURE DE LABORATOIRE", style: "title", margin: [0, 34, 0, 20] },
      this.reference([
        { label: "Numero", value: this.payload.invoiceNumber },
        { label: "Produit", value: this.payload.laboratoryTitle },
        { label: "Statut", value: "Etudiant en ordre" },
      ]),
      { text: "", margin: [0, 10, 0, 10] },
      { text: "Etudiant concerne", style: "sectionLabel" },
      this.student(),
      {
        margin: [0, 24, 0, 18],
        text: [
          "La presente facture atteste que l'etudiant ",
          { text: this.payload.student.fullName, bold: true },
          " est en ordre pour l'acces au produit de laboratoire ",
          { text: this.payload.laboratoryTitle, bold: true },
          ".",
        ],
        alignment: "justify",
      },
      {
        columns: [
          {
            width: "*",
            stack: [
              { text: "Verification publique", style: "sectionLabel" },
              {
                text: "Le QR code ci-contre permet au charge du laboratoire de verifier l'authenticite du document sans connexion.",
                margin: [0, 0, 0, 8],
              },
              { text: this.payload.verificationUrl, color: "#2563EB", fontSize: 9 },
            ],
          },
          {
            width: 140,
            qr: this.payload.verificationUrl,
            fit: 120,
            alignment: "right",
          },
        ],
      },
    ];

    return docDefinition;
  }
}
