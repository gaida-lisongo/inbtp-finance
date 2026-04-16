import { getChef } from "@/lib/documents/layout";
import { DocumentStage, type DocumentStagePayload } from "@/lib/documents/DocumentStage";
import UtilsDocumentStage from "@/utils/pdf/DocumentStage";

export type StageLetterPdfEngine = "utils" | "lib";

export const resolveStageLetterPdfEngine = (): StageLetterPdfEngine => {
  const configured = process.env.STAGE_LETTER_PDF_ENGINE?.trim().toLowerCase();

  if (configured === "utils" || configured === "lib") {
    return configured;
  }

  if (process.env.NODE_ENV !== "production") {
    return "utils";
  }

  return "lib";
};

const getDefaultQrPayload = () => process.env.NEXT_PUBLIC_HOST_URL?.replace(/\/$/, "") ?? "http://localhost:3000";

const generateWithUtilsEngine = async (payload: DocumentStagePayload, options?: { qrPayload?: string; signature?: StageLetterSignature }) => {
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

const generateWithLibEngine = async (payload: DocumentStagePayload) => {
  const document = new DocumentStage(payload);
  return document.generateBuffer();
};

export type StageLetterSignature = {
  nom: string;
  titre: string;
};

export const generateStageLetterPdfBuffer = async (
  payload: DocumentStagePayload,
  options?: {
    engine?: StageLetterPdfEngine;
    qrPayload?: string;
    signature?: StageLetterSignature;
    allowFallback?: boolean;
  },
) => {
  const engine = options?.engine ?? resolveStageLetterPdfEngine();
  const allowFallback = options?.allowFallback ?? true;

  if (engine === "utils") {
    try {
      return await generateWithUtilsEngine(payload, options);
    } catch (error) {
      if (!allowFallback) {
        throw error;
      }

      console.error("stage letter pdf utils engine failed; falling back to lib engine", error);
      return generateWithLibEngine(payload);
    }
  }

  try {
    return await generateWithLibEngine(payload);
  } catch (error) {
    if (!allowFallback) {
      throw error;
    }

    console.error("stage letter pdf lib engine failed; falling back to utils engine", error);
    return generateWithUtilsEngine(payload, options);
  }
};

