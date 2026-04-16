import { NextResponse } from "next/server";

import { buildStageLetterContent } from "@/lib/documents/DocumentStage";
import { type PdfDocumentDefinition, generatePdfBufferFromDefinition } from "@/lib/documents/Document";
import { getChef } from "@/lib/documents/layout";
import { buildDocumentFooter } from "@/lib/documents/layout";
import { getActiveAutorisationCodesForAgent } from "@/lib/utils/supabase/autorisations";
import { createAdminClient } from "@/lib/utils/supabase/admin";
import { getAuthenticatedUser } from "@/lib/utils/supabase/session";
import UtilsDocumentStage from "@/utils/pdf/DocumentStage";

type CommandeRow = {
  id: string;
  created_at: string;
  product: string | null;
  categorie: string | null;
  student_id: string | null;
  orderNumber: string | null;
  status: string | null;
};

type StageRow = {
  id: string;
  slug: string | null;
};

type StudentRow = {
  id: string;
  nom: string | null;
  post_nom: string | null;
  prenom: string | null;
  email: string | null;
  telephone: string | null;
};

const normalizeCategory = (value: string | null) =>
  (value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

const getStudentDisplayName = (student: StudentRow) =>
  [student.prenom, student.post_nom, student.nom].filter(Boolean).join(" ").trim() || "Etudiant";

const parseCommandeIds = async (request: Request) => {
  const payload = (await request.json()) as { commandeIds?: unknown };
  const ids = Array.isArray(payload.commandeIds) ? payload.commandeIds : [];

  return ids
    .filter((id): id is string => typeof id === "string" && id.trim().length > 0)
    .map((id) => id.trim())
    .slice(0, 300);
};

const assertCanDownloadStageLetters = async () => {
  const user = await getAuthenticatedUser();

  if (!user || user.activePersona !== "admin" || !user.agentId) {
    throw new Error("access_denied");
  }

  const activeCodes = await getActiveAutorisationCodesForAgent(user.agentId);

  if (!activeCodes.includes("CS")) {
    throw new Error("access_denied");
  }
};

export async function POST(request: Request) {
  try {
    await assertCanDownloadStageLetters();
    const commandeIds = await parseCommandeIds(request);

    if (commandeIds.length === 0) {
      return NextResponse.json({ success: false, error: "Aucune commande fournie." }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data: commandeData, error: commandeError } = await admin
      .from("commande")
      .select('id, created_at, product, categorie, student_id, "orderNumber", status')
      .in("id", commandeIds);

    if (commandeError) {
      throw new Error(commandeError.message);
    }

    const stageCommandes = ((commandeData ?? []) as CommandeRow[]).filter((commande) => {
      const category = normalizeCategory(commande.categorie);
      return (category === "stage" || category === "stages") && commande.status === "success";
    });

    if (stageCommandes.length === 0) {
      return NextResponse.json({ success: false, error: "Aucune commande stage success a exporter." }, { status: 400 });
    }

    const stageIds = Array.from(new Set(stageCommandes.map((item) => item.product).filter(Boolean))) as string[];
    const studentIds = Array.from(new Set(stageCommandes.map((item) => item.student_id).filter(Boolean))) as string[];

    const [{ data: stageData, error: stageError }, { data: studentData, error: studentError }] = await Promise.all([
      admin.from("stages").select("id, slug").in("id", stageIds),
      admin.from("students").select("id, nom, post_nom, prenom, email, telephone").in("id", studentIds),
    ]);

    if (stageError) {
      throw new Error(stageError.message);
    }

    if (studentError) {
      throw new Error(studentError.message);
    }

    const stagesById = new Map(((stageData ?? []) as StageRow[]).map((row) => [row.id, row] as const));
    const studentsById = new Map(((studentData ?? []) as StudentRow[]).map((row) => [row.id, row] as const));
    const orderById = new Map(commandeIds.map((id, index) => [id, index] as const));
    const orderedCommandes = stageCommandes.sort((a, b) => (orderById.get(a.id) ?? 0) - (orderById.get(b.id) ?? 0));
    const buildableCommandes = orderedCommandes.filter((commande) => {
      const stage = commande.product ? stagesById.get(commande.product) : null;
      const student = commande.student_id ? studentsById.get(commande.student_id) : null;
      return Boolean(stage && student);
    });

    const bulkEngine = process.env.STAGE_LETTER_BULK_ENGINE?.trim().toLowerCase() === "utils" ? "utils" : "lib";
    const content: unknown[] = [];
    let utilsBaseDefinition: Pick<
      PdfDocumentDefinition,
      "pageSize" | "pageMargins" | "defaultStyle" | "styles" | "background" | "footer"
    > | null = null;

    for (let index = 0; index < buildableCommandes.length; index += 1) {
      const commande = buildableCommandes[index];
      const stage = commande.product ? stagesById.get(commande.product) : null;
      const student = commande.student_id ? studentsById.get(commande.student_id) : null;

      if (!stage || !student) {
        continue;
      }

      const payload = {
        stageTitle: stage.slug ?? "Stage academique",
        student: {
          fullName: getStudentDisplayName(student),
          email: student.email,
          telephone: student.telephone,
        },
        recipientName: "A qui de droit",
        recipientQuality: "Service d'accueil de stage",
        recipientSex: "N",
        documentReference: commande.orderNumber ?? commande.id,
      } as const;

      const letterContent =
        bulkEngine === "utils"
          ? await (async () => {
              const verificationBaseUrl = process.env.NEXT_PUBLIC_HOST_URL?.replace(/\/$/, "") ?? "http://localhost:3000";
              const signature = { nom: getChef(), titre: "Chef de Section" };
              const document = new UtilsDocumentStage(payload);

              document.info({
                title: `Lettre de stage - ${payload.student.fullName}`,
                author: "Dashboard Agents",
                subject: "Lettre de recommandation de stage",
                keywords: "stage, lettre, export",
              });

              await document.generate(verificationBaseUrl, signature);

              if (!utilsBaseDefinition) {
                utilsBaseDefinition = {
                  pageSize: document.docDefinition.pageSize,
                  pageMargins: document.docDefinition.pageMargins,
                  defaultStyle: document.docDefinition.defaultStyle,
                  styles: document.docDefinition.styles,
                  background: document.docDefinition.background,
                  footer: document.docDefinition.footer,
                };
              }

              return document.docDefinition.content ?? [];
            })()
          : await buildStageLetterContent(payload);

      content.push(...letterContent);

      if (index < buildableCommandes.length - 1) {
        content.push({ text: "", pageBreak: "after" });
      }
    }

    if (content.length === 0) {
      return NextResponse.json({ success: false, error: "Aucune lettre exploitable n'a ete generee." }, { status: 400 });
    }

    if (bulkEngine === "utils" && !utilsBaseDefinition) {
      return NextResponse.json({ success: false, error: "Impossible de construire la definition PDF (engine utils)." }, { status: 500 });
    }

    const docDefinition: PdfDocumentDefinition =
      bulkEngine === "utils"
        ? {
            info: {
              title: "Lettres de recommandation de stage",
              author: "Dashboard Agents",
              subject: "Export multiple des lettres de stage",
              keywords: "stages, lettres, export",
            },
            ...(utilsBaseDefinition ?? {}),
            content,
          }
        : {
      info: {
        title: "Lettres de recommandation de stage",
        author: "Dashboard Agents",
        subject: "Export multiple des lettres de stage",
        keywords: "stages, lettres, export",
      },
      pageSize: "A4",
      pageMargins: [48, 56, 48, 56],
      defaultStyle: {
        fontSize: 11,
        lineHeight: 1.35,
      },
      styles: {
        title: {
          fontSize: 18,
          bold: true,
          alignment: "center",
        },
        sectionLabel: {
          fontSize: 10,
          bold: true,
          color: "#4B5563",
          margin: [0, 0, 0, 6],
        },
      },
      content,
      footer: buildDocumentFooter(),
    };

    const pdfBuffer = await generatePdfBufferFromDefinition(docDefinition);

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="lettres-stage-success.pdf"',
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur lors de l'export des lettres.";

    if (message === "access_denied") {
      return NextResponse.json({ success: false, error: "Acces refuse." }, { status: 403 });
    }

    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
