import { Document, type PdfDocumentDefinition, type ReferenceItem, type StudentDocumentIdentity } from "@/lib/documents/Document";
import { getSchoolPdfBrandingAssets } from "@/lib/assets/asset-images.server";
import { text } from "stream/consumers";
import { table, timeStamp } from "console";

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

const getRecipientTitle = (sex: StageRecipientSex) => {
  if (sex === "F") {
    return "Madame";
  }

  if (sex === "M") {
    return "Monsieur";
  }

  return "";
};

const getSchoolName = () => process.env.NEXT_PUBLIC_SCHOOL_NAME?.trim() || "INSTITUT SUPERIEUR";
const getInstitutSigle = () => process.env.NEXT_PUBLIC_INSTITUT?.trim() || "INBTP";
const getChefSignatory = () => process.env.NEXT_PUBLIC_CHEF?.trim() || "Chef de section";

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
  const recipientTitle = getRecipientTitle(payload.recipientSex);
  const recipientLine =
    recipientTitle.length > 0 ? `${recipientTitle} ${payload.recipientName}` : payload.recipientName;
  const { schoolLogo, drcFlag } = await getSchoolPdfBrandingAssets();
  const schoolName = getSchoolName();
  const institutSigle = getInstitutSigle();
  const chefSignatory = getChefSignatory();
  const qrPayload = buildQrPayload(payload, today);

  return [
    {
      columns: [
        {
          width: 50,
          image: schoolLogo,
          fit: [130, 60],
          alignment: "left",
          margin: [0, 0, 0, 6],
        },
        {
          width: "*",
          stack: [
            {text: "République Démocratique du Congo", alignment: "center", fontSize: 8, color: "#6B7280"},
            {text: "Ministère de l'Enseignement Supérieur, Universitaire, Recherche Scientifique et Innovations", margin: [0, 2, 4, 0], fontSize: 9, alignment: "center"},
            { text: schoolName.toUpperCase(), bold: true, fontSize: 10, alignment: "center" },
            { text: `${institutSigle}`, fontSize: 10, alignment: "center" },
            { text: "B.P. 4731 - KINSHASA/NGALIEMA", fontSize: 10, alignment: "center" },
          ],
          margin: [0, 0, 3, 6],
        },
        {
          width: 50,
          image: drcFlag,
          fit: [70, 60],
          alignment: "right",
          margin: [0, 0, 0, 6],
        }
      ]
    },
    {
      table: {
        widths: ["*", "*"],
        body: [
          [
            {text: `Section : ${process.env.NEXT_PUBLIC_SECTION || "Non renseignee"}`, color: "#29a4fb", fontSize: 10, bold: true, margin: [0, 0, 0, 6]},
            ''
          ],
          [
            {
              text: 'N/Réf: ' + (process.env.NEXT_PUBLIC_SECTION_REF ?? "INBTP/SBTP/") + `${(new Date().getTime()).toString().slice(-6)}/` + `${new Date().getFullYear()}`,
              fontSize: 10,
              bold: true,
              margin: [0, 20, 0, 6],
            },
            {
              text: 'Kinshasa, le ' + today.toUpperCase(),
              alignment: "right",
              margin: [0, 20, 0, 6],
              fontSize: 10,
              color: "#6B7280",
            }
          ]
        ]
      },
      layout: {
        hLineWidth: (i: number) => (i === 0 ? 1 : 0),
        vLineWidth: () => 0,
      },
      margin: [0, 0, 0, 32],
    },
  /*   {
      columns: [
        {
          width: "*",
          stack: [
            { image: schoolLogo, fit: [120, 60], margin: [0, 0, 0, 6] },
            { text: schoolName.toUpperCase(), bold: true, fontSize: 12 },
            { text: `Sigle: ${institutSigle}`, margin: [0, 4, 0, 0], bold: true },
            { text: "Direction des affaires academiques", margin: [0, 6, 0, 0] },
          ],
        },
        {
          width: 220,
          stack: [
            { image: drcFlag, fit: [52, 34], alignment: "right", margin: [0, 0, 0, 8] },
            { text: recipientLine, alignment: "right", bold: true },
            { text: payload.recipientQuality, alignment: "right", margin: [0, 4, 0, 0] },
            { text: today, alignment: "right", margin: [0, 12, 0, 0] },
          ],
        },
      ],
    }, */
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
      margin: [0, 0, 0, 12],
    },
    {
      stack: [
        {
          text: [
            "Par la presente, nous vous recommandons l'etudiant ",
            { text: payload.student.fullName, bold: true },
            " pour un stage academique dans le cadre de la section ",
            { text: payload.stageTitle, bold: true },
            ".",
          ],
          margin: [0, 28, 0, 12],
          alignment: "justify",
        },
        {
          text: "Nous vous serions reconnaissants de bien vouloir lui accorder un accueil favorable afin de lui permettre de completer sa formation pratique dans les meilleures conditions.",
          margin: [0, 0, 0, 12],
          alignment: "justify",
        },
        {
          text: "Cette lettre est certifiee par un QR code de verification interne permettant de confirmer l'authenticite du document.",
          margin: [0, 0, 0, 28],
          alignment: "justify",
        },
      ],
    },
    {
      columns: [
        { width: 220, 
          stack: [
            { qr: qrPayload, fit: 150, alignment: "center" },
            { text: "Scan de verification", fontSize: 8, alignment: "center", margin: [0, 4, 0, 0], color: "#6B7280" },
          ],

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
