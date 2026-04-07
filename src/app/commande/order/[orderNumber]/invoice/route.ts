import { NextResponse } from "next/server";

import { DocumentCommandeBon } from "@/lib/documents";
import { createAdminClient } from "@/lib/utils/supabase/admin";
import {
  getCommandeCategoryLabel,
  getCurrentAuthenticatedStudent,
  type CommandeCategory,
  type CommandeRecord,
} from "@/lib/utils/supabase/commandes";
import { getAuthenticatedUser } from "@/lib/utils/supabase/session";

const COMMANDE_CATEGORIES: CommandeCategory[] = ["documents", "session", "stages", "sujets", "laboratoire"];

const normalizeText = (value: string | null | undefined) => {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const isCommandeCategory = (value: string | null): value is CommandeCategory => {
  if (!value) {
    return false;
  }

  return COMMANDE_CATEGORIES.includes(value as CommandeCategory);
};

const getProductLabel = async (category: CommandeCategory, productId: string | null) => {
  if (!productId) {
    return "Produit academique";
  }

  const admin = createAdminClient();

  if (category === "documents") {
    const { data } = await admin.from("documents").select("designation").eq("id", productId).maybeSingle();
    return normalizeText((data as { designation?: string | null } | null)?.designation) ?? productId;
  }

  if (category === "session") {
    const { data } = await admin.from("session").select("designation").eq("id", productId).maybeSingle();
    return normalizeText((data as { designation?: string | null } | null)?.designation) ?? productId;
  }

  const table = category === "laboratoire" ? "laboratoires" : category;
  const { data } = await admin.from(table).select("slug").eq("id", productId).maybeSingle();
  return normalizeText((data as { slug?: string | null } | null)?.slug) ?? productId;
};

export async function GET(_request: Request, context: { params: Promise<{ orderNumber: string }> }) {
  try {
    const user = await getAuthenticatedUser();

    if (!user) {
      return new NextResponse("Authentification requise.", { status: 401 });
    }

    const { orderNumber } = await context.params;
    const normalizedOrderNumber = orderNumber.trim();

    if (!normalizedOrderNumber) {
      return new NextResponse("Order number invalide.", { status: 400 });
    }

    const admin = createAdminClient();
    const { data: commandeData, error: commandeError } = await admin
      .from("commande")
      .select("*")
      .eq("orderNumber", normalizedOrderNumber)
      .order("created_at", { ascending: false })
      .limit(1);

    if (commandeError) {
      throw new Error(commandeError.message);
    }

    const commande = ((commandeData ?? []) as CommandeRecord[])[0] ?? null;

    if (!commande) {
      return new NextResponse("Commande introuvable.", { status: 404 });
    }

    if (user.activePersona !== "admin") {
      const student = await getCurrentAuthenticatedStudent();

      if (!commande.student_id || commande.student_id !== student.id) {
        return new NextResponse("Acces refuse.", { status: 403 });
      }
    }

    const rawCategory = normalizeText(commande.categorie);

    if (!isCommandeCategory(rawCategory)) {
      return new NextResponse("Categorie de commande invalide.", { status: 400 });
    }

    const { data: studentData, error: studentError } = await admin
      .from("students")
      .select("prenom, post_nom, nom, email, telephone")
      .eq("id", commande.student_id)
      .maybeSingle();

    if (studentError) {
      throw new Error(studentError.message);
    }

    const studentRecord = studentData as
      | {
          prenom?: string | null;
          post_nom?: string | null;
          nom?: string | null;
          email?: string | null;
          telephone?: string | null;
        }
      | null;
    const fullName =
      [studentRecord?.prenom, studentRecord?.post_nom, studentRecord?.nom].filter(Boolean).join(" ").trim() || "Etudiant";
    const productLabel = await getProductLabel(rawCategory, normalizeText(commande.product));

    const document = new DocumentCommandeBon({
      orderNumber: normalizeText(commande.orderNumber) ?? commande.id,
      productLabel,
      categoryLabel: getCommandeCategoryLabel(rawCategory),
      student: {
        fullName,
        email: studentRecord?.email ?? null,
        telephone: studentRecord?.telephone ?? null,
      },
      amount: typeof commande.total === "number" ? commande.total : 0,
      description: commande.description,
      status: normalizeText(commande.status) ?? "pending",
      createdAt: commande.created_at,
    });

    const pdfBuffer = await document.generateBuffer();

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="bon-commande-${encodeURIComponent(normalizedOrderNumber)}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur lors de la generation du bon de commande.";
    return new NextResponse(message, { status: 500 });
  }
}
