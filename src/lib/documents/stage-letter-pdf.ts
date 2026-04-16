import { getChef } from "@/lib/documents/layout";
import { type DocumentStagePayload } from "@/lib/documents/stage-letter";
import { buildStageLetterVerificationRedirectUrl } from "@/lib/documents/stage-letter-verification";
import UtilsDocumentStage from "@/utils/pdf/DocumentStage";

const getDefaultQrPayload = () => process.env.NEXT_PUBLIC_HOST_URL?.replace(/\/$/, "") ?? "http://localhost:3000";

const generateStageLetterWithUtilsEngine = async (
  payload: DocumentStagePayload,
  options?: { qrPayload?: string; signature?: StageLetterSignature },
) => {
  const document = new UtilsDocumentStage(payload);

  document.info({
    title: `Lettre de stage - ${payload.student.fullName}`,
    author: "Dashboard Agents",
    subject: "Lettre de recommandation de stage",
    keywords: "stage, lettre, etudiant, recommandation",
  });

  const signature: StageLetterSignature = options?.signature ?? { nom: getChef(), titre: "Chef de Section" };
  const qrPayload = options?.qrPayload ?? getDefaultQrPayload();

  await document.generate(qrPayload, signature);

  return document.generateBuffer();
};

export type StageLetterSignature = {
  nom: string;
  titre: string;
};

export const generateStageLetterPdfBuffer = async (
  payload: DocumentStagePayload,
  options?: {
    qrPayload?: string;
    signature?: StageLetterSignature;
    orderReference?: string;
    studentId?: string;
  },
) => {
  const orderReference = options?.orderReference ?? payload.documentReference ?? null;
  const studentId = options?.studentId ?? null;

  const qrPayload =
    options?.qrPayload ??
    (orderReference && studentId ? buildStageLetterVerificationRedirectUrl({ orderReference, studentId }) : getDefaultQrPayload());

  return generateStageLetterWithUtilsEngine(payload, { ...options, qrPayload });
};
