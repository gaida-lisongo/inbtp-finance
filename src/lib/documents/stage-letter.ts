import type { StudentDocumentIdentity } from "@/lib/documents/Document";

export type StageRecipientSex = "M" | "F" | "N";

export type DocumentStagePayload = {
  stageTitle: string;
  student: StudentDocumentIdentity;
  recipientName: string;
  recipientQuality: string;
  recipientSex: StageRecipientSex;
  companyName?: string | null;
  companyLocation?: string | null;
  documentReference?: string | null;
};

