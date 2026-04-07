import { Document, type PdfDocumentDefinition } from "@/lib/documents/Document";
import { buildDocumentHeader } from "@/lib/documents/layout";

export type DocumentCommandeBonPayload = {
  orderNumber: string;
  productLabel: string;
  categoryLabel: string;
  student: {
    fullName: string;
    email: string | null;
    telephone: string | null;
  };
  amount: number;
  description: string | null;
  status: string;
  createdAt: string;
};

const formatMoney = (value: number) =>
  new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);

export class DocumentCommandeBon extends Document<DocumentCommandeBonPayload> {
  info() {
    return {
      title: `Bon de commande ${this.payload.orderNumber}`,
      author: "Dashboard Agents",
      subject: "Bon de commande",
      keywords: "commande, paiement, bon, facture",
    };
  }

  reference() {
    return null;
  }

  student() {
    return null;
  }

  async content(docDefinition: PdfDocumentDefinition) {
    const issueDate = new Intl.DateTimeFormat("fr-FR", { dateStyle: "full", timeStyle: "short" }).format(new Date(this.payload.createdAt));
    const header = await buildDocumentHeader({
      serviceLabel: "Bon de commande",
      right: {
        variant: "simple",
        title: `Commande ${this.payload.orderNumber}`,
        subtitle: "Facture pro forma",
        dateLabel: issueDate,
      },
    });

    docDefinition.content = [
      header,
      {
        text: "BON DE COMMANDE",
        style: "title",
        margin: [0, 20, 0, 16],
      },
      {
        columns: [
          {
            width: "*",
            stack: [
              { text: "Facture a", style: "sectionLabel" },
              { text: this.payload.student.fullName, bold: true },
              { text: this.payload.student.email ?? "Email non renseigne", margin: [0, 2, 0, 0] },
              { text: this.payload.student.telephone ?? "Telephone non renseigne", margin: [0, 2, 0, 0] },
            ],
          },
          {
            width: 220,
            table: {
              widths: [95, "*"],
              body: [
                ["OrderNumber", this.payload.orderNumber],
                ["Statut", this.payload.status.toUpperCase()],
                ["Categorie", this.payload.categoryLabel],
              ],
            },
            layout: "lightHorizontalLines",
          },
        ],
        columnGap: 18,
        margin: [0, 0, 0, 20],
      },
      {
        table: {
          headerRows: 1,
          widths: ["*", 85, 110],
          body: [
            [
              { text: "Designation", bold: true, fillColor: "#F3F4F6" },
              { text: "Qte", bold: true, fillColor: "#F3F4F6", alignment: "center" },
              { text: "Montant", bold: true, fillColor: "#F3F4F6", alignment: "right" },
            ],
            [this.payload.productLabel, { text: "1", alignment: "center" }, { text: formatMoney(this.payload.amount), alignment: "right" }],
          ],
        },
        layout: "lightHorizontalLines",
      },
      {
        columns: [
          { width: "*", text: "" },
          {
            width: 220,
            table: {
              widths: [90, "*"],
              body: [
                [{ text: "Total", bold: true }, { text: formatMoney(this.payload.amount), alignment: "right", bold: true }],
              ],
            },
            layout: "lightHorizontalLines",
          },
        ],
        margin: [0, 12, 0, 0],
      },
      {
        text: this.payload.description ?? "Commande academique generee depuis l'application.",
        margin: [0, 16, 0, 0],
        color: "#4B5563",
      },
    ];

    return docDefinition;
  }
}
