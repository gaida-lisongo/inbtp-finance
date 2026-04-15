import { DocumentStagePayload } from "@/lib/documents/DocumentStage";
import DocumentStage from "@/utils/pdf/DocumentStage";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
    const url = new URL(request.url);
    const getLettre = {
        objet: 'Recommandation de Stage',
        destination: (payload: DocumentStagePayload) => `A ${payload.recipientSex == "F" ? "Madame " : payload.recipientSex == "M" ? "Monsieur " : "A qui de droit"}${payload.recipientName}, ${payload.recipientQuality} de la ${payload.companyName}\nà ${payload.companyLocation}`,
        intro: (payload: DocumentStagePayload) => `${payload.recipientSex === "F" ? 'Madame le ' : 'Monsieur le' } ${payload.recipientQuality},`,
        content: (payload: DocumentStagePayload) => [
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
        ]
    };

    const lettre = new DocumentStage()
    lettre.info({
        title: "Lettre de Stage",
        author: "Dashboard Agents",
        subject: "PDF test",
        keywords: "pdf, test"
    })

    await lettre.generate("https://btp.inbtp.net");
    const buffer = await lettre.generateBuffer()

    return new NextResponse(new Uint8Array(buffer), {
        status: 200,
        headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": 'inline; filename="test.pdf"',
            "Cache-Control": "no-store",
        },
    });
}