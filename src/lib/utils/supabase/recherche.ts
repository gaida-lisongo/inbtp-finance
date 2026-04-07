import { getAuthenticatedUser } from "@/lib/utils/supabase/session";
import { getActiveAutorisationCodesForAgent } from "@/lib/utils/supabase/autorisations";
import { createAdminClient } from "@/lib/utils/supabase/admin";
import type { ResearchRecord, ResearchTableName } from "@/lib/utils/supabase/recherche-shared";
import { formatResearchDescription } from "@/lib/utils/supabase/recherche-shared";
import { sendMicrosoft365Mail } from "@/lib/utils/microsoft-graph";

const emptyToNull = (value: FormDataEntryValue | null) => {
  if (typeof value !== "string") {
    return null;
  }

  const trimmedValue = value.trim();
  return trimmedValue.length > 0 ? trimmedValue : null;
};

const numberToNull = (value: FormDataEntryValue | null, field: string) => {
  const normalizedValue = emptyToNull(value);

  if (!normalizedValue) {
    return null;
  }

  const parsedValue = Number(normalizedValue);

  if (!Number.isFinite(parsedValue)) {
    throw new Error(`${field}_invalid`);
  }

  return parsedValue;
};

const parseDescriptionValue = (value: string | null) => {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value);
  } catch {
    return { text: value };
  }
};

const parseSujetJuryValue = (value: FormDataEntryValue | null) => {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();

  if (!normalized) {
    return null;
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(normalized);
  } catch {
    throw new Error("jury_invalid");
  }

  if (!Array.isArray(parsed)) {
    throw new Error("jury_invalid");
  }

  const jury = parsed
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const record = item as Record<string, unknown>;
      const membre = typeof record.membre === "string" ? record.membre.trim() : "";
      const enseignant = typeof record.enseignant === "string" ? record.enseignant.trim() : "";

      if (!membre && !enseignant) {
        return null;
      }

      if (!membre || !enseignant) {
        throw new Error("jury_invalid");
      }

      return {
        membre,
        enseignant,
      };
    })
    .filter((item): item is { membre: string; enseignant: string } => item !== null);

  return jury.length > 0 ? jury : null;
};

const assertCanManageResearch = async () => {
  const user = await getAuthenticatedUser();

  if (!user || !user.canAccessAdmin || !user.agentId) {
    throw new Error("access_denied");
  }

  const activeCodes = await getActiveAutorisationCodesForAgent(user.agentId);

  if (!activeCodes.includes("CR")) {
    throw new Error("access_denied");
  }
};

const getResearchRecordsByProgramme = async (tableName: ResearchTableName, programmeId: string) => {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from(tableName)
    .select("*")
    .eq("programme_id", programmeId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as ResearchRecord[];
};

export const getStagesByProgramme = async (programmeId: string) => getResearchRecordsByProgramme("stages", programmeId);

export const getSujetsByProgramme = async (programmeId: string) => getResearchRecordsByProgramme("sujets", programmeId);

export const getLaboratoiresByProgramme = async (programmeId: string) => getResearchRecordsByProgramme("laboratoires", programmeId);

export const saveResearchRecord = async (tableName: ResearchTableName, formData: FormData) => {
  await assertCanManageResearch();

  const id = emptyToNull(formData.get("id"));
  const programmeId = emptyToNull(formData.get("programme_id"));

  if (!programmeId) {
    throw new Error("programme_required");
  }

  const payload = {
    programme_id: programmeId,
    montant: numberToNull(formData.get("montant"), "montant"),
    description: parseDescriptionValue(emptyToNull(formData.get("description"))),
    slug: emptyToNull(formData.get("slug")),
    entra_id: emptyToNull(formData.get("entra_id")),
    is_active: emptyToNull(formData.get("is_active")),
  };
  const payloadWithJury =
    tableName === "sujets"
      ? {
          ...payload,
          jury: parseSujetJuryValue(formData.get("jury_json")),
        }
      : payload;

  const admin = createAdminClient();

  if (id) {
    const { error } = await admin.from(tableName).update(payloadWithJury).eq("id", id);

    if (error) {
      throw new Error(error.message);
    }

    return;
  }

  const { error } = await admin.from(tableName).insert(payloadWithJury);

  if (error) {
    throw new Error(error.message);
  }
};

export const deleteResearchRecord = async (tableName: ResearchTableName, id: string) => {
  await assertCanManageResearch();

  const admin = createAdminClient();
  const { error } = await admin.from(tableName).delete().eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
};

const appUrl = process.env.NEXT_PUBLIC_HOST_URL;

const getResourceRelativeUrl = (tableName: ResearchTableName, recordId: string) => {
  const mapping: Record<ResearchTableName, string> = {
    stages: "stages",
    sujets: "sujets",
    laboratoires: "laboratoires",
  };

  return `/commande/${mapping[tableName]}/${recordId}`;
};

const getResearchLabel = (tableName: ResearchTableName) => {
  const labels: Record<ResearchTableName, string> = {
    stages: "Stage",
    sujets: "Sujet",
    laboratoires: "Laboratoire",
  };

  return labels[tableName];
};

const gatherProgrammeStudentEmails = async (programmeId: string) => {
  const admin = createAdminClient();
  const [{ data: parcoursData, error: parcoursError }, { data: studentsData, error: studentsError }] = await Promise.all([
    admin.from("parcours").select("student_id").eq("programme_id", programmeId),
    admin.from("students").select("id, email"),
  ]);

  if (parcoursError) {
    throw new Error(parcoursError.message);
  }

  if (studentsError) {
    throw new Error(studentsError.message);
  }

  const studentIds = new Set(
    ((parcoursData ?? []) as Array<{ student_id: string | null }>)
      .map((item) => item.student_id)
      .filter(Boolean) as string[],
  );

  const emails = Array.from(
    new Set(
      ((studentsData ?? []) as Array<{ id: string; email: string | null }>)
        .filter((student) => studentIds.has(student.id))
        .map((student) => student.email?.trim().toLowerCase() ?? "")
        .filter(Boolean),
    ),
  );

  if (emails.length === 0) {
    throw new Error("research_notification_no_student_email");
  }

  return emails;
};

const buildResearchNotificationContent = (
  tableName: ResearchTableName,
  record: ResearchRecord,
  programmeLabel: string | null,
) => {
  const title = record.slug || getResearchLabel(tableName);
  const description = formatResearchDescription(record.description) || "";
  const relativeUrl = getResourceRelativeUrl(tableName, record.id);
  const absoluteUrl = appUrl ? `${appUrl.replace(/\/$/, "")}${relativeUrl}` : relativeUrl;
  const label = getResearchLabel(tableName);

  return {
    subject: `Nouvelle ${label.toLowerCase()} disponible - ${title}`,
    html: `
      <div style="font-family:Arial,sans-serif;background:#f5f7fb;padding:24px;color:#1f2937;">
        <div style="max-width:640px;margin:0 auto;background:#ffffff;border-radius:20px;border:1px solid #e5e7eb;overflow:hidden;">
          <div style="padding:24px 28px;background:#111827;color:#ffffff;">
            <div style="font-size:12px;letter-spacing:0.14em;text-transform:uppercase;opacity:0.8;">Notification academique</div>
            <h1 style="margin:12px 0 0;font-size:24px;line-height:1.3;">Nouvelle ${label} disponible</h1>
          </div>
          <div style="padding:28px;">
            <p style="margin:0 0 16px;font-size:15px;line-height:1.8;">
              <strong>${title}</strong> a ete publie pour ${programmeLabel || "votre promotion"}.
            </p>
            ${description ? `<p style="margin:0 0 16px;font-size:15px;line-height:1.8;">${description}</p>` : ""}
            <div style="margin-top:20px;">
              <a href="${absoluteUrl}" style="display:inline-block;padding:14px 22px;border-radius:999px;background:#2563eb;color:#ffffff;text-decoration:none;font-weight:700;">
                Consulter la remise
              </a>
            </div>
          </div>
        </div>
      </div>
    `,
  };
};

export type ResearchNotificationResult = {
  notifiedCount: number;
  skippedCount: number;
};

export const notifyStudentsForResearchRecord = async (
  tableName: ResearchTableName,
  programmeId: string,
  programmeLabel: string | null,
  recordId: string,
): Promise<ResearchNotificationResult> => {
  await assertCanManageResearch();

  const admin = createAdminClient();
  const { data: record, error } = await admin
    .from(tableName)
    .select("*")
    .eq("id", recordId)
    .eq("programme_id", programmeId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!record) {
    throw new Error("research_record_not_found");
  }

  const emails = await gatherProgrammeStudentEmails(programmeId);
  const content = buildResearchNotificationContent(tableName, record as ResearchRecord, programmeLabel);

  await sendMicrosoft365Mail({
    to: emails,
    subject: content.subject,
    html: content.html,
  });

  return {
    notifiedCount: emails.length,
    skippedCount: 0,
  };
};
