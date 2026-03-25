import fs from "node:fs/promises";
import path from "node:path";

import PdfPrinter from "pdfmake";
import { cookies } from "next/headers";

import { getCurrentAuthProfile } from "@/lib/utils/supabase/auth";
import { createClient as createServerSupabaseClient } from "@/lib/utils/supabase/server";

export type PaymentReportType =
  | "journalier"
  | "hebdomadaire"
  | "mensuel"
  | "semestriel"
  | "annuel";

type CookieStore = Awaited<ReturnType<typeof cookies>>;

type PaymentCategoryKey = "success" | "pending" | "canceled" | "no";

type ModaliteRow = {
  id: number;
  designation: string | null;
  slug: string | null;
  montant: number | null;
  description: string | null;
  annee_id: string | null;
  frais_id: string | null;
  annees:
    | {
        id: string;
        designation: string | null;
        debut: string | null;
        fin: string | null;
      }
    | {
        id: string;
        designation: string | null;
        debut: string | null;
        fin: string | null;
      }[]
    | null;
  frais:
    | {
        id: string;
        designation: string | null;
        montant: number | null;
        description: string | null;
        promotion_id: string | null;
        promotions:
          | {
              id: string;
              designation: string | null;
              slug: string | null;
            }
          | {
              id: string;
              designation: string | null;
              slug: string | null;
            }[]
          | null;
      }
    | {
        id: string;
        designation: string | null;
        montant: number | null;
        description: string | null;
        promotion_id: string | null;
        promotions:
          | {
              id: string;
              designation: string | null;
              slug: string | null;
            }
          | {
              id: string;
              designation: string | null;
              slug: string | null;
            }[]
          | null;
      }[]
    | null;
};

type PaiementRow = {
  id: string;
  created_at: string | null;
  montant: number | null;
  status: string | null;
  orderNumber: string | null;
  etudiants:
    | {
        id: string;
        nom: string | null;
        matricule: string | null;
        email: string | null;
      }
    | {
        id: string;
        nom: string | null;
        matricule: string | null;
        email: string | null;
      }[]
    | null;
};

export type PaymentCategorySummary = {
  key: PaymentCategoryKey;
  label: string;
  quantity: number;
  montant: number;
  transactions: Array<{
    id: string;
    createdAt: string | null;
    amount: number;
    orderNumber: string;
    studentName: string;
    matricule: string;
    email: string;
  }>;
};

export type PaymentReportContext = {
  modaliteId: number;
  reportType: PaymentReportType;
  reportTypeLabel: string;
  generatedAt: Date;
  documentReference: string;
  periodLabel: string;
  periodStart: Date;
  periodEnd: Date;
  detailUrl: string;
  currentUserName: string;
  currentUserEmail: string;
  modalite: {
    designation: string;
    slug: string;
    montant: number;
    description: string;
  };
  annee: {
    id: string;
    designation: string;
    debut: string | null;
    fin: string | null;
  };
  frais: {
    designation: string;
    montant: number;
    promotionDesignation: string;
  };
  categories: PaymentCategorySummary[];
  totals: {
    quantity: number;
    montant: number;
  };
};

const ENTRA_TENANT_ID = process.env.ENTRA_TENANT_ID;
const ENTRA_CLIENT_ID = process.env.ENTRA_CLIENT_ID;
const ENTRA_CLIENT_SECRET = process.env.ENTRA_CLIENT_SECRET;
const COGE_MAIL = process.env.COGE_MAIL;

const reportTypeLabels: Record<PaymentReportType, string> = {
  journalier: "Rapport journalier",
  hebdomadaire: "Rapport hebdomadaire",
  mensuel: "Rapport mensuel",
  semestriel: "Rapport semestriel",
  annuel: "Rapport annuel",
};

const categoryLabels: Record<PaymentCategoryKey, string> = {
  success: "Paiements collectes",
  pending: "Paiements en attente",
  canceled: "Paiements annules",
  no: "Paiements non classes",
};

const printer = new PdfPrinter({
  Roboto: {
    normal: path.join(process.cwd(), "node_modules/pdfmake/fonts/Roboto/Roboto-Regular.ttf"),
    bold: path.join(process.cwd(), "node_modules/pdfmake/fonts/Roboto/Roboto-Medium.ttf"),
    italics: path.join(process.cwd(), "node_modules/pdfmake/fonts/Roboto/Roboto-Italic.ttf"),
    bolditalics: path.join(
      process.cwd(),
      "node_modules/pdfmake/fonts/Roboto/Roboto-MediumItalic.ttf",
    ),
  },
});

const normalizeStatus = (value: string | null): PaymentCategoryKey => {
  const normalized = (value ?? "").trim().toLowerCase();

  if (normalized === "success") return "success";
  if (normalized === "pending") return "pending";
  if (normalized === "canceled" || normalized === "cancelled") return "canceled";
  return "no";
};

const getRelation = <T,>(value: T | T[] | null): T | null =>
  Array.isArray(value) ? value[0] ?? null : value;

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);

const formatDate = (value: Date) =>
  new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(value);

const formatDateTime = (value: Date) =>
  new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);

const startOfDay = (date: Date) => {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
};

const endOfDay = (date: Date) => {
  const value = new Date(date);
  value.setHours(23, 59, 59, 999);
  return value;
};

const startOfWeek = (date: Date) => {
  const value = startOfDay(date);
  const day = value.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  value.setDate(value.getDate() + diff);
  return value;
};

const endOfWeek = (date: Date) => {
  const value = startOfWeek(date);
  value.setDate(value.getDate() + 6);
  return endOfDay(value);
};

const startOfMonth = (date: Date) => startOfDay(new Date(date.getFullYear(), date.getMonth(), 1));
const endOfMonth = (date: Date) => endOfDay(new Date(date.getFullYear(), date.getMonth() + 1, 0));

const addDays = (date: Date, days: number) => {
  const value = new Date(date);
  value.setDate(value.getDate() + days);
  return value;
};

const clampDate = (value: Date, min?: Date | null, max?: Date | null) => {
  const time = value.getTime();
  if (min && time < min.getTime()) return new Date(min);
  if (max && time > max.getTime()) return new Date(max);
  return new Date(value);
};

const buildDocumentReference = (modaliteId: number, reportType: PaymentReportType, timestamp: number) =>
  `RPT-${reportType.toUpperCase()}-${modaliteId}-${timestamp}`;

const readBrandLogoSvg = async () => {
  const preferredPath = path.join(process.cwd(), "public/images/logo/logo-congo.svg");
  const fallbackPath = path.join(process.cwd(), "public/images/logo/logo.svg");

  try {
    return await fs.readFile(preferredPath, "utf8");
  } catch {
    return fs.readFile(fallbackPath, "utf8");
  }
};

const streamToBuffer = async (
  stream: NodeJS.ReadableStream & {
    end(): void;
  },
) =>
  new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];

    stream.on("data", (chunk: Buffer | string) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });
    stream.on("end", () => resolve(Buffer.concat(chunks)));
    stream.on("error", reject);
    stream.end();
  });

export const resolvePaymentReportType = (value: string): PaymentReportType | null => {
  const normalized = value.trim().toLowerCase();

  if (
    normalized === "journalier" ||
    normalized === "hebdomadaire" ||
    normalized === "mensuel" ||
    normalized === "semestriel" ||
    normalized === "annuel"
  ) {
    return normalized;
  }

  return null;
};

const computeReportPeriod = ({
  reportType,
  anchor,
  academicStart,
  academicEnd,
}: {
  reportType: PaymentReportType;
  anchor: Date;
  academicStart?: Date | null;
  academicEnd?: Date | null;
}) => {
  const safeAnchor = clampDate(anchor, academicStart, academicEnd);
  let periodStart: Date;
  let periodEnd: Date;

  switch (reportType) {
    case "journalier":
      periodStart = startOfDay(safeAnchor);
      periodEnd = endOfDay(safeAnchor);
      break;
    case "hebdomadaire":
      periodStart = startOfWeek(safeAnchor);
      periodEnd = endOfWeek(safeAnchor);
      break;
    case "mensuel":
      periodStart = startOfMonth(safeAnchor);
      periodEnd = endOfMonth(safeAnchor);
      break;
    case "semestriel": {
      if (academicStart && academicEnd) {
        const midpoint = new Date(
          academicStart.getTime() + (academicEnd.getTime() - academicStart.getTime()) / 2,
        );
        if (safeAnchor.getTime() <= midpoint.getTime()) {
          periodStart = academicStart;
          periodEnd = midpoint;
        } else {
          periodStart = addDays(midpoint, 1);
          periodEnd = academicEnd;
        }
      } else {
        periodStart = addDays(safeAnchor, -182);
        periodEnd = safeAnchor;
      }
      break;
    }
    case "annuel":
      if (academicStart && academicEnd) {
        periodStart = academicStart;
        periodEnd = academicEnd;
      } else {
        periodStart = new Date(safeAnchor.getFullYear(), 0, 1);
        periodEnd = new Date(safeAnchor.getFullYear(), 11, 31, 23, 59, 59, 999);
      }
      break;
  }

  const start = clampDate(periodStart, academicStart, academicEnd);
  const end = clampDate(periodEnd, academicStart, academicEnd);

  return {
    start,
    end,
    label: `${formatDate(start)} au ${formatDate(end)}`,
  };
};

export const getPaymentReportContext = async ({
  modaliteId,
  reportType,
  timestamp,
  origin,
  cookieStore,
}: {
  modaliteId: number;
  reportType: PaymentReportType;
  timestamp: number;
  origin: string;
  cookieStore: CookieStore;
}): Promise<PaymentReportContext> => {
  const supabase = createServerSupabaseClient(cookieStore);
  const authProfile = await getCurrentAuthProfile();

  if (!authProfile.user) {
    throw new Error("Utilisateur non authentifie pour generer le rapport.");
  }

  const { data: modaliteRow, error: modaliteError } = await supabase
    .from("modalites")
    .select(
      "id, designation, slug, montant, description, annee_id, frais_id, annees(id, designation, debut, fin), frais(id, designation, montant, description, promotion_id, promotions(id, designation, slug))",
    )
    .eq("id", modaliteId)
    .single();

  if (modaliteError) {
    throw new Error(modaliteError.message);
  }

  const modalite = modaliteRow as ModaliteRow;
  const annee = getRelation(modalite.annees);
  const frais = getRelation(modalite.frais);
  const promotion = getRelation(frais?.promotions ?? null);
  const academicStart = annee?.debut ? startOfDay(new Date(annee.debut)) : null;
  const academicEnd = annee?.fin ? endOfDay(new Date(annee.fin)) : null;
  const generatedAt = new Date(timestamp);
  const period = computeReportPeriod({
    reportType,
    anchor: generatedAt,
    academicStart,
    academicEnd,
  });

  const { data: paiementsRaw, error: paiementsError } = await supabase
    .from("paiements")
    .select("id, created_at, montant, status, orderNumber, etudiants(id, nom, matricule, email)")
    .eq("modalite_id", modaliteId)
    .gte("created_at", period.start.toISOString())
    .lte("created_at", period.end.toISOString())
    .order("created_at", { ascending: false });

  if (paiementsError) {
    throw new Error(paiementsError.message);
  }

  const categoriesMap = new Map<PaymentCategoryKey, PaymentCategorySummary>();
  (["success", "pending", "canceled", "no"] as PaymentCategoryKey[]).forEach((key) => {
    categoriesMap.set(key, {
      key,
      label: categoryLabels[key],
      quantity: 0,
      montant: 0,
      transactions: [],
    });
  });

  for (const paiement of (paiementsRaw ?? []) as PaiementRow[]) {
    const key = normalizeStatus(paiement.status);
    const bucket = categoriesMap.get(key);

    if (!bucket) continue;

    const etudiant = getRelation(paiement.etudiants);
    const amount = paiement.montant ?? 0;

    bucket.quantity += 1;
    bucket.montant += amount;
    bucket.transactions.push({
      id: paiement.id,
      createdAt: paiement.created_at,
      amount,
      orderNumber: paiement.orderNumber ?? "-",
      studentName: etudiant?.nom ?? "Etudiant inconnu",
      matricule: etudiant?.matricule ?? "-",
      email: etudiant?.email ?? "-",
    });
  }

  const categories = (["success", "pending", "canceled", "no"] as PaymentCategoryKey[]).map(
    (key) => categoriesMap.get(key)!,
  );
  const totals = categories.reduce(
    (accumulator, category) => ({
      quantity: accumulator.quantity + category.quantity,
      montant: accumulator.montant + category.montant,
    }),
    { quantity: 0, montant: 0 },
  );
  const documentReference = buildDocumentReference(modaliteId, reportType, timestamp);

  return {
    modaliteId,
    reportType,
    reportTypeLabel: reportTypeLabels[reportType],
    generatedAt,
    documentReference,
    periodLabel: period.label,
    periodStart: period.start,
    periodEnd: period.end,
    detailUrl: `${origin}/api/paiement/${modaliteId}/${reportType}/${timestamp}`,
    currentUserName:
      authProfile.user.user_metadata.full_name ??
      authProfile.user.user_metadata.preferred_username ??
      authProfile.user.email ??
      "Operateur",
    currentUserEmail: authProfile.user.email ?? "",
    modalite: {
      designation: modalite.designation ?? "Modalite sans designation",
      slug: modalite.slug ?? "-",
      montant: modalite.montant ?? 0,
      description: (modalite.description ?? "").replace(/\\n/g, "\n"),
    },
    annee: {
      id: annee?.id ?? "",
      designation: annee?.designation ?? "Annee academique",
      debut: annee?.debut ?? null,
      fin: annee?.fin ?? null,
    },
    frais: {
      designation: frais?.designation ?? "Frais sans designation",
      montant: frais?.montant ?? 0,
      promotionDesignation: promotion?.designation ?? "Promotion non definie",
    },
    categories,
    totals,
  };
};

const buildSummaryDefinition = async (context: PaymentReportContext) => {
  const logoSvg = await readBrandLogoSvg();

  return {
    pageSize: "A4",
    pageMargins: [28, 28, 28, 28],
    defaultStyle: {
      font: "Roboto",
      fontSize: 10,
      color: "#344054",
      lineHeight: 1.35,
    },
    content: [
      {
        table: {
          widths: [180, "*"],
          body: [
            [
              {
                fillColor: "#D92D20",
                margin: [16, 18, 16, 18],
                stack: [
                  {
                    text: context.reportTypeLabel.toUpperCase(),
                    color: "#FFFFFF",
                    bold: true,
                    fontSize: 18,
                    margin: [0, 0, 0, 16],
                  },
                  { text: "Operateur", color: "#FECACA", fontSize: 9, bold: true },
                  { text: context.currentUserName, color: "#FFFFFF", margin: [0, 2, 0, 10] },
                  { text: "Adresse email", color: "#FECACA", fontSize: 9, bold: true },
                  {
                    text: context.currentUserEmail || "-",
                    color: "#FFFFFF",
                    margin: [0, 2, 0, 10],
                  },
                  { text: "N/Ref", color: "#FECACA", fontSize: 9, bold: true },
                  { text: context.documentReference, color: "#FFFFFF", margin: [0, 2, 0, 0] },
                ],
              },
              {
                margin: [20, 12, 8, 0],
                stack: [
                  {
                    columns: [
                      { svg: logoSvg, width: 140 },
                      {
                        width: "*",
                        alignment: "right",
                        stack: [
                          {
                            text: "Situation financiere de modalite",
                            fontSize: 20,
                            bold: true,
                            color: "#101828",
                          },
                          {
                            text: `Genere le ${formatDateTime(context.generatedAt)}`,
                            margin: [0, 4, 0, 0],
                            color: "#667085",
                          },
                          {
                            text: `Periode : ${context.periodLabel}`,
                            margin: [0, 2, 0, 0],
                            color: "#667085",
                          },
                        ],
                      },
                    ],
                  },
                  {
                    margin: [0, 20, 0, 0],
                    columns: [
                      {
                        width: "42%",
                        stack: [
                          {
                            text: "Invoice To",
                            fontSize: 11,
                            bold: true,
                            color: "#D92D20",
                            margin: [0, 0, 0, 8],
                          },
                          {
                            text: context.modalite.designation,
                            bold: true,
                            fontSize: 12,
                            color: "#101828",
                          },
                          {
                            text: `Montant : ${formatCurrency(context.modalite.montant)}`,
                            margin: [0, 4, 0, 0],
                          },
                          { text: `Slug : ${context.modalite.slug}`, margin: [0, 2, 0, 0] },
                          {
                            text: `Annee : ${context.annee.designation}`,
                            margin: [0, 2, 0, 0],
                          },
                          {
                            text: "Terms et conditions",
                            fontSize: 11,
                            bold: true,
                            color: "#D92D20",
                            margin: [0, 20, 0, 8],
                          },
                          {
                            text: context.modalite.description || "Aucune description fournie.",
                            color: "#344054",
                          },
                        ],
                      },
                      {
                        width: "58%",
                        stack: [
                          {
                            text: "Payment Info",
                            fontSize: 11,
                            bold: true,
                            color: "#D92D20",
                            margin: [0, 0, 0, 8],
                          },
                          {
                            text: context.frais.designation,
                            fontSize: 13,
                            bold: true,
                            color: "#101828",
                          },
                          {
                            text: `Montant du frais : ${formatCurrency(context.frais.montant)}`,
                            margin: [0, 4, 0, 0],
                          },
                          {
                            text: `Promotion : ${context.frais.promotionDesignation}`,
                            margin: [0, 2, 0, 0],
                          },
                          {
                            margin: [0, 16, 0, 0],
                            table: {
                              widths: ["*", 80, 100],
                              headerRows: 1,
                              body: [
                                [
                                  {
                                    text: "Libelle",
                                    fillColor: "#F04438",
                                    color: "#FFFFFF",
                                    bold: true,
                                    margin: [0, 6, 0, 6],
                                  },
                                  {
                                    text: "Quantite",
                                    fillColor: "#F04438",
                                    color: "#FFFFFF",
                                    bold: true,
                                    alignment: "center",
                                    margin: [0, 6, 0, 6],
                                  },
                                  {
                                    text: "Montant",
                                    fillColor: "#F04438",
                                    color: "#FFFFFF",
                                    bold: true,
                                    alignment: "right",
                                    margin: [0, 6, 0, 6],
                                  },
                                ],
                                ...context.categories.map((category) => [
                                  { text: category.label, margin: [0, 6, 0, 6] },
                                  {
                                    text: String(category.quantity),
                                    alignment: "center",
                                    margin: [0, 6, 0, 6],
                                  },
                                  {
                                    text: formatCurrency(category.montant),
                                    alignment: "right",
                                    margin: [0, 6, 0, 6],
                                  },
                                ]),
                              ],
                            },
                            layout: {
                              hLineColor: () => "#EAECF0",
                              vLineColor: () => "#EAECF0",
                            },
                          },
                          {
                            margin: [0, 18, 0, 0],
                            columns: [
                              {
                                width: "*",
                                stack: [
                                  {
                                    text: "Acces detaille",
                                    fontSize: 11,
                                    bold: true,
                                    color: "#D92D20",
                                    margin: [0, 0, 0, 8],
                                  },
                                  { qr: context.detailUrl, fit: 90, foreground: "#101828" },
                                  {
                                    text: context.detailUrl,
                                    fontSize: 8,
                                    color: "#667085",
                                    margin: [0, 8, 0, 0],
                                  },
                                ],
                              },
                              {
                                width: 170,
                                margin: [0, 6, 0, 0],
                                stack: [
                                  {
                                    columns: [
                                      { text: "Total lignes", color: "#667085" },
                                      {
                                        text: String(context.totals.quantity),
                                        alignment: "right",
                                        bold: true,
                                      },
                                    ],
                                  },
                                  {
                                    columns: [
                                      { text: "Montant cumule", color: "#667085" },
                                      {
                                        text: formatCurrency(context.totals.montant),
                                        alignment: "right",
                                        bold: true,
                                      },
                                    ],
                                    margin: [0, 8, 0, 0],
                                  },
                                  {
                                    columns: [
                                      { text: "Reference", color: "#667085" },
                                      {
                                        text: context.documentReference,
                                        alignment: "right",
                                        bold: true,
                                        fontSize: 9,
                                      },
                                    ],
                                    margin: [0, 8, 0, 0],
                                  },
                                ],
                              },
                            ],
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
          ],
        },
        layout: "noBorders",
      },
    ],
  };
};

const buildDetailDefinition = async (context: PaymentReportContext) => {
  const logoSvg = await readBrandLogoSvg();

  return {
    pageSize: "A4",
    pageMargins: [28, 28, 28, 28],
    defaultStyle: {
      font: "Roboto",
      fontSize: 9,
      color: "#344054",
      lineHeight: 1.35,
    },
    content: [
      {
        columns: [
          { width: 150, svg: logoSvg },
          {
            width: "*",
            alignment: "right",
            stack: [
              {
                text: `${context.reportTypeLabel} - detail`,
                fontSize: 18,
                bold: true,
                color: "#101828",
              },
              { text: context.documentReference, margin: [0, 4, 0, 0], color: "#667085" },
              { text: context.periodLabel, margin: [0, 2, 0, 0], color: "#667085" },
            ],
          },
        ],
      },
      {
        margin: [0, 16, 0, 0],
        columns: [
          {
            width: "50%",
            stack: [
              {
                text: context.modalite.designation,
                fontSize: 13,
                bold: true,
                color: "#101828",
              },
              { text: `Slug : ${context.modalite.slug}`, margin: [0, 4, 0, 0] },
              { text: `Annee : ${context.annee.designation}`, margin: [0, 2, 0, 0] },
            ],
          },
          {
            width: "50%",
            alignment: "right",
            stack: [
              { text: `Frais : ${context.frais.designation}`, bold: true, color: "#101828" },
              {
                text: `Promotion : ${context.frais.promotionDesignation}`,
                margin: [0, 4, 0, 0],
              },
              { text: `Operateur : ${context.currentUserName}`, margin: [0, 2, 0, 0] },
            ],
          },
        ],
      },
      ...context.categories.flatMap((category) => [
        {
          margin: [0, 18, 0, 8],
          text: `${category.label} (${category.quantity})`,
          fontSize: 12,
          bold: true,
          color: "#D92D20",
        },
        category.transactions.length > 0
          ? {
              table: {
                widths: ["*", 80, 95, 85, 75],
                headerRows: 1,
                body: [
                  [
                    { text: "Etudiant", fillColor: "#F2F4F7", bold: true },
                    { text: "Matricule", fillColor: "#F2F4F7", bold: true },
                    { text: "Commande", fillColor: "#F2F4F7", bold: true },
                    { text: "Date", fillColor: "#F2F4F7", bold: true },
                    {
                      text: "Montant",
                      fillColor: "#F2F4F7",
                      bold: true,
                      alignment: "right",
                    },
                  ],
                  ...category.transactions.map((transaction) => [
                    transaction.studentName,
                    transaction.matricule,
                    transaction.orderNumber,
                    transaction.createdAt ? formatDateTime(new Date(transaction.createdAt)) : "-",
                    { text: formatCurrency(transaction.amount), alignment: "right" },
                  ]),
                ],
              },
              layout: {
                hLineColor: () => "#EAECF0",
                vLineColor: () => "#EAECF0",
              },
            }
          : {
              text: "Aucune transaction pour cette categorie sur la periode selectionnee.",
              color: "#667085",
              italics: true,
            },
      ]),
    ],
  };
};

const renderPdfBuffer = async (definition: unknown) => {
  const document = printer.createPdfKitDocument(definition);
  return streamToBuffer(document);
};

export const buildPaymentSummaryPdfBuffer = async (context: PaymentReportContext) =>
  renderPdfBuffer(await buildSummaryDefinition(context));

export const buildPaymentDetailPdfBuffer = async (context: PaymentReportContext) =>
  renderPdfBuffer(await buildDetailDefinition(context));

const assertEntraConfig = () => {
  if (!ENTRA_TENANT_ID || !ENTRA_CLIENT_ID || !ENTRA_CLIENT_SECRET) {
    throw new Error("Configuration Entra ID incomplete pour l'envoi du rapport.");
  }
};

const getGraphAccessToken = async () => {
  assertEntraConfig();

  const response = await fetch(
    `https://login.microsoftonline.com/${ENTRA_TENANT_ID}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: ENTRA_CLIENT_ID!,
        client_secret: ENTRA_CLIENT_SECRET!,
        scope: "https://graph.microsoft.com/.default",
        grant_type: "client_credentials",
      }),
      cache: "no-store",
    },
  );

  const payload = (await response.json()) as {
    access_token?: string;
    error_description?: string;
  };

  if (!response.ok || !payload.access_token) {
    throw new Error(payload.error_description ?? "Impossible d'obtenir le jeton Graph.");
  }

  return payload.access_token;
};

export const sendPaymentReportByMail = async ({
  context,
  pdfBuffer,
}: {
  context: PaymentReportContext;
  pdfBuffer: Buffer;
}) => {
  if (!COGE_MAIL) {
    throw new Error("COGE_MAIL est absent des variables d'environnement.");
  }

  if (!context.currentUserEmail) {
    throw new Error("L'utilisateur courant n'a pas d'adresse email exploitable pour la copie.");
  }

  const accessToken = await getGraphAccessToken();
  const sender = context.currentUserEmail;
  const filename = `rapport-${context.reportType}-${context.modalite.slug || context.modaliteId}-${context.generatedAt.getTime()}.pdf`;

  const response = await fetch(
    `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(sender)}/sendMail`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${accessToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        message: {
          subject: `${context.reportTypeLabel} - ${context.modalite.designation}`,
          body: {
            contentType: "HTML",
            content: [
              "<p>Bonjour,</p>",
              `<p>Veuillez trouver en piece jointe le ${context.reportTypeLabel.toLowerCase()} de la modalite <strong>${context.modalite.designation}</strong>.</p>`,
              `<p>Periode : <strong>${context.periodLabel}</strong><br/>Reference : <strong>${context.documentReference}</strong></p>`,
            ].join(""),
          },
          toRecipients: [
            {
              emailAddress: {
                address: COGE_MAIL,
              },
            },
          ],
          ccRecipients: [
            {
              emailAddress: {
                address: context.currentUserEmail,
              },
            },
          ],
          attachments: [
            {
              "@odata.type": "#microsoft.graph.fileAttachment",
              name: filename,
              contentType: "application/pdf",
              contentBytes: pdfBuffer.toString("base64"),
            },
          ],
        },
        saveToSentItems: true,
      }),
      cache: "no-store",
    },
  );

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as
      | {
          error?: {
            message?: string;
          };
        }
      | null;

    throw new Error(payload?.error?.message ?? "Echec d'envoi du rapport par email via Graph.");
  }

  return {
    to: COGE_MAIL,
    cc: context.currentUserEmail,
    filename,
  };
};
