import fs from "node:fs/promises";
import path from "node:path";

import { cookies } from "next/headers";

import { getCurrentAuthProfile } from "@/lib/utils/supabase/auth";
import { createClient as createServerSupabaseClient } from "@/lib/utils/supabase/server";

const pdfmake = require("pdfmake");

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
  etudiant_id?: string | null;
  montant: number | null;
  status: string | null;
  orderNumber: string | null;
  modalite_id?: number | null;
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

const reportFonts = {
  Roboto: {
    normal: path.join(process.cwd(), "node_modules/pdfmake/fonts/Roboto/Roboto-Regular.ttf"),
    bold: path.join(process.cwd(), "node_modules/pdfmake/fonts/Roboto/Roboto-Medium.ttf"),
    italics: path.join(process.cwd(), "node_modules/pdfmake/fonts/Roboto/Roboto-Italic.ttf"),
    bolditalics: path.join(
      process.cwd(),
      "node_modules/pdfmake/fonts/Roboto/Roboto-MediumItalic.ttf",
    ),
  },
};
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

const isDateInRange = (value: string | null, start: Date, end: Date) => {
  if (!value) {
    return false;
  }

  const date = new Date(value);
  const time = date.getTime();

  return time >= start.getTime() && time <= end.getTime();
};

const buildDocumentReference = (modaliteId: number, reportType: PaymentReportType, timestamp: number) =>
  `RPT-${reportType.toUpperCase()}-${modaliteId}-${timestamp}`;

const readBrandLogoAsset = async (): Promise<
  | {
      image: string;
      width: number;
    }
  | {
      svg: string;
      width: number;
    }
> => {
  const pngPath = path.join(process.cwd(), "public/images/logo/logo.png");
  const preferredSvgPath = path.join(process.cwd(), "public/images/logo/logo-congo.svg");
  const fallbackSvgPath = path.join(process.cwd(), "public/images/logo/logo.svg");

  try {
    const imageBuffer = await fs.readFile(pngPath);

    return {
      image: `data:image/png;base64,${imageBuffer.toString("base64")}`,
      width: 140,
    };
  } catch {
    try {
      return {
        svg: await fs.readFile(preferredSvgPath, "utf8"),
        width: 140,
      };
    } catch {
      return {
        svg: await fs.readFile(fallbackSvgPath, "utf8"),
        width: 140,
      };
    }
  }
};

const buildBrandLogoNode = async () => {
  const asset = await readBrandLogoAsset();

  if ("image" in asset) {
    return {
      image: asset.image,
      width: asset.width * 0.4,
      height: (asset.width * 0.4)
    };
  }

  return {
    svg: asset.svg,
    width: asset.width,
  };
};

const getEmailLogoDataUri = async () => {
  const pngPath = path.join(process.cwd(), "public/images/logo/logo.png");

  try {
    const imageBuffer = await fs.readFile(pngPath);
    return `data:image/png;base64,${imageBuffer.toString("base64")}`;
  } catch {
    return null;
  }
};

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
}: {
  reportType: PaymentReportType;
  anchor: Date;
}) => {
  let periodStart: Date;
  let periodEnd: Date;

  switch (reportType) {
    case "journalier":
      periodStart = startOfDay(anchor);
      periodEnd = endOfDay(anchor);
      break;
    case "hebdomadaire":
      periodStart = startOfWeek(anchor);
      periodEnd = endOfWeek(anchor);
      break;
    case "mensuel":
      periodStart = startOfMonth(anchor);
      periodEnd = endOfMonth(anchor);
      break;
    case "semestriel": {
      periodStart = addDays(startOfDay(anchor), -182);
      periodEnd = endOfDay(anchor);
      break;
    }
    case "annuel":
      periodStart = new Date(anchor.getFullYear(), 0, 1);
      periodEnd = new Date(anchor.getFullYear(), 11, 31, 23, 59, 59, 999);
      break;
  }

  return {
    start: periodStart,
    end: periodEnd,
    label: `${formatDate(periodStart)} au ${formatDate(periodEnd)}`,
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
  const generatedAt = new Date(timestamp);
  const period = computeReportPeriod({
    reportType,
    anchor: generatedAt,
  });

  const { data: paiementsRaw, error: paiementsError } = await supabase
    .from("paiements")
    .select(
      "id, created_at, etudiant_id, montant, status, orderNumber, modalite_id, etudiants(id, nom, matricule, email)",
    )
    .eq("modalite_id", modaliteId)
    .order("created_at", { ascending: false });

  if (paiementsError) {
    throw new Error(paiementsError.message);
  }

  const allPaiements = (paiementsRaw ?? []) as PaiementRow[];
  const paiements = allPaiements.filter((paiement) =>
    isDateInRange(paiement.created_at, period.start, period.end),
  );
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

  for (const paiement of paiements) {
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
  const brandLogoNode = await buildBrandLogoNode();

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
                stack: [
                  {
                    margin: [16, 18, 16, 0],
                    stack: [
                      { text: "République Démocratique du Congo", color: "#4f4d4d", fontSize: 9,
                        margin: [0, 0, 0, 2], bold: true, alignment: "center" },
                      { text: "Ministère de l'Enseignement Supérieur Universitaire, Recherche et Innovations", color: "#4f4d4d", fontSize: 9,
                        margin: [0, 0, 0, 2], bold: true, alignment: "center" },
                      { text: `${process.env.NEXT_PUBLIC_SCHOOL_NAME ?? "Votre ecole"}`, color: "#4f4d4d", fontSize: 9,
                        margin: [0, 0, 0, 2], bold: true, alignment: "center" },
                      { ...brandLogoNode, margin: [0, 0, 0, 8], alignment: "center" },
                      {
                        text: `SERVICE DE FINANCE`,
                        color: "#101828",
                        bold: true,
                        fontSize: 18,
                        alignment: "center",

                      },
                    ],
                  },
                  {
                    margin: [16, 100, 16, 0],                    
                    stack: [
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
                        margin: [0, 2, 0, 15],
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
                        margin: [0, 2, 0, 15],
                      },
                      {
                        text: "Description de la modalite",
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
                  }
                ]
              },
              {
                margin: [20, 12, 8, 0],
                stack: [
                  {
                    columns: [
                      {
                        width: "*",
                        alignment: "right",
                        stack: [
                          {
                            text: context.frais.designation,
                            fontSize: 20,
                            bold: true,
                            color: "#101828",
                          },
                          {
                            text: context.reportTypeLabel.toUpperCase(),
                            color: "#101828",
                            bold: true,
                            fontSize: 18,
                            margin: [0, 0, 0, 16],
                          },
                          { text: "Auteur", color: "#D92D20", fontSize: 9, bold: true },
                          { text: context.currentUserName.toUpperCase(), color: "#101828", margin: [0, 2, 0, 0] },
                          {
                            text: context.currentUserEmail || "-",
                            color: "#101828",
                            margin: [0, 2, 0, 10],
                          },
                          { text: "N/Ref", color: "#D92D20", fontSize: 9, bold: true },
                          { text: context.documentReference, color: "#101828", margin: [0, 2, 0, 0] },
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
                    margin: [0, 95, 0, 0],
                    stack: [
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
                            margin: [0, 8, 0, 20],
                          },
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
  const brandLogoNode = await buildBrandLogoNode();

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
          brandLogoNode,
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
  pdfmake.setFonts(reportFonts);
  const document = pdfmake.createPdf(definition);
  return document.getBuffer();
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
  const emailLogo = await getEmailLogoDataUri();
  const htmlContent = `
    <div style="margin:0;padding:0;background-color:#f4f6fb;font-family:Arial,'Helvetica Neue',Helvetica,sans-serif;color:#1d2939;">
      <div style="max-width:720px;margin:0 auto;padding:32px 20px;">
        <div style="background:linear-gradient(135deg,#f8fafc 0%,#eef2f6 100%);border:1px solid #e4e7ec;border-bottom:none;border-radius:28px 28px 0 0;padding:28px 32px 22px 32px;">
          ${
            emailLogo
              ? `<img src="${emailLogo}" alt="ElmesFin" style="display:block;width:160px;max-width:100%;height:auto;margin-bottom:18px;" />`
              : ""
          }
          <div style="display:inline-block;padding:6px 12px;border-radius:999px;background:#e0e7ff;color:#312e81;font-size:12px;letter-spacing:.12em;text-transform:uppercase;">
            ElmesFin · Rapport financier
          </div>
          <h1 style="margin:18px 0 8px 0;font-size:28px;line-height:1.2;color:#101828;">
            Transmission a la Direction generale
          </h1>
          <p style="margin:0;color:#344054;font-size:15px;line-height:1.7;">
            Monsieur le Directeur General, veuillez trouver ci-joint le ${context.reportTypeLabel.toLowerCase()} de la modalite <strong style="color:#101828;">${context.modalite.designation}</strong>.
          </p>
        </div>

        <div style="background:#ffffff;border:1px solid #e4e7ec;border-top:none;border-radius:0 0 28px 28px;padding:32px;">
          <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px;margin-bottom:28px;">
            <div style="background:#f8fafc;border:1px solid #e4e7ec;border-radius:18px;padding:18px;">
              <div style="font-size:12px;text-transform:uppercase;letter-spacing:.08em;color:#667085;margin-bottom:8px;">Modalite</div>
              <div style="font-size:18px;font-weight:700;color:#101828;margin-bottom:6px;">${context.modalite.designation}</div>
              <div style="font-size:14px;color:#475467;">Slug : ${context.modalite.slug}</div>
              <div style="font-size:14px;color:#475467;margin-top:4px;">Montant : ${formatCurrency(context.modalite.montant)}</div>
            </div>
            <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:18px;padding:18px;">
              <div style="font-size:12px;text-transform:uppercase;letter-spacing:.08em;color:#c2410c;margin-bottom:8px;">Reference</div>
              <div style="font-size:16px;font-weight:700;color:#7c2d12;margin-bottom:6px;">${context.documentReference}</div>
              <div style="font-size:14px;color:#9a3412;">Periode : ${context.periodLabel}</div>
              <div style="font-size:14px;color:#9a3412;margin-top:4px;">Genere le : ${formatDateTime(context.generatedAt)}</div>
            </div>
          </div>

          <div style="background:#f9fafb;border:1px solid #eaecf0;border-radius:20px;padding:20px;margin-bottom:28px;">
            <div style="font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#667085;margin-bottom:14px;">Synthese de perception</div>
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
              <tbody>
                ${context.categories
                  .map(
                    (category) => `
                  <tr>
                    <td style="padding:10px 0;border-bottom:1px solid #eaecf0;color:#344054;font-size:14px;">${category.label}</td>
                    <td style="padding:10px 0;border-bottom:1px solid #eaecf0;color:#101828;font-size:14px;text-align:center;font-weight:600;">${category.quantity}</td>
                    <td style="padding:10px 0;border-bottom:1px solid #eaecf0;color:#101828;font-size:14px;text-align:right;font-weight:700;">${formatCurrency(category.montant)}</td>
                  </tr>`,
                  )
                  .join("")}
              </tbody>
            </table>
          </div>

          <div style="padding:22px;border-radius:22px;background:linear-gradient(135deg,#eff6ff 0%,#eef2ff 100%);border:1px solid #c7d2fe;margin-bottom:28px;">
            <div style="font-size:20px;font-weight:700;color:#1e3a8a;margin-bottom:8px;">Consulter les paiements en ligne</div>
            <p style="margin:0 0 18px 0;font-size:14px;line-height:1.7;color:#3730a3;">
              Avant d'ouvrir la piece jointe, vous pouvez consulter directement le detail des transactions liees a ce rapport via le lien securise ci-dessous.
            </p>
            <a href="${context.detailUrl}" style="display:inline-block;padding:14px 22px;border-radius:14px;background:#1d4ed8;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;">
              Voir le detail des paiements
            </a>
          </div>

          <div style="font-size:14px;line-height:1.8;color:#475467;">
            <p style="margin:0 0 10px 0;">
              Frais rattache : <strong style="color:#101828;">${context.frais.designation}</strong><br />
              Promotion : <strong style="color:#101828;">${context.frais.promotionDesignation}</strong><br />
              Operateur emetteur : <strong style="color:#101828;">${context.currentUserName}</strong>
            </p>
            <p style="margin:0;">
              Le document PDF officiel est joint a ce message pour archivage, verification et exploitation par le Comite de gestion.
            </p>
          </div>
        </div>
      </div>
    </div>
  `;

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
            content: htmlContent,
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
