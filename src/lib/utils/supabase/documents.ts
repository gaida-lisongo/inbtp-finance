import { getActiveAutorisationCodesForAgent } from "@/lib/utils/supabase/autorisations";
import { sendMicrosoft365Mail } from "@/lib/utils/microsoft-graph";
import { getAuthenticatedUser } from "@/lib/utils/supabase/session";
import { createAdminClient } from "@/lib/utils/supabase/admin";
import { getDocumentCategory, type DocumentRecord } from "@/lib/utils/supabase/documents-shared";

type DocumentNotificationResult = {
  category: string;
  notifiedCount: number;
  skippedCount: number;
};

const appUrl = process.env.NEXT_PUBLIC_HOST_URL;

const assertCanManageSecretaryDocuments = async () => {
  const user = await getAuthenticatedUser();

  if (!user || !user.canAccessAdmin || !user.agentId) {
    throw new Error("access_denied");
  }

  const activeCodes = await getActiveAutorisationCodesForAgent(user.agentId);

  if (!activeCodes.includes("SEC")) {
    throw new Error("access_denied");
  }
};

const getDocumentNotificationContent = (document: DocumentRecord) => {
  const category = getDocumentCategory(document);
  const label = document.designation || category;
  const relativeUrl = `/commande/document/${document.id}`;
  const absoluteUrl = appUrl ? `${appUrl.replace(/\/$/, "")}${relativeUrl}` : relativeUrl;

  if (category.toLowerCase() === "relevés" || category.toLowerCase() === "releves") {
    return {
      category,
      subject: `Nouveau releve disponible - ${label}`,
      html: `
        <div style="font-family:Arial,sans-serif;background:#f5f7fb;padding:24px;color:#1f2937;">
          <div style="max-width:640px;margin:0 auto;background:#ffffff;border-radius:20px;border:1px solid #e5e7eb;overflow:hidden;">
            <div style="padding:24px 28px;background:#111827;color:#ffffff;">
              <div style="font-size:12px;letter-spacing:0.14em;text-transform:uppercase;opacity:0.8;">Notification academique</div>
              <h1 style="margin:12px 0 0;font-size:24px;line-height:1.3;">Votre releve est disponible</h1>
            </div>
            <div style="padding:28px;">
              <p style="margin:0 0 16px;font-size:15px;line-height:1.8;">
                Le document <strong>${label}</strong> est maintenant disponible pour votre promotion.
              </p>
              <p style="margin:0 0 20px;font-size:15px;line-height:1.8;">
                Consultez-le depuis l'application via le bouton ci-dessous.
              </p>
              <a href="${absoluteUrl}" style="display:inline-block;padding:14px 22px;border-radius:999px;background:#2563eb;color:#ffffff;text-decoration:none;font-weight:700;">
                Ouvrir le releve
              </a>
            </div>
          </div>
        </div>
      `,
    };
  }

  return {
    category,
    subject: `Nouveau document disponible - ${label}`,
    html: `
      <div style="font-family:Arial,sans-serif;background:#f5f7fb;padding:24px;color:#1f2937;">
        <div style="max-width:640px;margin:0 auto;background:#ffffff;border-radius:20px;border:1px solid #e5e7eb;overflow:hidden;">
          <div style="padding:24px 28px;background:#111827;color:#ffffff;">
            <div style="font-size:12px;letter-spacing:0.14em;text-transform:uppercase;opacity:0.8;">Notification academique</div>
            <h1 style="margin:12px 0 0;font-size:24px;line-height:1.3;">Nouveau document disponible</h1>
          </div>
          <div style="padding:28px;">
            <p style="margin:0 0 16px;font-size:15px;line-height:1.8;">
              Le document <strong>${label}</strong> a ete publie pour votre promotion.
            </p>
            <p style="margin:0 0 20px;font-size:15px;line-height:1.8;">
              Vous pouvez le consulter directement dans l'application.
            </p>
            <a href="${absoluteUrl}" style="display:inline-block;padding:14px 22px;border-radius:999px;background:#2563eb;color:#ffffff;text-decoration:none;font-weight:700;">
              Ouvrir le document
            </a>
          </div>
        </div>
      </div>
    `,
  };
};

export const getDocumentsForProgramme = async (programmeId: string): Promise<DocumentRecord[]> => {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("documents")
    .select("*")
    .eq("programme_id", programmeId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch documents: ${error.message}`);
  }

  return data || [];
};

export const createDocument = async (document: Omit<DocumentRecord, "id" | "created_at">): Promise<DocumentRecord> => {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("documents")
    .insert(document)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create document: ${error.message}`);
  }

  return data;
};

export const updateDocument = async (id: string, updates: Partial<Omit<DocumentRecord, "id" | "created_at">>): Promise<DocumentRecord> => {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("documents")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update document: ${error.message}`);
  }

  return data;
};

export const deleteDocument = async (id: string): Promise<void> => {
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("documents")
    .delete()
    .eq("id", id);

  if (error) {
    throw new Error(`Failed to delete document: ${error.message}`);
  }
};

export const notifyStudentsForDocument = async (
  programmeId: string,
  documentId: string,
): Promise<DocumentNotificationResult> => {
  await assertCanManageSecretaryDocuments();

  const supabase = createAdminClient();
  const [{ data: document, error: documentError }, { data: parcoursData, error: parcoursError }, { data: studentsData, error: studentsError }] =
    await Promise.all([
      supabase.from("documents").select("*").eq("id", documentId).eq("programme_id", programmeId).maybeSingle(),
      supabase.from("parcours").select("student_id").eq("programme_id", programmeId),
      supabase.from("students").select("id, email"),
    ]);

  if (documentError) {
    throw new Error(documentError.message);
  }

  if (!document) {
    throw new Error("document_not_found");
  }

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
    throw new Error("document_notification_no_student_email");
  }

  const content = getDocumentNotificationContent(document as DocumentRecord);

  await sendMicrosoft365Mail({
    to: emails,
    subject: content.subject,
    html: content.html,
  });

  return {
    category: content.category,
    notifiedCount: emails.length,
    skippedCount: studentIds.size - emails.length,
  };
};
