import type { Metadata } from "next";
import { cookies } from "next/headers";

import DashboardWorkspace from "@/components/ecommerce/DashboardWorkspace";
import type { DashboardModaliteItem } from "@/components/ecommerce/BlocProduct";
import type { DashboardFraisItem } from "@/components/ecommerce/ListeWhatchlist";
import type { DashboardYearOption } from "@/components/ecommerce/MonthlySalesChart";
import type { DashboardPaymentRow } from "@/components/ecommerce/RecentOrders";
import DashboardRealtimeRefresher from "@/components/ecommerce/DashboardRealtimeRefresher";
import { createClient as createServerSupabaseClient } from "@/lib/utils/supabase/server";

type DashboardPageProps = {
  searchParams: Promise<{
    annee?: string;
  }>;
};

type AnneeRecord = {
  id: string;
  designation: string | null;
  debut: string | null;
  fin: string | null;
  status: string | null;
};

type FraisRecord = {
  id: string;
  designation: string | null;
  description: string | null;
  montant: number | null;
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
};

type ModaliteRecord = {
  id: number;
  designation: string | null;
  slug: string | null;
  montant: number | null;
  description: string | null;
  status: string | null;
  annee_id: string | null;
  frais_id: string | null;
  groupe_id: string | null;
};

type EtudiantRelation = {
  id: string;
  nom: string | null;
  matricule: string | null;
  email: string | null;
} | null;

type PaiementRecord = {
  id: string;
  created_at: string | null;
  etudiant_id: string | null;
  montant: number | null;
  status: string | null;
  orderNumber: string | null;
  modalite_id: number | null;
  etudiants: EtudiantRelation | EtudiantRelation[];
};

export const metadata: Metadata = {
  title: "Dashboard | INBTP Plateforme",
  description: "Vue d'ensemble des encaissements et des modalites de paiement",
};

const formatDateLabel = (value: string | null) => {
  if (!value) {
    return "Date inconnue";
  }

  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
};

const normalizeStatus = (value: string | null) => (value ?? "").trim().toLowerCase();

const getPromotionRelation = (relation: FraisRecord["promotions"]) =>
  Array.isArray(relation) ? relation[0] ?? null : relation;

const getEtudiantRelation = (relation: PaiementRecord["etudiants"]) =>
  Array.isArray(relation) ? relation[0] ?? null : relation;

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const { annee: requestedAnneeId } = await searchParams;
  const cookieStore = await cookies();
  const supabase = createServerSupabaseClient(cookieStore);

  const { data: anneesRaw, error: anneesError } = await supabase
    .from("annees")
    .select("id, designation, debut, fin, status")
    .order("debut", { ascending: false });

  if (anneesError) {
    throw new Error(anneesError.message);
  }

  const annees = (anneesRaw ?? []) as AnneeRecord[];
  const selectedAnnee =
    annees.find((annee) => annee.id === requestedAnneeId) ?? annees[0] ?? null;

  const yearOptions: DashboardYearOption[] = annees.map((annee) => ({
    id: annee.id,
    label: annee.designation ?? "Annee sans designation",
    subtitle:
      annee.debut && annee.fin
        ? `${formatDateLabel(annee.debut)} - ${formatDateLabel(annee.fin)}`
        : annee.status ?? "Annee academique",
  }));

  if (!selectedAnnee) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-300 px-6 py-12 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
        Aucune annee academique n&apos;est disponible pour construire la dashboard.
      </div>
    );
  }

  const [{ data: fraisRaw, error: fraisError }, { data: modalitesRaw, error: modalitesError }] =
    await Promise.all([
      supabase
        .from("frais")
        .select("id, designation, description, montant, promotion_id, promotions(id, designation, slug)")
        .order("designation", { ascending: true }),
      supabase
        .from("modalites")
        .select("id, designation, slug, montant, description, status, annee_id, frais_id, groupe_id")
        .eq("annee_id", selectedAnnee.id)
        .order("designation", { ascending: true }),
    ]);

  if (fraisError) {
    throw new Error(fraisError.message);
  }

  if (modalitesError) {
    throw new Error(modalitesError.message);
  }

  const frais = (fraisRaw ?? []) as FraisRecord[];
  const modalites = (modalitesRaw ?? []) as ModaliteRecord[];
  const modaliteIds = modalites.map((modalite) => modalite.id);

  const { data: paiementsRaw, error: paiementsError } = modaliteIds.length
    ? await supabase
        .from("paiements")
        .select("id, created_at, etudiant_id, montant, status, orderNumber, modalite_id, etudiants(id, nom, matricule, email)")
        .in("modalite_id", modaliteIds)
        .order("created_at", { ascending: false })
    : { data: [], error: null };

  if (paiementsError) {
    throw new Error(paiementsError.message);
  }

  const paiements = (paiementsRaw ?? []) as PaiementRecord[];

  const successPaiements = paiements.filter((paiement) => normalizeStatus(paiement.status) === "success");
  const pendingPaiements = paiements.filter((paiement) => normalizeStatus(paiement.status) === "pending");

  const monthlyAmounts = Array.from({ length: 12 }, () => 0);
  for (const paiement of successPaiements) {
    if (!paiement.created_at) {
      continue;
    }

    const monthIndex = new Date(paiement.created_at).getMonth();
    monthlyAmounts[monthIndex] += paiement.montant ?? 0;
  }

  const paiementsByModalite = new Map<number, PaiementRecord[]>();
  for (const paiement of paiements) {
    if (!paiement.modalite_id) {
      continue;
    }

    const list = paiementsByModalite.get(paiement.modalite_id) ?? [];
    list.push(paiement);
    paiementsByModalite.set(paiement.modalite_id, list);
  }

  const modalitesByFrais = new Map<string, DashboardModaliteItem[]>();
  for (const modalite of modalites) {
    if (!modalite.frais_id) {
      continue;
    }

    const linkedPaiements = paiementsByModalite.get(modalite.id) ?? [];
    const collectedAmount = linkedPaiements
      .filter((paiement) => normalizeStatus(paiement.status) === "success")
      .reduce((sum, paiement) => sum + (paiement.montant ?? 0), 0);
    const pendingAmount = linkedPaiements
      .filter((paiement) => normalizeStatus(paiement.status) === "pending")
      .reduce((sum, paiement) => sum + (paiement.montant ?? 0), 0);

    const currentList = modalitesByFrais.get(modalite.frais_id) ?? [];
    currentList.push({
      id: modalite.id,
      designation: modalite.designation ?? "Modalite sans designation",
      slug: modalite.slug ?? "",
      montant: modalite.montant,
      description: modalite.description ?? "",
      status: modalite.status ?? "",
      fraisId: modalite.frais_id,
      groupeId: modalite.groupe_id,
      collectedAmount,
      pendingAmount,
      paymentsCount: linkedPaiements.length,
      successCount: linkedPaiements.filter((paiement) => normalizeStatus(paiement.status) === "success").length,
    });
    modalitesByFrais.set(modalite.frais_id, currentList);
  }

  const dashboardFrais: DashboardFraisItem[] = frais.map((item) => {
    const promotion = getPromotionRelation(item.promotions);
    const linkedModalites = modalitesByFrais.get(item.id) ?? [];
    const collectedAmount = linkedModalites.reduce((sum, modalite) => sum + modalite.collectedAmount, 0);
    const pendingAmount = linkedModalites.reduce((sum, modalite) => sum + modalite.pendingAmount, 0);

    return {
      id: item.id,
      designation: item.designation ?? "Frais sans designation",
      description: item.description ?? "",
      montant: item.montant,
      promotionLabel: promotion?.designation ?? "Promotion non definie",
      promotionSlug: promotion?.slug ?? "",
      modalitesCount: linkedModalites.length,
      collectedAmount,
      pendingAmount,
    };
  });

  const latestPayments: DashboardPaymentRow[] = paiements.slice(0, 10).map((paiement) => {
    const etudiant = getEtudiantRelation(paiement.etudiants);
    const modalite = modalites.find((item) => item.id === paiement.modalite_id);

    return {
      id: paiement.id,
      orderNumber: paiement.orderNumber ?? "-",
      createdAt: paiement.created_at,
      montant: paiement.montant,
      status: paiement.status ?? "unknown",
      modaliteLabel: modalite?.designation ?? "Modalite inconnue",
      etudiantLabel: etudiant?.nom ?? "Etudiant inconnu",
      matricule: etudiant?.matricule ?? "-",
    };
  });

  return (
    <div className="space-y-6">
      <DashboardRealtimeRefresher />

      <DashboardWorkspace
        selectedAnneeLabel={selectedAnnee.designation ?? "Annee academique"}
        collectedAmount={successPaiements.reduce((sum, paiement) => sum + (paiement.montant ?? 0), 0)}
        collectedCount={successPaiements.length}
        pendingAmount={pendingPaiements.reduce((sum, paiement) => sum + (paiement.montant ?? 0), 0)}
        pendingCount={pendingPaiements.length}
        yearOptions={yearOptions}
        selectedYearId={selectedAnnee.id}
        monthlyAmounts={monthlyAmounts}
        totalCollectedAmount={successPaiements.reduce((sum, paiement) => sum + (paiement.montant ?? 0), 0)}
        transactionCount={successPaiements.length}
        frais={dashboardFrais}
        modalitesByFrais={Object.fromEntries(modalitesByFrais)}
        payments={latestPayments}
      />
    </div>
  );
}
