import { PdfDocumentDefinition } from "@/lib/documents/Document";
import { getSchoolPdfBrandingAssets, imageUrlToBase64 } from "@/lib/assets/asset-images.server";
import { createCanvas, loadImage } from 'canvas';
import { getChef, getContact, getEmail } from "@/lib/documents/layout";


export interface Note {
  code: string,
  unite: string,
  credit: number,
  moyenne: number,
  elements: {
    designation: string,
    cc: number,
    examen: number,
    rattrage: number,
    credit: number
  }[]
}

class Document {
    docDefinition: PdfDocumentDefinition;
    private readonly pageMargins: [number, number, number, number] = [48, 56, 48, 86];
    chart: {
        lg: number;
        md: number;
        sm: number;
        xs: number;
        primary: string;
        secondary: string;
        black: string;
        gray: string;
        white: string;
        green: string
    } = {
        lg: 18,
        md: 14,
        sm: 12,
        xs: 8,
        primary: "#058AC5",
        secondary: "#E76067",
        black: "#272826",
        gray: "#D4D6D3",
        white: "#FFFFFF",
        green: "#5ECB44"
    }

    constructor(){
        this.docDefinition = {
            pageSize: "A4",
            pageMargins: this.pageMargins,
            defaultStyle: {
                fontSize: this.chart.sm,
                lineHeight: 1,
                alignment: "justify",
                color: this.chart.black,
                columnGap: 5
            },
            styles: {
                invert: {
                    color: this.chart.white
                },
                tabHeader:{
                    bold: true,
                    fontSize: this.chart.xs,
                    color: this.chart.white,
                    fillColor: this.chart.secondary,
                    lineHeight: 1 // 👈 au lieu de 1.35 (gros impact)
                },
                gras: {
                    fontSize: this.chart.sm,
                    bold: true,
                },
                italic: {
                    fontSize: this.chart.sm,
                    italics: true,
                },
                title: {
                    fontSize: this.chart.sm,
                    alignment: 'left',
                    bold: true,
                },
                subtitle: {
                    fontSize: this.chart.sm,
                    alignment: 'left',
                    color: this.chart.primary,
                },
                mention: {
                    color: this.chart.gray,
                    alignment: 'center',
                    fontSize: this.chart.xs
                },

            },
        };
    }

    getCurrentFrDate = () => {
        const now = new Date();

        const jour = now.getDate().toString().padStart(2, '0');

        const mois = new Intl.DateTimeFormat('fr-FR', { month: 'long' }).format(now);

        const annee = now.getFullYear();

        return `${jour} / ${mois.charAt(0).toUpperCase() + mois.slice(1)} / ${annee}`;
    };

    getService(){
        return process.env.NEXT_PUBLIC_SHORT_SECTION || 'BTP'
    }

    syntheses = {
        ncv: (notes: Note[]) => notes.reduce((acc, n) => acc + (n.moyenne > 10 ? n.credit : 0), 0),
        ncnv: (notes: Note[]) => notes.reduce((acc, n) => acc + (n.moyenne < 10 ? n.credit : 0), 0),
        moyenne: (notes: Note[]) => {
        const totalCredits = notes.reduce((acc, n) => acc + n.credit, 0);
        const maxObtenu = notes.reduce((acc, n) => acc + (n.credit * n.moyenne), 0);

        return totalCredits > 0 ? (maxObtenu/totalCredits) : 0
        }
    }

    getMentions = (moyenne: number): string => {
        switch (true) {
            case moyenne < 10: return "Échec";
            case moyenne < 12: return "Passable";
            case moyenne < 14: return "Assez Bien";
            case moyenne < 16: return "Bien";
            case moyenne < 18: return "Très Bien";
            default: return "Excellent";
        }
    };

    async getRoundedImage(base64: string, size = 80) {
        const canvas = createCanvas(size, size);
        const ctx = canvas.getContext('2d');

        const img = await loadImage(base64);

        ctx.beginPath();
        ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();

        ctx.drawImage(img, 0, 0, size, size);

        return canvas.toDataURL();
    }

    async background(){

        const { fond } = await getSchoolPdfBrandingAssets();
        this.docDefinition = {
            ...this.docDefinition,
            background: (_currentPage: number, pageSize?: { width: number; height: number }) => {
              const width = pageSize?.width ?? 595.28;
              const height = pageSize?.height ?? 841.89;

              return {
                image: fond,
                width: width * 1,
                height: height * 0.8,
                opacity: 0.1,
                alignment: 'center',
                absolutePosition: {
                  x: (width - (width * 1)) / 2,
                  y: (height - (height * 0.7)) / 2,
                }
              };
            },
        }
    }

    content(payload: any[]){
        this.docDefinition = {...this.docDefinition, content: payload}
    }

    info({title, author, subject, keywords}: {title: string, author?: string, subject?: string, keywords?: string}){ 
        this.docDefinition = {...this.docDefinition, info: {title, author, subject, keywords}};
    }

    async layout(content: any = []){
        const { schoolLogo } = await getSchoolPdfBrandingAssets();

        const service = this.getService();

        const mainPage: any[] = [
            {
                stack: [
                    {text: ('République Démocratique du Congo').toLocaleUpperCase(), alignment: 'center'},
                    {text: "MINISTÈRE DE L’ENSEIGNEMENT SUPÉRIEUR, UNIVERSITAIRE, RECHERCHE SCIENTIFIQUE ET INNOVATIONS", style: 'title', fontSize: this.chart.md, alignment: 'center'},
                    {
                        canvas: [
                            {
                                type: "line",
                                x1: 0,
                                y1: 0,
                                x2: 300,
                                y2: 0,
                                lineWidth: 1,
                                lineColor: this.chart.black,
                            },
                        ],
                        margin: [0, 0, 0, 5],
                        alignment: "center"
                    },
                    {text: "INSTITUT NATIONAL DU BÂTIMENT ET DES TRAVAUX PUBLICS", style: 'subtitle', alignment: 'center', fontSize: this.chart.md},
                    {
                        image: schoolLogo, 
                        fit: [150, 80],
                        margin: [0, this.chart.lg, 0, this.chart.lg],
                        alignment: 'center'
                    },
                    {text: "B.P. 4731\nKINSHASA / NGALIEMA", color: this.chart.primary, bold:true, italics: true, alignment: 'center'}, 
                    {
                        text: `Section ${service}`.toUpperCase(), 
                        alignment: 'center', italics: true, bold: true, margin: [0, this.chart.md, 0, this.chart.xs],
                    },
                    ...content
                ]
            }
        ]

        this.content(mainPage)
    }

    async adminLayout(content: any = []){
        const { schoolLogo } = await getSchoolPdfBrandingAssets();

        const normalizedBodyRows = Array.isArray(content)
          ? content.filter((row) => !(Array.isArray(row) && row.length === 0))
          : [];

        const service = this.getService();

        const mainPage: any[] = [
            {
                table: {
                    headerRows: 1,
                    widths: [60, '*', 180],
                    body: [
                        //header
                        [
                            {
                                image: schoolLogo, 
                                fit: [150, 80],
                                
                            },
                            {
                                stack: [
                                    {text: ('République Démocratique du Congo').toLocaleUpperCase()},
                                    {text: "MINISTÈRE DE L’ENSEIGNEMENT SUPÉRIEUR, UNIVERSITAIRE, RECHERCHE SCIENTIFIQUE ET INNOVATIONS", style: 'title'},
                                    {
                                        canvas: [
                                            {
                                                type: "line",
                                                x1: 0,
                                                y1: 0,
                                                x2: 300,
                                                y2: 0,
                                                lineWidth: 0.8,
                                                lineColor: this.chart.black,
                                            },
                                        ],
                                        margin: [0, 0, 0, 5]
                                    },
                                    {text: "INSTITUT NATIONAL DU BÂTIMENT ET DES TRAVAUX PUBLICS", style: 'subtitle'},
                                    {text: "B.P. 4731-KINSHASA / NGALIEMA", italics: true}, 
                                ],
                                margin: [this.chart.xs, 0,0,0],
                                colSpan: 2,
                            },
                            ""
                        ],
                        [
                            {
                            text: `Section ${service}`.toUpperCase(), style: 'subtitle', italics: true, colSpan: 3, margin: [0, 0, 0, this.chart.xs],
							border: [false, false, false, false]},
                            '',
                            ''
                        ],
                        //content
                        ...normalizedBodyRows,
                    ]
                },
                layout: {
                    hLineWidth: () => 0,
                    vLineWidth: () => 0,
                    paddingTop: () => 0,
                    paddingBottom: () => 0,
                    paddingLeft: () => 0,
                    paddingRight: () => 0

                }
            }
        ];

        this.content(mainPage);
    }

    async studentLayout(
        content: any,
        student: {profile?: string, nom:string, sexe: string, ville: string}= {
            profile: 'https://thumbs.dreamstime.com/b/black-college-graduate-attractive-young-holding-certificate-indoors-52814469.jpg',
            nom: "PierreMbenza MbenzaMbenza",
            sexe: "M",
            ville: "Congolaise",
        }, 
        parcour: {promotion: string, systeme: string, matricule: string, annee: string}={
            promotion: "L3 Bâtiment",
            matricule: "BAT-2024-056",
            systeme: "LMD",
            annee: "2024-2025",
        }, 
        contact: {email: string, telephone: string, adresse: string}={
            email: "etudiant@inbtp.ac.cd",
            telephone: "+243 812 345 678",
            adresse: "Avenue de la Paix, Kinshasa"
        },
        document: {type: string, ressource: string, detail: string, reference: string, dateCreate: string, other?: string}={
            type: "Relevé de notes",
            ressource: "Système académique",
            detail: "Relevé de notes du semestre 1",
            reference: "RN-2024-001",
            dateCreate: "15/04/2026",
        }
    ){
        try {
            const { schoolLogo } = await getSchoolPdfBrandingAssets();
            //converti la photo de profile en dataImage si sa existe
            const photo = student?.profile ? await imageUrlToBase64(student.profile) : null;
            const roundedPhoto = photo ? await this.getRoundedImage(photo, 80) : null;
            const service = this.getService();

            const mainPage: any[] = [
                {
                    columns: [
                        { 
                            stack : [
                                {text: 'République Démocratique du Congo', style: 'mention'},
                                {text: "MINISTÈRE DE L’ENSEIGNEMENT SUPÉRIEUR, UNIVERSITAIRE, RECHERCHE SCIENTIFIQUE ET INNOVATIONS", fontSize: this.chart.xs, alignment: 'center'},
                                {image: schoolLogo, fit: [130, 60], alignment: 'center'},
                                {text: "INSTITUT NATIONAL DU BÂTIMENT ET DES TRAVAUX PUBLICS", fontSize: this.chart.xs, alignment: 'center', color: this.chart.primary, bold: true},
                                {text: "B.P. 4731-KINSHASA / NGALIEMA", alignment: 'center', fontSize: this.chart.xs},
                                {
                                    canvas: [
                                        {
                                            type: "line",
                                            x1: 0,
                                            y1: 0,
                                            x2: 100,
                                            y2: 0,
                                            lineWidth: 0.8,
                                            lineColor: this.chart.secondary,
                                        },
                                    ],
                                    alignment: 'center',
                                    margin: [0, 0, 0, 5]
                                },                 
                                { text: `Section : ${service}`, fontSize: this.chart.sm, bold: true, color: this.chart.secondary, margin: [0, 0, 0, 70]},
                                { text: 'Etudiant', color: this.chart.primary, bold: true, fontSize: this.chart.sm},
                                {
                                    canvas: [
                                        {
                                            type: "line",
                                            x1: 0,
                                            y1: 0,
                                            x2: 100,
                                            y2: 0,
                                            lineWidth: 0.8,
                                            lineColor: this.chart.primary,
                                        },
                                    ],
                                    margin: [0, 0, 0, 5]
                                },                 
                                {
                                    stack: [
                                        ...(roundedPhoto ? [{ image: roundedPhoto, width: 50, height: 50 }] : [{ text: "", width: 1 }]),
                                        {
                                            stack: [
                                                { text: `${student.sexe == 'M' ? 'Mr' : 'Mm'} ${student.nom}`, fontSize: this.chart.sm, bold: true, alignment: 'left' },
                                                { text: `${parcour.matricule}\n${contact.email}\n${contact.telephone}`, fontSize: this.chart.sm, margin: [0, 2, 0, 0] },
                                            ],
                                            margin: [0, 5, 0, 0]
                                        }
                                    ],
                                    margin: [0, 0, 0, 60]
                                },
                                { text: 'Classe', color: this.chart.primary, bold: true, fontSize: this.chart.sm},
                                {
                                    canvas: [
                                        {
                                            type: "line",
                                            x1: 0,
                                            y1: 0,
                                            x2: 100,
                                            y2: 0,
                                            lineWidth: 0.8,
                                            lineColor: this.chart.primary,
                                        },
                                    ],
                                    margin: [0, 0, 0, 5]
                                },                 
                                {
                                    text: `${parcour.promotion}\n${parcour.annee}\n${parcour.systeme}`,
                                    fontSize: this.chart.sm,
                                    bold: true,
                                    margin: [0, 0, 0, this.chart.lg]
                                },
                                {
                                    text: 'Document Approuvé par',
                                    fontSize: this.chart.sm,
                                    color: this.chart.primary,
                                    bold: true
                                },
                                                                {
                                    canvas: [
                                        {
                                            type: "line",
                                            x1: 0,
                                            y1: 0,
                                            x2: 100,
                                            y2: 0,
                                            lineWidth: 0.8,
                                            lineColor: this.chart.primary,
                                        },
                                    ],
                                    margin: [0, 0, 0, 5]
                                },  
                                {
                                    text: `${getChef()}`,
                                    bold: true,
                                    fontSize: this.chart.sm
                                },
                                {
                                    text: `${getEmail()}\n${getContact()}`,
                                    fontSize: this.chart.sm,
                                },
                            ], 
                            width: "30%" 
                        },
                        {
                            stack: [
                                {
                                    text: `${document.type}`,
                                    fontSize: this.chart.md,
                                    bold: true,
                                    alignment: 'right'
                                },
                                {
                                    text: `REF: ${document.reference}`,
                                    fontSize: this.chart.sm,
                                    alignment: 'right',
                                    margin: [0, 0, 0, this.chart.sm/3]
                                },
                                {
                                    text: 'Description',
                                    fontSize: this.chart.xs,
                                    color: this.chart.primary,
                                    alignment: 'right',
                                    bold: true
                                },
                                {
                                    text: `${document.detail}`,
                                    alignment: 'right',
                                    fontSize: this.chart.xs,
                                },
                                {
                                    text: `Generé le ${document.dateCreate}`,
                                    bold: true,
                                    alignment: 'right',
                                    fontSize: this.chart.xs,
                                    italics: true,
                                    margin: [0, 0, 0, this.chart.sm/2]
                                },
                                ...content,
                            ],
                            width: "70%"
                        },
                    ],
                },
            ]

            this.content(mainPage)
        } catch (error) {
            console.error("Une erreur est survenu, lors du traitement du Layout Student : ", error);
        }
        
        
    }

    async buildFooter(url: string){
      const { motif } = await getSchoolPdfBrandingAssets();
      const qrSize = 100;
      const currentMargins = (this.docDefinition.pageMargins ?? this.pageMargins) as [number, number, number, number];
      const nextBottomMargin = Math.max(currentMargins[3], qrSize + 25);
    
      this.docDefinition= {...this.docDefinition, pageMargins: [currentMargins[0], currentMargins[1], currentMargins[2], nextBottomMargin], footer: (_currentPage: number, _pageCount: number) => ({
        margin: [this.pageMargins[0], 0, this.pageMargins[2], 24],
        columns: [
            {
                width: qrSize,
                qr: url,
                fit: qrSize,
                alignment: "left",
            },
            {
                width: '*',
                stack: [
                    {
                        canvas: [
                            {
                                type: "line",
                                x1: 0,
                                y1: 0,
                                x2: 400,
                                y2: 0,
                                lineWidth: 0.8,
                                lineColor: this.chart.black,
                            },
                        ],
                        margin: [0, 0, 0, 5]
                    },                 
                    {
                        text: `Avenue de la montagne N°21, Quartier Jolie-Parc, Commune de Ngaliema, Kinshasa-RDC`,
                        style: 'mention', color: this.chart.black
                    },
                    {
                        text: `Site web: www.inbtp.ac.cd , E-mail: sg.academique@inbtp.ac.cd, Tél: +243 822 238 661`,
                        style: 'mention', color: this.chart.black

                    },
                    {
                        image: motif, fit: [500, 20], alignment: 'center'
                    },  
                ],
                margin: [0, 40, 0, 0],
            }
        ]
      })};
    }

    async generateBuffer(){
        const pdfMakeModule = await import("pdfmake/build/pdfmake");
        const pdfFontsModule = await import("pdfmake/build/vfs_fonts");

        const pdfMake = (pdfMakeModule.default ?? pdfMakeModule) as {
        addVirtualFileSystem: (vfs: unknown) => void;
        createPdf: (definition: PdfDocumentDefinition) => { getBuffer: () => Promise<Buffer> };
        };
        const pdfFonts = (pdfFontsModule.default ?? pdfFontsModule) as unknown;

        pdfMake.addVirtualFileSystem(pdfFonts);

        return pdfMake.createPdf(this.docDefinition).getBuffer();
    }


}

export default Document;
