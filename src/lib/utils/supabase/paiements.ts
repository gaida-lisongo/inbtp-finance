import { createAdminClient } from "@/lib/utils/supabase/admin";
import { getActiveAutorisationCodesForAgent } from "@/lib/utils/supabase/autorisations";
import { getAuthenticatedUser } from "@/lib/utils/supabase/session";

export type PaiementManagementItem = {
  id: string;
  createdAt: string;
  product: string;
  productId: string | null;
  studentId: string;
  status: string;
  amount: number | null;
  orderNumber: string | null;
  description: string | null;
  categorie: string | null;
  student: {
    fullName: string;
    email: string | null;
    telephone: string | null;
  } | null;
};

type PaiementRow = {
  id: string;
  created_at: string;
  product: string | null;
  produc_id: string | null;
  student_id: string | null;
  status: string | null;
  amount: number | null;
  orderNumber: string | null;
  description: string | null;
  categorie: string | null;
};

type StudentRow = {
  id: string;
  nom: string | null;
  post_nom: string | null;
  prenom: string | null;
  email: string | null;
  telephone: string | null;
};

const normalizeText = (value: string | null | undefined) => {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const assertCanManagePaiements = async () => {
  const user = await getAuthenticatedUser();

  if (!user || !user.canAccessAdmin || !user.agentId) {
    throw new Error("access_denied");
  }

  const codes = await getActiveAutorisationCodesForAgent(user.agentId);

  if (!codes.includes("SEC")) {
    throw new Error("access_denied");
  }
};

const getProgrammeStudentIds = async (programmeId: string) => {
  const admin = createAdminClient();
  const { data, error } = await admin.from("parcours").select("student_id").eq("programme_id", programmeId);

  if (error) {
    throw new Error(error.message);
  }

  return Array.from(
    new Set(
      ((data ?? []) as Array<{ student_id: string | null }>)
        .map((item) => item.student_id)
        .filter((item): item is string => typeof item === "string" && item.length > 0),
    ),
  );
};

export const getPaiementsForSecretaryProgramme = async (programmeId: string): Promise<PaiementManagementItem[]> => {
  await assertCanManagePaiements();

  const studentIds = await getProgrammeStudentIds(programmeId);

  if (studentIds.length === 0) {
    return [];
  }

  const admin = createAdminClient();
  const [{ data: paiementsData, error: paiementsError }, { data: studentsData, error: studentsError }] = await Promise.all([
    admin.from("paiements").select('*').in("student_id", studentIds).order("created_at", { ascending: false }).limit(200),
    admin.from("students").select("id, nom, post_nom, prenom, email, telephone").in("id", studentIds),
  ]);

  if (paiementsError) {
    throw new Error(paiementsError.message);
  }

  if (studentsError) {
    throw new Error(studentsError.message);
  }

  const studentsById = new Map(((studentsData ?? []) as StudentRow[]).map((student) => [student.id, student] as const));
  const rows = (paiementsData ?? []) as PaiementRow[];

  return rows.map((row) => {
    const student = row.student_id ? studentsById.get(row.student_id) ?? null : null;
    const fullName = student ? [student.prenom, student.post_nom, student.nom].filter(Boolean).join(" ").trim() || "Etudiant" : "Etudiant";

    return {
      id: row.id,
      createdAt: row.created_at,
      product: normalizeText(row.product) ?? "Produit academique",
      productId: normalizeText(row.produc_id),
      studentId: normalizeText(row.student_id) ?? "",
      status: normalizeText(row.status)?.toLowerCase() ?? "pending",
      amount: typeof row.amount === "number" ? row.amount : null,
      orderNumber: normalizeText(row.orderNumber),
      description: normalizeText(row.description),
      categorie: normalizeText(row.categorie),
      student: student
        ? {
            fullName,
            email: student.email,
            telephone: student.telephone,
          }
        : null,
    };
  });
};

export const validatePaiementManually = async (programmeId: string, paiementId: string) => {
  await assertCanManagePaiements();
  const admin = createAdminClient();

  const { data: paiementData, error: paiementError } = await admin.from("paiements").select('*').eq("id", paiementId).maybeSingle();

  if (paiementError) {
    throw new Error(paiementError.message);
  }

  if (!paiementData) {
    throw new Error("paiement_not_found");
  }

  const paiement = paiementData as PaiementRow;
  const studentId = normalizeText(paiement.student_id);

  if (!studentId) {
    throw new Error("paiement_student_invalid");
  }

  const studentIds = await getProgrammeStudentIds(programmeId);

  if (!studentIds.includes(studentId)) {
    throw new Error("paiement_programme_mismatch");
  }

  const status = normalizeText(paiement.status)?.toLowerCase() ?? "pending";

  if (status === "success") {
    throw new Error("paiement_already_success");
  }

  const category = normalizeText(paiement.categorie) ?? "documents";
  const productId = normalizeText(paiement.produc_id);
  const amount = typeof paiement.amount === "number" ? paiement.amount : 0;
  const orderNumber = normalizeText(paiement.orderNumber) ?? paiement.id;
  const description = normalizeText(paiement.description) ?? `Validation manuelle du paiement ${orderNumber}`;

  const existingCommandeQuery = admin
    .from("commande")
    .select("id")
    .eq("student_id", studentId)
    .eq("categorie", category)
    .neq("status", "success")
    .order("created_at", { ascending: false })
    .limit(1);
  const { data: existingCommandeData, error: existingCommandeError } = productId
    ? await existingCommandeQuery.eq("product", productId)
    : await existingCommandeQuery.is("product", null);

  if (existingCommandeError) {
    throw new Error(existingCommandeError.message);
  }

  const payload = {
    product: productId,
    categorie: category,
    student_id: studentId,
    orderNumber,
    total: amount,
    status: "success",
    description,
  };

  const existingCommande = ((existingCommandeData ?? []) as Array<{ id: string }>)[0] ?? null;

  if (existingCommande) {
    const { error: updateCommandeError } = await admin.from("commande").update(payload).eq("id", existingCommande.id);

    if (updateCommandeError) {
      throw new Error(updateCommandeError.message);
    }
  } else {
    const { error: createCommandeError } = await admin.from("commande").insert(payload);

    if (createCommandeError) {
      throw new Error(createCommandeError.message);
    }
  }

  const { error: paiementUpdateError } = await admin.from("paiements").update({ status: "success" }).eq("id", paiementId);

  if (paiementUpdateError) {
    throw new Error(paiementUpdateError.message);
  }

  const { error: notificationError } = await admin.from("notifications").insert({
    student_id: studentId,
    object: `Paiement ${orderNumber} valide`,
    description: `Votre paiement ${orderNumber} a ete valide par le secretariat.`,
    categorie: "commande_success",
    is_read: false,
    status: false,
    path: `/commande/order/${encodeURIComponent(orderNumber)}`,
  });

  if (notificationError) {
    console.error("paiement notification insert failed", notificationError);
  }

  return {
    paiementId,
    orderNumber,
  };
};
