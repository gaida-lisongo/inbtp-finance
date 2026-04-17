import Document from "./Document";

export type DocumentLaboratoirePayload = {
  student?: {
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
  laboratoire: {
    designation: string;
    montant: number | null;
    description?: string;
  };
  verificationUrl: string;
};

class DocumentLaboratoire extends Document {
  private student: { nom: string; sexe: string; ville: string } = {
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
    type: "Autorisation de laboratoire",
    ressource: "Laboratoire",
    detail: "Document d'autorisation d'acces au laboratoire",
    reference: "LAB-0001",
    dateCreate: "01/01/2026",
  };

  private laboratoire: DocumentLaboratoirePayload["laboratoire"] = {
    designation: "Laboratoire",
    montant: null,
  };

  private verificationUrl = "";

  constructor(payload: DocumentLaboratoirePayload | null = null) {
    super();

    if (payload) {
      this.parseData(payload);
    }
  }

  parseData(data: DocumentLaboratoirePayload) {
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
    this.laboratoire = {
      ...this.laboratoire,
      ...data.laboratoire,
    };
    this.verificationUrl = data.verificationUrl;
  }

  private infoTable(rows: Array<[string, string]>) {
    return {
      table: {
        widths: [110, "*"],
        body: rows.map(([label, value]) => [
          { text: label, color: "#6B7280", margin: [0, 3, 0, 3] },
          { text: value, bold: true, margin: [0, 3, 0, 3] },
        ]),
      },
      layout: "lightHorizontalLines",
    };
  }

  async generate() {
    await this.background();
    await this.buildFooter(this.verificationUrl);

    await this.adminLayout([
      [
        {
          text: `AUTORISATION DE LABORATOIRE\nN/Réf ` + `INBTP/BTP/LAB/${(new Date).getFullYear()}/${(Date.now()).toString().slice(-5)}`,
          style: "title",
          alignment: "center",
          colSpan: 3,
          margin: [0, 0, 0, 8],
        },
        "",
        "",
      ],
      [
        {
          text: `Document émis le ${this.document.dateCreate}`,
          alignment: "center",
          colSpan: 3,
          margin: [0, 0, 0, 16],
          border: [false, false, false, false],
        },
        "",
        "",
      ],
      [
        {
          text: [
            "La présente autorisation confirme que l'étudiant ",
            { text: this.student.nom, bold: true }, ", matriculé ", {bold: true, text: this.parcour.matricule}, ",",
            " est en ordre pour accéder au laboratoire ",
            { text: this.laboratoire.designation, bold: true },
            ".",
          ],
          colSpan: 3,
          margin: [0, 0, 0, 14],
          border: [false, false, false, false],
        },
        "",
        "",
      ],
      [
        {
          stack: [
            { text: "Laboratoire", style: "subtitle", margin: [0, 0, 0, 6] },
            this.infoTable([
              ["Designation", this.laboratoire.designation],
              ["Montant", typeof this.laboratoire.montant === "number" ? `${this.laboratoire.montant} USD` : "Non renseigne"],
              ["Detail", this.document.detail],
            ]),
          ],
          colSpan: 3,
          border: [false, false, false, false],
          margin: [0, 0, 0, 14],
        },
        "",
        "",
      ],
      [
        {
          columns: [
            {
              width: "*",
              text: ''
            },
            {
              width: "*",
              stack: [
                { text: "Parcours", style: "subtitle", margin: [0, 0, 0, 6] },
                this.infoTable([
                  ["Promotion", this.parcour.promotion],
                  ["Systeme", this.parcour.systeme],
                  ["Annee", this.parcour.annee],
                ]),
              ],
            },
          ],
          colSpan: 3,
          border: [false, false, false, false],
        },
        "",
        "",
      ],
    ]);
  }
}

export default DocumentLaboratoire;
