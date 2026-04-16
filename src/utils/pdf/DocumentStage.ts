import { type DocumentStagePayload } from "@/lib/documents/stage-letter";
import Document from "./Document";
import { StudentDocumentIdentity } from "@/lib/documents/Document";

type Lettre = {
    type: string, 
    ressource: string, 
    destinataire: string, 
    quality: string, 
    sexe: string, 
    entreprise: string, 
    localisation: string,
    reference: string
}

class DocumentStage extends Document {
    document: Lettre | null;
    student: StudentDocumentIdentity | null;

    constructor(data: DocumentStagePayload | null = null){
        super();

        this.document = null;
        this.student = null;

        if(data){
            this.parseData(data);
        }

        this.docDefinition.styles = {
            ...this.docDefinition.styles,
            objet: {
                italics: true,
                bold: true,
                fontSize: this.chart.xs,
                alignment: 'right',
                lineHeight: 1 // 👈 au lieu de 1.35 (gros impact)
            },
            destinataire:{
                italics: true,
                fontSize: this.chart.xs,
                alignment: 'left',
            },
            content: {
                
            }
        }

    }

    parseData(data: DocumentStagePayload){
        const reference = `INBTP/${this.getService()}/STG/${(new Date()).getFullYear()}/${(Date.now()).toString().slice(-5)}`
        this.document = {
            type: 'Lettre de stage',
            ressource: data.stageTitle,
            destinataire: data.recipientName,
            quality: data.recipientQuality,
            sexe: data.recipientSex,
            entreprise: data.companyName ?? '',
            localisation: data.companyLocation ?? '',
            reference
        }

        this.student = data.student;

    }

    async generate(payload: string, signature : {
        nom: string,
        titre: string
    }){
        try {
            if(!this.document || !this.student) throw new Error(`Données incomplétes`)
        
            await this.background();
            await this.buildFooter(payload);
            await this.adminLayout([
                [
                    {text: `N/Réf : ${this.document.reference}`, style: 'gras', italics: true, colSpan: 2,
							border: [false, false, false, false]},
                    '',
                    {
							border: [false, false, false, false],text: `Kinshasa, le ${this.getCurrentFrDate()}`, style: 'gras', alignment: 'right', margin: [0, 0, 0, this.chart.xs * 3]},
                ],
                [
                    {
                        text: 'Objet : Recommandation de Stage',
                        style: 'gras',
                        margin: [0, 20, 0, 0],
                        colSpan: 2,
                        border: [false, false, false, false]
                    },
                    '',
                    {
                        stack: [
                            {
                                text: `A ${this.document.sexe == "F" ? "Madame " : this.document.sexe == "M" ? "Monsieur " : "A qui de droit"}${this.document.destinataire}, ${this.document.quality} de la ${this.document.entreprise}\nà ${this.document.localisation}`,
                                alignment: "left",
                                margin: [0, 0, 0, 0],
                            },
                            {
                                canvas: [
                                    {
                                        type: "line",
                                        x1: 0,
                                        y1: 0,
                                        x2: 180,
                                        y2: 0,
                                        lineWidth: 0.8,
                                        lineColor: this.chart.black,
                                    },
                                ],
                                margin: [0, 2, 0, 0],
                            },
                        ],
                        border: [false, false, false, false]
                    },
                ],
                [
                    null,
                    null,
                    {
                        text: `${this.document.sexe === "F" ? 'Madame le ' : 'Monsieur le' } ${this.document.quality},`,
                        margin: [0, this.chart.lg, 0, this.chart.md],
						border: [false, false, false, false]},
                ],
                [
                    {
                    stack: [
                        {
                            text: [
                                "Nous avons l'honneur de vous recommander l'etudiant ",
                                { text: this.student.fullName, bold: true },
                                " pour un ",
                                { text: this.document.ressource, bold: true },
                                "d'un (1) mois au sein de votre entreprise. Nous sommes convaincus que votre cadre lui permettra d'appliquer les connaissances acquises afin d'affiner plus efficacement le noble metiers d'ingenieur.",
                            ],
                            margin: [0, 0, 0, this.chart.md],
                        },
                        {
                        text: "Nous aimerons obtenir, au terme de ce stage et sous pli fermé, les notes qui lui seront attribuées suivant le modèle de fiche qui vous sera envoyé ultérieurement.",
                        margin: [0, 0, 0, this.chart.md],
                        },
                        {
                        text: [
                            "Tout en vous remerciant d'avance de votre franche collaboration, nous vous prions d'agréer, ",
                            this.document.sexe === "F" ? 'Madame le ' : 'Monsieur le',
                            ` ${this.document.quality}, l'expression de nos salutations distinguées.`,
                        ],
                        margin: [0, 0, 0, this.chart.md],
                        },
                    ],
                    colSpan: 3,
							border: [false, false, false, false]
                    },
                    '',
                    ''
                ],
                [
                    '',
                    '',
                    {
                        stack: [
                            { text: signature.nom, style: 'title', alignment: 'center'},
                            { text: signature.titre, italics: true, alignment: 'center'}
                        ],
                        margin: [0, this.chart.lg*5, 0, 0],

							border: [false, false, false, false]
                    }
                ]

            ])   
        } catch (error) {
            console.error("Veuillez remplir tous les données")
        }
    }
}

export default DocumentStage
