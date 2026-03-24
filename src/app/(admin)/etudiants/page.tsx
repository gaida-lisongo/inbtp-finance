import { cookies } from "next/headers";
import { Metadata } from "next";

import ComponentCard from "@/components/common/ComponentCard";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import EtudiantsDataTable, {
  type EtudiantRecord,
} from "@/components/etudiants/EtudiantsDataTable";
import { createClient as createServerSupabaseClient } from "@/lib/utils/supabase/server";

export const metadata: Metadata = {
  title: "Etudiants | Gestion Finance Ecole",
  description: "Gestion des etudiants de l'etablissement",
};

async function getEtudiants(): Promise<EtudiantRecord[]> {
  const cookieStore = await cookies();
  const supabase = createServerSupabaseClient(cookieStore);
  const { data, error } = await supabase
    .from("etudiants")
    .select("id, created_at, nom, email, matricule, sexe, entraId")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as EtudiantRecord[];
}

export default async function EtudiantsPage() {
  const etudiants = await getEtudiants();

  return (
    <div className="space-y-6">
      <PageBreadcrumb pageTitle="Etudiants" />

      <ComponentCard
        title="Table des etudiants"
        desc="Consultez, creez, modifiez, supprimez et importez les etudiants depuis cette interface."
      >
        <EtudiantsDataTable etudiants={etudiants} />
      </ComponentCard>
    </div>
  );
}
