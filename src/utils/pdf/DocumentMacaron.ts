import Document from "./Document";

type PdfCell = string | number | Record<string, unknown>;
type PdfRow = PdfCell[];

export type DocumentMacaronMatiereItem = {
  matiere: string;
  dateEpreuve: string;
};

export type DocumentMacaronPayload = {
  student?: {
    profile?: string;
    nom: string;
    sexe: string;
    ville: string;
  };
  parcour?: {
    promotion: string;
    systeme: string;
    matricule: string;
    annee: string;
  };
  contact?: {
    email: string;
    telephone: string;
    adresse: string;
  };
  document?: {
    type: string;
    ressource: string;
    detail: string;
    reference: string;
    dateCreate: string;
    other?: string;
  };
  session: {
    title: string;
    amount: number | null;
    period: {
      start: string | null;
      end: string | null;
    };
  };
  matieres: DocumentMacaronMatiereItem[];
  verificationUrl: string;
};

const formatAmount = (value: number | null) => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "Non renseigne";
  }

  return `${value} USD`;
};

const formatPeriod = (start: string | null, end: string | null) => {
  const format = (value: string | null) => {
    if (!value) return "Non renseignee";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    return new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" }).format(parsed);
  };

  return `${format(start)} au ${format(end)}`;
};

class DocumentMacaron extends Document {
  private student: { profile?: string; nom: string; sexe: string; ville: string } = {
    nom: "Etudiant",
    sexe: "M",
    ville: "Kinshasa",
  };

  private parcour: { promotion: string; systeme: string; matricule: string; annee: string } = {
    promotion: "Promotion",
    systeme: "LMD",
    matricule: "Non renseigne",
    annee: "Non renseignee",
  };

  private contact: { email: string; telephone: string; adresse: string } = {
    email: "Non renseigne",
    telephone: "Non renseigne",
    adresse: "Non renseignee",
  };

  private document: { type: string; ressource: string; detail: string; reference: string; dateCreate: string; other?: string } = {
    type: "Macaron session",
    ressource: "Session academique",
    detail: "Document de participation aux epreuves",
    reference: "MAC-0001",
    dateCreate: "01/01/2026",
  };

  private session: DocumentMacaronPayload["session"] = {
    title: "Session",
    amount: null,
    period: {
      start: null,
      end: null,
    },
  };

  private matieres: DocumentMacaronMatiereItem[] = [];
  private verificationUrl = "";

  constructor(payload: DocumentMacaronPayload | null = null) {
    super();

    if (payload) {
      this.parseData(payload);
    }

    this.docDefinition.styles = {
      ...this.docDefinition.styles,
      tabCell: {
        fontSize: this.chart.xs,
        lineHeight: 1,
        alignment: "center",
      },
      tabCellLeft: {
        fontSize: this.chart.xs,
        lineHeight: 1,
        alignment: "left",
      },
    };
  }

  parseData(data: DocumentMacaronPayload) {
    this.student = {
      ...this.student,
      ...(data.student ?? {}),
    };
    this.parcour = {
      ...this.parcour,
      ...(data.parcour ?? {}),
    };
    this.contact = {
      ...this.contact,
      ...(data.contact ?? {}),
    };
    this.document = {
      ...this.document,
      ...(data.document ?? {}),
    };
    this.session = data.session;
    this.matieres = data.matieres ?? [];
    this.verificationUrl = data.verificationUrl;
  }

  async generate() {
    await this.background();
    await this.buildFooter(this.verificationUrl);

    const tableRows: PdfRow[] = [
      [
        { text: "N°", style: "tabHeader" },
        { text: "Matière", style: "tabHeader" },
        { text: "Date epreuve", style: "tabHeader" },
        { text: "Signature du Surveillant", style: "tabHeader" },
      ],
      ...(this.matieres.length > 0
        ? this.matieres.map((item, index) => [
            { text: String(index + 1), style: "tabCell" },
            { text: item.matiere, style: "tabCellLeft" },
            { text: item.dateEpreuve, style: "tabCell" },
            { text: "................", style: "tabCell" },
          ])
        : [[{ text: "1", style: "tabCell" }, { text: "Aucune matière renseignée", style: "tabCellLeft" }, { text: "-", style: "tabCell" }, { text: "................", style: "tabCell" }]]),
    ];

    await this.studentLayout(
      [
        {
          table: {
            headerRows: 1,
            widths: [15, "*", 50, 100],
            body: tableRows,
          },
        },
      ],
      this.student,
      this.parcour,
      this.contact,
      this.document,
    );
  }
}

export default DocumentMacaron;
