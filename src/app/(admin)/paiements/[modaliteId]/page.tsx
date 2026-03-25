import { Metadata } from "next";
import { cookies } from "next/headers";

import ComponentCard from "@/components/common/ComponentCard";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import PaiementsDataTable, {
  type PaiementEtudiantOption,
  type PaiementRecord,
} from "@/components/paiements/PaiementsDataTable";
import { createClient as createServerSupabaseClient } from "@/lib/utils/supabase/server";

type PaiementsPageProps = {
  params: Promise<{
    modaliteId: string;
  }>;
};

export const metadata: Metadata = {
  title: "Paiements | Gestion Finance Ecole",
  description: "Gestion des paiements pour une modalite",
};

export default async function PaiementsPage({ params }: PaiementsPageProps) {
  const { modaliteId } = await params;
  const cookieStore = await cookies();
  const supabase = createServerSupabaseClient(cookieStore);

  const numericModaliteId = Number(modaliteId);

  const [{ data: modalite, error: modaliteError }, { data: paiementsRaw, error: paiementsError }, { data: etudiantsRaw, error: etudiantsError }] =
    await Promise.all([
      supabase
        .from("modalites")
        .select("id, designation, slug")
        .eq("id", numericModaliteId)
        .single(),
      supabase
        .from("paiements")
        .select("id, created_at, montant, status, orderNumber, etudiant_id, modalite_id, etudiants(id, nom, matricule)")
        .eq("modalite_id", numericModaliteId)
        .order("created_at", { ascending: false }),
      supabase
        .from("etudiants")
        .select("id, nom, matricule, email")
        .order("nom", { ascending: true }),
    ]);

  if (modaliteError) {
    throw new Error(modaliteError.message);
  }

  if (paiementsError) {
    throw new Error(paiementsError.message);
  }

  if (etudiantsError) {
    throw new Error(etudiantsError.message);
  }

  const paiements = ((paiementsRaw ?? []) as Array<{
    id: string;
    created_at: string | null;
    montant: number | null;
    status: string | null;
    orderNumber: string | null;
    etudiant_id: string | null;
    modalite_id: number | null;
    etudiants:
      | {
          id: string;
          nom: string | null;
          matricule: string | null;
        }
      | {
          id: string;
          nom: string | null;
          matricule: string | null;
        }[]
      | null;
  }>).map((paiement) => {
    const etudiant = Array.isArray(paiement.etudiants)
      ? paiement.etudiants[0] ?? null
      : paiement.etudiants;

    return {
      id: paiement.id,
      created_at: paiement.created_at,
      montant: paiement.montant,
      status: paiement.status,
      orderNumber: paiement.orderNumber,
      etudiant_id: paiement.etudiant_id,
      modalite_id: paiement.modalite_id,
      etudiantNom: etudiant?.nom ?? null,
      etudiantMatricule: etudiant?.matricule ?? null,
    };
  }) as PaiementRecord[];

  const etudiants = (etudiantsRaw ?? []) as PaiementEtudiantOption[];

  return (
    <div className="space-y-6">
      <PageBreadcrumb pageTitle="Paiements" />

      <ComponentCard
        title={`Paiements · ${modalite.designation ?? "Modalite"}`}
        desc={`Gerez les paiements de la modalite ${modalite.slug ?? modalite.id}. Creation simple, modification, suppression et import CSV.`}
      >
        <PaiementsDataTable
          modaliteId={modaliteId}
          paiements={paiements}
          etudiants={etudiants}
        />
      </ComponentCard>
    </div>
  );
}
