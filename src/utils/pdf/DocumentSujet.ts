import { text } from "stream/consumers";
import Document from "./Document";

type ProjetPayload = { validation: boolean, note: number, titre: string, directeur: string, co_directeur: string, thematique: string[], justification: string[], problematique: string[], objectif: string[], methodologie: Array<{section: string; content: string}>, resultats:Array<{section: string; content: string}>, chronogrammes: Array<{section: string; content: string}>, references:Array<{section: string; content: string}> }
type StudentPayload ={ photo?: string, nom: string, email: string, telephone: string, matricule: string, programme: string, annee: string }

class DocumentSujet extends Document {
    private projet: ProjetPayload = {
        validation: true,
        note: 10.0,
        titre: "Mise en place d’un système de gestion numérique des projets académiques à l’INBTP",
        directeur: "Pr. KABAMBA MUKENDI",
        co_directeur: "Dr. ILUNGA TSHIBOLA",
        thematique: [
            "Systèmes d'information",
            "Transformation digitale",
            "Gestion de projets",
            "Applications web"
        ],
        justification: [
            "La gestion actuelle des projets académiques est majoritairement manuelle.",
            "Absence de traçabilité et de centralisation des données.",
            "Difficulté de suivi pour les encadreurs et les étudiants.",
            "Besoin d’un système numérique adapté au contexte local."
        ],
        problematique: [
            "Comment améliorer la gestion et le suivi des projets académiques ?",
            "Comment garantir la traçabilité et la transparence des données ?",
            "Quels outils numériques peuvent être adaptés au contexte universitaire congolais ?"
        ],
        objectif: [
            "Concevoir une plateforme web de gestion des projets.",
            "Faciliter la communication entre étudiants et encadreurs.",
            "Automatiser la génération des documents académiques.",
            "Améliorer le suivi et l’évaluation des projets."
        ],
        methodologie: [
            {
                section: "Analyse des besoins",
                content: "Identification des utilisateurs, collecte des besoins fonctionnels et non fonctionnels, analyse des systèmes existants."
            },
            {
                section: "Conception",
                content: "Modélisation UML (cas d’utilisation, diagrammes de classes), conception de l’architecture logicielle."
            },
            {
                section: "Développement",
                content: "Implémentation avec Next.js, Node.js et PostgreSQL, intégration de pdfmake pour les documents."
            },
            {
                section: "Tests et validation",
                content: "Tests unitaires, tests d’intégration, validation par les utilisateurs finaux."
            }
        ],
        resultats: [
            {
                section: "Application développée",
                content: "Une plateforme web fonctionnelle permettant la gestion complète des projets."
            },
            {
                section: "Amélioration du suivi",
                content: "Suivi en temps réel des projets avec tableaux de bord."
            },
            {
                section: "Automatisation",
                content: "Génération automatique des fiches, rapports et documents PDF."
            }
        ],
        chronogrammes: [
            {
                section: "Phase 1 (1 mois)",
                content: "Analyse et spécification des besoins."
            },
            {
                section: "Phase 2 (2 mois)",
                content: "Conception et développement."
            },
            {
                section: "Phase 3 (1 mois)",
                content: "Tests, déploiement et rédaction du rapport."
            }
        ],
        references: [
            {
                section: "Ouvrages",
                content: "Pressman R. – Software Engineering, Sommerville I. – Software Engineering."
            },
            {
                section: "Articles",
                content: "IEEE Papers sur les systèmes de gestion académique."
            },
            {
                section: "Web",
                content: "https://nextjs.org, https://pdfmake.github.io"
            }
        ]
    };

    private student: StudentPayload = {
        photo: "https://via.placeholder.com/150",
        nom: "MUTOMBO KALALA Nathan",
        email: "nathan.mutombo@inbtp.cd",
        telephone: "+243 900 000 000",
        matricule: "20INBTP1234",
        programme: "L3 CIB",
        annee: "2024-2025"
    };

    constructor(payload: any) {
        super();

        if(payload) this.parseData(payload)
    }

    parseData(data: any) {
        this.projet = {
            ...this.projet,
            ...(data?.projet ?? [])
        }

        this.student = {
            ...this.student,
            ...(data?.student ?? [])
        }
    }

    generateText = (cycle: string) => {
        const [diplomeRaw, specialisationRaw] = cycle.split(':');

        const diplome = diplomeRaw?.trim();
        const specialisation = specialisationRaw?.trim();

        const lower = diplome?.toLowerCase() || '';

        let baseText = '';

        if (lower.includes('licence') || lower.includes('l3')) {
            baseText = `Travail de fin de cycle présenté en vue de l’obtention du diplôme de Licence`;
        } else if (lower.includes('master')) {
            baseText = `Mémoire présenté en vue de l’obtention du diplôme de Master`;
        } else {
            baseText = `Travail académique réalisé dans le cadre du cycle de ${diplome}`;
        }

        return specialisation 
            ? `${baseText} en ${specialisation}.`
            : `${baseText}.`;
    };

    generateProtocole(){
        const mainPage = [
            [{text: this.projet?.validation ? `Validé` : 'Non Validé', alignment: 'left'}, '', {text:`Score ${this.projet.note}/25`, alignment: 'right'}],
            [{text: 'PROTOCOLE DE RECHERCHE', colSpan: 3, style: 'title', alignment: 'center', margin: [0, this.chart.lg *3, 0, this.chart.md]}, '', ''],
            [{text: 'Titre du Sujet', italics: true, colSpan: 3}, '', ''],
            [{text: `${this.projet.titre}`, style: 'title', alignment: 'center', fontSize: this.chart.lg * 1.1, margin: [0, 0, 0, this.chart.md], colSpan: 3}, '', ''],
            [{text: ('Présenté par').toUpperCase(), style: 'gras', colSpan: 3}, '', ''],
            [{text: `${this.student.nom}\n${this.student.matricule}`, colSpan: 2}, '', {text:`Promotion: ${this.student.programme}\nAnnee Académique: ${this.student.annee}\nEmail :${this.student.email}\nTéléphone: ${this.student.telephone}`, alignment: 'left'}],
            [{
                stack: [
                    {text: ('Sous la direction de :').toUpperCase(), colSpan: 3, style: 'gras', margin: [0, this.chart.md, 0, 0, 0]},
                    {
                        ul: [
                            {text: [
                                {text: 'Directeur : ', style: 'gras'},
                                ' ',
                                `${this.projet.directeur}`
                            ]},
                            {text: [
                                {text: 'Co-Directeur : ', style: 'gras'},
                                ' ',
                                `${this.projet.co_directeur}`
                            ]}
                        ]
                    }
                ], colSpan: 2
            }, '', {
                stack: [
                    { text: 'Objectif(s) :'.toUpperCase(), style: 'gras' },
                    {
                        ul: this.projet.objectif.map((obj, idx) => ({
                            text: [{text: `OB${idx + 1} : `, style: 'gras'}, {text:`${obj}`, italics: true}],
                            alignment: 'left'
                        }))
                    }
                ],margin: [0, this.chart.md, 0, 0, 0]
            }],
            [
                {
                    stack: [{text: ('Problématique').toUpperCase(), style: 'gras', margin: [0, this.chart.md, 0, 0, 0]}, ...this.projet.problematique],
                    pageBreak: 'before', colSpan: 3, margin: [0, this.chart.xs, 0, this.chart.xs]
                }, '', ''
            ],
            [
                {
                    columns: [
                        {
                            width: '50%',
                            stack: [
                                {text: ('Thématiques').toUpperCase(), colSpan: 3, style: 'gras'},
                                {
                                    ul: this.projet.thematique
                                }
                            ], 
                        },
                        {
                            width: '50%',
                            stack: [{text: ('Justification').toUpperCase(), style: 'gras', margin: [0, this.chart.md, 0, 0, 0]}, ...this.projet.justification]
                        }
                    ],
		            columnGap: 20,
                    colSpan: 3,
                    pageBreak: 'after'
                },
                '',''
            ],
            [
                {
                    stack: [
                        { text: ('Méthodologie').toUpperCase(), style: 'gras' },
                        ...this.projet.methodologie.map(res => ({
                            stack: [
                                { text: res.section, italics: true, bold: true, alignment: 'left' },
                                { text: res.content }
                            ],
                            margin: [0, 0, 0, this.chart.sm]
                        }))
                    ],
                    colSpan: 2,
                    margin: [0, this.chart.md, this.chart.xs, 0]
                },
                '',
                {
                    stack: [
                        { text: ('Résultats').toUpperCase(), style: 'gras' },
                        ...this.projet.resultats.map(res => ({
                            stack: [
                                { text: res.section, italics: true, bold: true, alignment: 'center' },
                                { text: res.content }
                            ],
                            margin: [0, 0, 0, this.chart.sm]
                        }))
                    ],
                    margin: [0, this.chart.md, 0, 0]
                }
            ],
            [
                {
                    stack: [
                        { text: ('références').toUpperCase(), style: 'gras' },
                        ...this.projet.references.map(res => ({
                            stack: [
                                { text: res.section, italics: true, bold: true, alignment: 'left' },
                                { text: res.content }
                            ],
                            margin: [0, 0, 0, this.chart.sm]
                        }))
                    ],
                    colSpan: 3,
                    margin: [0, this.chart.md, 0, 0],
                    pageBreak: 'before'
                },
                '',''
            ],
            [
                {
                    stack: [
                        { text: ('Chronogramme des activités').toUpperCase(), style: 'gras', alignment: 'center', margin: [0, this.chart.md, 0, this.chart.md]},
                        {
                            table: {
                                widths: [80, '*', 30, 100],
                                body: [
                                    [{text: 'Tache', fontSize: this.chart.xs, style: 'gras', alignment: 'center'}, {text: 'Activité', fontSize: this.chart.xs, style: 'gras', alignment: 'center'}, {text: 'Status', fontSize: this.chart.xs, style: 'gras', alignment: 'center'}, {text: 'Observation(s)', fontSize: this.chart.xs, style: 'gras', alignment: 'center'}],
                                    ...this.projet.chronogrammes.map(chrono => ([
                                        {text: chrono.section, style: 'gras', fontSize: this.chart.xs, alignment:'left'},
                                        {text: chrono.content, fontSize: this.chart.xs, alignment: 'left'},
                                        '',
                                        ''
                                    ]))
                                ],
                                layout: {
                                    fillColor: function (rowIndex: number, node: any, columnIndex: any) {
                                        return (rowIndex % 2 === 0) ? '#807e7e' : null;
                                    }
                                }
                            }
                        }
                    ],
                    colSpan: 3,
                    margin: [0, this.chart.md, 0, 0],
                    pageBreak: 'before'
                },
                '',''
            ],
        ]
        return mainPage;
    }

    generateCouverture(cycle: string){
        return [
            {
                table: {
                    body: [
                        [
                            {
                                text: this.projet.titre,
                                fontSize: this.chart.lg,
                                fillColor: this.chart.primary,
                                color: this.chart.white,
                                alignment: 'center',
                                bold: true,
                                border: [false, false, false, false]
                            }
                        ]
                    ]
                },
                layout: {
                    paddingLeft: () => this.chart.lg,
                    paddingRight: () => this.chart.lg,
                    paddingTop: () => this.chart.md * 3,
                    paddingBottom: () => this.chart.md * 3,
                    hLineWidth: () => 0,
                    vLineWidth: () => 0
                },
                margin: [this.chart.md, 0, this.chart.md, this.chart.md]
            },
            {
                text: [`${'é'.toLocaleUpperCase()}crit par : `, {text: this.student.nom, bold: true}],
                alignment: 'center'
            },
            {
                columns: [
                    {with: '60%', text: ''},
                    {
                        width: '40%',
                        text: this.generateText(cycle),
                        alignment: 'left',
                        margin: [0, this.chart.lg * 1.5, 0, this.chart.lg * 2]
                    }
                ]
            },
            {
                text: [
                    'Directeur : ',
                    {text: this.projet.directeur, style: 'gras'}, '\n\n',
                    'Co-Directeur : ',
                    {text: this.projet.co_directeur, style: 'gras'},,
                ]
            },
            {
                text: `Année Académique : ${this.student.annee == 'Non renseignee' ? '2024 - 2025' : this.student.annee}`,
                style: 'gras',
                fontSize: this.chart.lg,
                italics: true,
                alignment: 'center',
                margin: [0, this.chart.lg * 3, 0, 0]
            }
        ]
    }

    async generate(
        verifyUrl: string,
        type: 'Protocle' | 'Couverture',
        cycle: string = 'Licence:Génie du Bâtiment et Travaux Public'
    ) {
        await this.buildFooter(verifyUrl);

        if(type == 'Protocle'){
            await this.background();
            this.adminLayout(this.generateProtocole());
        } else {
            this.layout(this.generateCouverture(cycle));
        }
    }
}

export default DocumentSujet;