import { buildPublicVerificationUrl } from "@/lib/documents/verification-url";

export const buildStageLetterCheckingPageUrl = (input: { orderReference: string; studentId: string }) => {
  return buildPublicVerificationUrl({
    pathname: `/checking/stage-letter/${encodeURIComponent(input.orderReference)}`,
    searchParams: { student_id: input.studentId },
  });
};

export const buildStageLetterVerificationRedirectUrl = (input: { orderReference: string; studentId: string }) => {
  return buildPublicVerificationUrl({
    pathname: `/api/verify/stage-letter/${encodeURIComponent(input.orderReference)}`,
    searchParams: { student_id: input.studentId },
  });
};

