import { getSchoolPdfBrandingAssets } from "@/lib/assets/asset-images.server";

type HeaderRecipientRight = {
  variant: "recipient";
  recipientName: string;
  recipientQuality: string;
  dateLabel: string;
};

type HeaderSimpleRight = {
  variant: "simple";
  title?: string;
  subtitle?: string;
  dateLabel?: string;
};

type DocumentHeaderInput = {
  serviceLabel?: string;
  right: HeaderRecipientRight | HeaderSimpleRight;
};

type OfficialHeaderInput = {
  dateLabel: string;
  sectionLabel?: string | null;
  referenceValue?: string | null;
};

export const getSchoolName = () => process.env.NEXT_PUBLIC_SCHOOL_NAME?.trim() || "INSTITUT SUPERIEUR";
export const getInstitutSigle = () => process.env.NEXT_PUBLIC_INSTITUT?.trim() || "INBTP";
export const getContact = () => process.env.NEXT_PUBLIC_CONTACT?.trim() || "Non renseigne";
export const getEmail = () => process.env.NEXT_PUBLIC_EMAIL?.trim() || "Non renseigne";
export const getAddress = () => process.env.NEXT_PUBLIC_ADRESS?.trim() || "Non renseigne";
export const getChef = () => process.env.NEXT_PUBLIC_CHEF || 'Non renseigne';
const buildRightStack = (right: DocumentHeaderInput["right"]) => {
  if (right.variant === "recipient") {
    return [
      { text: right.recipientName, alignment: "right", bold: true },
      { text: right.recipientQuality, alignment: "right", margin: [0, 4, 0, 0] },
      { text: right.dateLabel, alignment: "right", margin: [0, 12, 0, 0] },
    ];
  }

  const stack: unknown[] = [];

  if (right.title) {
    stack.push({ text: right.title, alignment: "right", bold: true, fontSize: 12 });
  }

  if (right.subtitle) {
    stack.push({ text: right.subtitle, alignment: "right", margin: [0, 4, 0, 0] });
  }

  if (right.dateLabel) {
    stack.push({ text: right.dateLabel, alignment: "right", margin: [0, 8, 0, 0] });
  }

  return stack;
};

export const buildDocumentHeader = async ({ serviceLabel, right }: DocumentHeaderInput) => {
  const { schoolLogo, drcFlag } = await getSchoolPdfBrandingAssets();
  const schoolName = getSchoolName();
  const institutSigle = getInstitutSigle();

  return {
    columns: [
      {
        width: "*",
        stack: [
          { image: schoolLogo, fit: [120, 60], margin: [0, 0, 0, 6] },
          { text: schoolName.toUpperCase(), bold: true, fontSize: 12 },
          { text: `Sigle: ${institutSigle}`, margin: [0, 4, 0, 0], bold: true },
          ...(serviceLabel ? [{ text: serviceLabel, margin: [0, 6, 0, 0] }] : []),
        ],
      },
      {
        width: 220,
        stack: [
          { image: drcFlag, fit: [52, 34], alignment: "right", margin: [0, 0, 0, 8] },
          ...buildRightStack(right),
        ],
      },
    ],
  };
};

export const buildOfficialDocumentHeader = async ({ dateLabel, sectionLabel, referenceValue }: OfficialHeaderInput) => {
  const { schoolLogo, drcFlag } = await getSchoolPdfBrandingAssets();
  const schoolName = getSchoolName();
  const institutSigle = getInstitutSigle();
  const section = sectionLabel?.trim() || process.env.NEXT_PUBLIC_SECTION || "Non renseignee";
  const reference =
    referenceValue?.trim() ||
    `${process.env.NEXT_PUBLIC_SECTION_REF ?? "INBTP/SBTP/"}${new Date().getTime().toString().slice(-6)}/${new Date().getFullYear()}`;

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
            { text: "Republique Democratique du Congo", alignment: "center", fontSize: 8, color: "#6B7280" },
            {
              text: "Ministere de l'Enseignement Superieur, Universitaire, Recherche Scientifique et Innovations",
              margin: [0, 2, 4, 0],
              fontSize: 9,
              alignment: "center",
            },
            { text: schoolName.toUpperCase(), bold: true, fontSize: 10, alignment: "center" },
            { text: institutSigle, fontSize: 10, alignment: "center" },
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
        },
      ],
    },
    {
      table: {
        widths: ["*", "*"],
        body: [
          [{ text: `Section : ${section}`, color: "#29a4fb", fontSize: 10, bold: true, margin: [0, 0, 0, 6] }, ""],
          [
            {
              text: `N/Ref: ${reference}`,
              fontSize: 10,
              bold: true,
              margin: [0, 20, 0, 6],
            },
            {
              text: `Kinshasa, le ${dateLabel.toUpperCase()}`,
              alignment: "right",
              margin: [0, 20, 0, 6],
              fontSize: 10,
              color: "#6B7280",
            },
          ],
        ],
      },
      layout: {
        hLineWidth: (i: number) => (i === 0 ? 1 : 0),
        vLineWidth: () => 0,
      },
      margin: [0, 0, 0, 32],
    },
  ];
};

export const buildDocumentFooter = () => {
  const contact = getContact();
  const email = getEmail();
  const address = getAddress();

  return (currentPage: number, pageCount: number) => ({
    margin: [48, 0, 48, 24],
    stack: [
      {
        canvas: [
          {
            type: "line",
            x1: 0,
            y1: 0,
            x2: 515,
            y2: 0,
            lineWidth: 0.5,
            lineColor: "#D1D5DB",
          },
        ],
      },
      {
        columns: [
          {
            text: `Contact: ${contact}`,
            margin: [0, 6, 0, 0],
            fontSize: 8,
            color: "#6B7280",
          },
          {
            stack: [
              `Email: ${email}`,
              `Adresse: ${address}`
            ],
            alignment: "right",
            margin: [0, 6, 0, 0],
            fontSize: 8,
            color: "#6B7280",
          },
        ],
      },
    ],
  });
};
