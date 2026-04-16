import { type DocumentStagePayload } from "@/lib/documents/stage-letter";
import { getChef } from "@/lib/documents/layout";
import DocumentStage from "@/utils/pdf/DocumentStage";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
    const _url = new URL(request.url);

    const payload: DocumentStagePayload = {
        stageTitle: "Stage d'observation",
        student: {
            fullName: "Pierre Mbenza",
            email: "etudiant@inbtp.ac.cd",
            telephone: "+243 812 345 678",
        },
        recipientName: "KASONGO",
        recipientQuality: "Directeur",
        recipientSex: "M",
        companyName: "INBTP Services",
        companyLocation: "Kinshasa",
        documentReference: "STG-2026-0001",
    };

    const lettre = new DocumentStage(payload)
    lettre.info({
        title: "Lettre de Stage",
        author: "Dashboard Agents",
        subject: "PDF test",
        keywords: "pdf, test"
    })

    const signature = {
        nom: getChef(),
        titre: 'Chef de Section'
    }

    await lettre.generate("https://btp.inbtp.net", signature);
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
