import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/utils/supabase/admin";

const normalizeText = (value: string | null | undefined) => {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const parseObservationLines = (value: unknown): string[] => {
  if (typeof value === "string") {
    return value
      .split("\n")
      .map((item) => normalizeText(item))
      .filter((item): item is string => Boolean(item));
  }

  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .flatMap((item) => {
      if (typeof item === "string") {
        return item.split("\n");
      }

      if (item && typeof item === "object") {
        const record = item as Record<string, unknown>;
        if (typeof record.content === "string") {
          return record.content.split("\n");
        }
      }

      return [];
    })
    .map((item) => normalizeText(item))
    .filter((item): item is string => Boolean(item));
};

const safeNumber = (value: unknown) => (typeof value === "number" && Number.isFinite(value) ? value : null);

export async function GET(_request: Request, context: { params: Promise<{ notificationSujetId: string }> }) {
  try {
    const { notificationSujetId } = await context.params;
    const normalizedId = normalizeText(notificationSujetId);

    if (!normalizedId) {
      return NextResponse.json({ valid: false, error: "Identifiant invalide." }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data: sujetData, error: sujetError } = await admin
      .from("notifications_sujet")
      .select("id, created_at, notification_id, titre, directeur, co_directeur, note, validation, observations")
      .eq("id", normalizedId)
      .maybeSingle();

    if (sujetError) {
      throw new Error(sujetError.message);
    }

    if (!sujetData) {
      return NextResponse.json({ valid: false, error: "Page de garde introuvable." }, { status: 404 });
    }

    const sujetRow = sujetData as {
      id: string;
      created_at: string;
      notification_id: string | null;
      titre: string | null;
      directeur: string | null;
      co_directeur: string | null;
      note: number | null;
      validation: boolean | null;
      observations: unknown;
    };

    if (!sujetRow.notification_id) {
      return NextResponse.json({ valid: false, error: "Notification parent introuvable." }, { status: 404 });
    }

    const [{ data: notificationData, error: notificationError }, { data: ficheData, error: ficheError }] = await Promise.all([
      admin.from("notifications").select("id, created_at, student_id, status, is_read").eq("id", sujetRow.notification_id).maybeSingle(),
      admin.from("fiche_recherche").select("id, directeur, lecteur_1, lecteur_2, bonus").eq("projet_id", sujetRow.id).maybeSingle(),
    ]);

    if (notificationError) {
      throw new Error(notificationError.message);
    }

    if (ficheError) {
      throw new Error(ficheError.message);
    }

    if (!notificationData) {
      return NextResponse.json({ valid: false, error: "Notification introuvable." }, { status: 404 });
    }

    const notification = notificationData as {
      id: string;
      created_at: string;
      student_id: string;
      status: boolean | null;
      is_read: boolean;
    };

    const { data: studentData, error: studentError } = await admin
      .from("students")
      .select("id, nom, post_nom, prenom, email, telephone")
      .eq("id", notification.student_id)
      .maybeSingle();

    if (studentError) {
      throw new Error(studentError.message);
    }

    const student = studentData as {
      id: string;
      nom: string | null;
      post_nom: string | null;
      prenom: string | null;
      email: string | null;
      telephone: string | null;
    } | null;

    const fiche = (ficheData ?? null) as {
      id: string;
      directeur: number | null;
      lecteur_1: number | null;
      lecteur_2: number | null;
      bonus: number | null;
    } | null;

    const jury = {
      directeur: safeNumber(fiche?.directeur),
      lecteur1: safeNumber(fiche?.lecteur_1),
      lecteur2: safeNumber(fiche?.lecteur_2),
      bonus: safeNumber(fiche?.bonus),
    };

    const juryTotal = [jury.directeur, jury.lecteur1, jury.lecteur2, jury.bonus].reduce((sum, value) => sum + (value ?? 0), 0);

    return NextResponse.json({
      valid: true,
      category: "cover",
      notificationSujetId: sujetRow.id,
      verifiedAt: sujetRow.created_at,
      verificationStatus: sujetRow.validation === true ? "validated" : sujetRow.validation === false ? "rejected" : "pending",
      notificationStatus: notification.status === true ? "delivered" : "in_review",
      student: student
        ? {
            id: student.id,
            fullName: [student.prenom ?? "", student.post_nom ?? "", student.nom ?? ""]
              .map((item) => item.trim())
              .filter(Boolean)
              .join(" ")
              .trim(),
            email: student.email,
            telephone: student.telephone,
          }
        : null,
      subject: {
        title: normalizeText(sujetRow.titre) ?? "Sujet de recherche",
        director: normalizeText(sujetRow.directeur) ?? "Directeur non renseigne",
        coDirector: normalizeText(sujetRow.co_directeur),
      },
      evaluation: {
        note: safeNumber(sujetRow.note),
        observations: parseObservationLines(sujetRow.observations),
      },
      jury: {
        ...jury,
        total: juryTotal,
        hasScores: fiche !== null,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur interne de verification.";
    return NextResponse.json({ valid: false, error: message }, { status: 500 });
  }
}
