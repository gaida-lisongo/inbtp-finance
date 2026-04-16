import Document from "./Document";

type PdfCell = string | number | Record<string, unknown>;
type PdfRow = PdfCell[];

export type ReleveUnitItem = {
    semestre: string;
    code: string;
    designation: string;
    statut: "V" | "NV";
    credit: number;
    moyenne: number;
    elements: Array<{
        designation: string;
        credit: number;
        cc: number;
        examen: number;
        noteSession: number;
        rattrapage: number;
        rachat: number;
        noteFinale: number;
    }>;
};

export type ReleveSummary = {
    ncv: number;
    ncnv: number;
    totalObtenu: number;
    totalMax: number;
    pourcentage: number;
    mention: string;
    decision: string;
};

export type DocumentRelevePayload = {
    studentName: string;
    studentVille: string;
    studentDateNaiss: Date;
    studentEmail: string | null;
    studentPhone: string | null;
    matricule: string;
    programmeName: string;
    anneeAcad: string;
    orderReference: string;
    serialNumber: string;
    units: ReleveUnitItem[];
    summary: ReleveSummary;
    verificationUrl: string;
};

class DocumentReleve extends Document {
    private student: {
        nomComplet: string,
        ville: string,
        dateNaissance: Date,
        matricule: string
    } = {
        nomComplet: 'Godefroid BIMA SANTEY',
        ville: 'KINSHASA',
        dateNaissance: new Date(),
        matricule: 'BTP.026.001'

    };

    private programme: {
        classe: string;
        reference: string;
        annee: string
    } = {
        classe: 'L1-CIB',
        reference: 'INBTP/BTP/RC/026/8456',
        annee: '2024-2025'
    };

    private units: ReleveUnitItem[] = [];

    private summary: ReleveSummary = {
        ncv: 0,
        ncnv: 60,
        totalObtenu : 0.0,
        totalMax: 20 * 60,
        pourcentage: 0.0,
        mention: 'F',
        decision: 'Double'
    };

    constructor(payload: DocumentRelevePayload){
        super();

        if(payload) this.parseData(payload)

        this.docDefinition.styles = {
            ...this.docDefinition.styles,
            tabUnite: {
                italics: true,
                bold: true,
                fontSize: this.chart.xs,
                alignment: 'center',
                lineHeight: 1
            },
            tabEC:{
                italics: true,
                fontSize: this.chart.xs,
                alignment: 'left',
            },
        }

    }

    parseData(data: DocumentRelevePayload){
        this.student = {
            nomComplet: data.studentName,
            ville: data.studentVille,
            dateNaissance: data.studentDateNaiss,
            matricule: data.matricule
        }

        this.programme = {
            classe: data.programmeName,
            reference: data.serialNumber,
            annee: data.anneeAcad
        }

        this.units = data.units

        this.summary = data.summary

    }

    formatCredit = (value: number) =>
        new Intl.NumberFormat("fr-FR", {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2,
        }).format(value);

    formatPercentage = (value: number) =>
        new Intl.NumberFormat("fr-FR", {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2,
        }).format(value);

    formatGrade = (value: number) =>
        new Intl.NumberFormat("fr-FR", {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2,
        }).format(value);

    normalizeSerial = (value: string) => {
        const normalized = (value ?? "").toString().toUpperCase().replace(/[^A-Z0-9]/g, "");
        if (normalized.length >= 14) return normalized.slice(-14);
        return normalized.padStart(14, "0");
    };

    async generate(verificationUrl: string, signature: {
        nom: string,
        titre: string
    }){
        await this.background();
        await this.buildFooter(verificationUrl);
        
        const items: PdfRow[] = (this.units ?? []).map((unit, idx) => {
            const unitRow: PdfRow = [
                {text: String(idx + 1), style: 'tabUnite', color: unit.moyenne < 10 ? this.chart.secondary : this.chart.black},
                {text: unit.code, fontSize: this.chart.xs, italics: true, bold: true, color: unit.moyenne < 10 ? this.chart.secondary : this.chart.black},
                {
                    text: `${unit.designation}`,
                    style: 'tabUnite',
                    alignment: 'left',
                    color: unit.moyenne < 10 ? this.chart.secondary : this.chart.black
                },
                {
                    text: `${this.formatCredit(unit.credit)}`,
                    style: 'tabUnite',
                    color: unit.moyenne < 10 ? this.chart.secondary : this.chart.black,
                },
                {
                    text: `${this.formatGrade(unit.moyenne)}`,
                    style: 'tabUnite',
                    color: unit.moyenne < 10 ? this.chart.secondary : this.chart.black,
                },
            ];
            return unitRow;
        });


        const summaryTable = [
            [
                {
                    text: ('Moyenne générale').toUpperCase(), style: 'tabUnite',
                    colSpan: 3
                },
                '',
                '',
                { text: `${this.formatGrade(this.summary.totalObtenu / Math.max(1, (this.summary.totalMax / 20)))}/20`, style: 'tabUnite', colSpan: 2 },
                ''
            ],
            [
                {
                    text: 'NCV',
                    style: 'tabUnite',
                    colSpan: 3
                },
                '',
                '',
                { text: String(this.summary.ncv), style: 'tabUnite', colSpan: 2 },
                ''
            ],
            [
                {
                    text: 'NCNV',
                    style: 'tabUnite',
                    colSpan: 3
                },
                '',
                '',
                { text: String(this.summary.ncnv), style: 'tabUnite', colSpan: 2 },
                ''
            ],
            [
                {
                    text: 'MENTION',
                    style: 'tabUnite',
                    colSpan: 3
                },
                '',
                '',
                { text: this.summary.mention, style: 'tabUnite', colSpan: 2},
                ''
            ],
            [
                {
                    text: 'DECISION',
                    style: 'tabUnite',
                    colSpan: 3
                },
                '',
                '',
                {
                    text: this.summary.decision,
                    style: 'tabUnite', colSpan: 2,
                    color: this.summary.decision.toLowerCase().includes("admi") ? this.chart.green : this.chart.secondary,
                },
                ''
            ],

        ]


        await this.adminLayout([
            [
                
                {
                    text: `RELEVE DE COTES ${this.programme.classe}\nN/Réf ${this.programme.reference}`,
                    style: 'title',
                    alignment: 'center',
                    colSpan: 3
                },
                "",
                ""
            ],
            [
                {
                    text: [
                        "Je soussigné, ",
                        { text: signature.nom, bold: true },
                        ", ",
                        signature.titre,
                        " ",
                        this.getService(),
                        
                        ", atteste par la présente que l’étudiant(e) ",
                        { text: this.student.nomComplet, bold: true },
                        ", né(e) à ",
                        { text: this.student.ville, bold: true },
                        ", le ",
                        { text: this.student.dateNaissance.toLocaleDateString('fr-FR'), bold: true },
                        ", matricule ",
                        { text: this.student.matricule, bold: true },
                        ", a régulièrement suivi les enseignements du programme de ",
                        { text: this.programme.classe, bold: true },
                        " pour l’année académique ",
                        { text: this.programme.annee, bold: true },
                        ", et a obtenu les résultats consignés dans le présent relevé de cotes."
                    ],
                    margin: [0, this.chart.sm, 0, this.chart.md],
                    alignment: 'justify',
                    lineHeight: 1.2,
                    colSpan: 3,
                    border: [false, false, false, false],
                },
                "",
                ""
            ],
            [
                {
                    colSpan: 3,
                    border: [false, false, false, false],
                    margin: [this.chart.lg, 0, this.chart.lg, 0],
                    table: {
                        headerRows: 1,
                        widths: [ 25, 40, "*", 25, 40],
                        body: [
                            [
                                { text: "N°", style: "tabHeader" },
                                { text: "Code", style: "tabHeader" },
                                { text: "Matière", style: "tabHeader" },
                                { text: "Crédit", style: "tabHeader" },
                                { text: "Moyenne", style: "tabHeader" },
                            ],
                            ...items,
                            ...summaryTable
                        ],
                    },
                },
                "",
                "",
            ],
            [
                {
                    colSpan: 3,
                    border: [false, false, false, false],
                    margin: [0, this.chart.lg * 2, 0, 0],
                    columns: [
                        { width: "*", text: "" },
                        {
                            width: 220,
                            stack: [
                                { text: signature.nom, alignment: "center", margin: [0, 14, 0, 0], bold: true },
                                { text: signature.titre, bold: true, alignment: "center" },
                            ],
                        },
                    ],
                },
                "",
                "",
            ],
        ])

    }
}

export default DocumentReleve;
