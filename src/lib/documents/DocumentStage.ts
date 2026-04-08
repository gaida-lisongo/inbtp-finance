import { Document, type PdfDocumentDefinition, type ReferenceItem, type StudentDocumentIdentity } from "@/lib/documents/Document";
import { buildOfficialDocumentHeader } from "@/lib/documents/layout";
import { getChefSignatory, getInstitutSigle } from "@/lib/documents/signatory";

type StageRecipientSex = "M" | "F" | "N";

export type DocumentStagePayload = {
  stageTitle: string;
  student: StudentDocumentIdentity;
  recipientName: string;
  recipientQuality: string;
  recipientSex: StageRecipientSex;
  companyName?: string | null;
  companyLocation?: string | null;
  documentReference?: string | null;
};

const buildQrPayload = (payload: DocumentStagePayload, issuedAt: string) =>
  JSON.stringify({
    type: "lettre_recommandation_stage",
    etudiant: payload.student.fullName,
    section: payload.stageTitle,
    reference: payload.documentReference ?? null,
    date_emission: issuedAt,
    signataire: getChefSignatory(),
    institut: getInstitutSigle(),
  });

export const buildStageLetterContent = async (payload: DocumentStagePayload) => {
  const today = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" }).format(new Date());
  const chefSignatory = getChefSignatory();
  const qrPayload = buildQrPayload(payload, today);
  const header = await buildOfficialDocumentHeader({ dateLabel: today });

  return [
    ...header,
    {
      table: {
        widths: [220, "*", 220],
        body: [
          [
            {
              text: 'Objet : Recommandation de Stage',
              fontSize: 12,
              bold: true,
              margin: [0, 0, 0, 10],
            },
            '',
            {
              text: `A ${payload.recipientSex == "F" ? "Madame " : payload.recipientSex == "M" ? "Monsieur " : "A qui de droit"}${payload.recipientName}, ${payload.recipientQuality} de la ${payload.companyName}\nà ${payload.companyLocation}`,
              alignment: "left",
              margin: [0, 0, 0, 10],
            },
          ],
          [
            '',
            '',
            `${payload.recipientSex === "F" ? 'Madame le ' : 'Monsieur le' } ${payload.recipientQuality},`,
          ]
        ]
      },
      //noBorder
      layout: {
        hLineWidth: () => 0,
        vLineWidth: () => 0,
      },
    },
    {
      stack: [
        {
          text: [
            "Nous avons l'honneur de vous recommander l'etudiant ",
            { text: payload.student.fullName, bold: true },
            " pour un ",
            { text: payload.stageTitle, bold: true },
            "d'un (1) mois au sein de votre entreprise. Nous sommes convaincus que votre cadre lui permettra d'appliquer les connaissances acquises afin d'affiner plus efficacement le noble metiers d'ingenieur.",
          ],
          margin: [0, 0, 0, 12],
          alignment: "justify",
        },
        {
          text: "Nous aimerons obtenir, au terme de ce stage et sous pli fermé, les notes qui lui seront attribuées suivant le modèle de fiche qui vous sera envoyé ultérieurement.",
          margin: [0, 0, 0, 12],
          alignment: "justify",
        },
        {
          text: [
            "Tout en vous remerciant d'avance de votre franche collaboration, nous vous prions d'agréer, ",
            payload.recipientSex === "F" ? 'Madame le ' : 'Monsieur le',
            ` ${payload.recipientQuality}, l'expression de nos salutations distinguées.`,
          ],
          margin: [0, 0, 0, 28],
          alignment: "justify",
        },
      ],
    },
    {
      columns: [
        { width: 220, 
          stack: [''],
        },
        {
          width: "*",
          stack: [
            { text: "Le Chef de Section", bold: true, alignment: "center" },
            { text: chefSignatory, alignment: "center", margin: [0, 14, 0, 0], bold: true },
          ],
        },
      ],
      margin: [0, 30, 0, 0],
    },
    {
      stack: [
        { qr: qrPayload, fit: 150, alignment: "left" },
        { text: "Scan de verification", fontSize: 8, alignment: "left", margin: [10, 4, 0, 0], color: "#6B7280" },
      ], 
    }
  ];
};

export class DocumentStage extends Document<DocumentStagePayload> {
  info() {
    return {
      title: `Lettre de stage - ${this.payload.student.fullName}`,
      author: "Dashboard Agents",
      subject: "Lettre de recommandation de stage",
      keywords: "stage, lettre, etudiant, recommandation",
    };
  }

  reference(data: ReferenceItem[] = []) {
    return {
      stack: [
        { text: "Universite", bold: true },
        { text: "Reference documentaire", margin: [0, 8, 0, 0] },
        ...data.map((item) => ({
          columns: [
            { text: item.label, width: 130, color: "#6B7280" },
            { text: item.value, bold: true },
          ],
          margin: [0, 4, 0, 0],
        })),
      ],
    };
  }

  student() {
    return {
      stack: [
        { text: "Etudiant concerne", style: "sectionLabel" },
        {
          table: {
            widths: [130, "*"],
            body: [
              ["Nom complet", this.payload.student.fullName],
              ["Email", this.payload.student.email ?? "Non renseigne"],
              ["Telephone", this.payload.student.telephone ?? "Non renseigne"],
            ],
          },
          layout: "lightHorizontalLines",
        },
      ],
    };
  }

  async content(docDefinition: PdfDocumentDefinition) {
    docDefinition.content = await buildStageLetterContent(this.payload);

    return docDefinition;
  }
}
