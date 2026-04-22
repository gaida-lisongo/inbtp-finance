"use client";

import React from "react";
import DataTable from "@/components/dataTable";
import AnneeItem from "@/components/dataTable/cards/Annee/AnneeItem";
import AnneeCreate from "@/components/dataTable/cards/Annee/AnneeCreate";
import AnneeUpdate from "@/components/dataTable/cards/Annee/AnneeUpdate";
import { 
  createAnneeAction, 
  updateAnneeAction, 
  deleteAnneeAction 
} from "@/app/actions/annees";
import type { AnneeRecord } from "@/lib/utils/supabase/annees";

interface AnneeClientWrapperProps {
  initialAnnees: AnneeRecord[];
}

export default function AnneeClientWrapper({ initialAnnees }: AnneeClientWrapperProps) {
  const searchFilter = (item: AnneeRecord, query: string) => {
    const q = query.toLowerCase();
    return (
      (item.designation?.toLowerCase().includes(q) || false) ||
      (item.description?.toLowerCase().includes(q) || false)
    );
  };

  return (
    <DataTable<AnneeRecord>
      title="Gestion des années académiques"
      description="Définissez les années disponibles dans le système. Une nouvelle année est inactive par défaut."
      items={initialAnnees}
      CardItem={AnneeItem}
      CardDetail={AnneeUpdate}
      CardCreate={AnneeCreate}
      onCreate={createAnneeAction}
      onUpdate={updateAnneeAction}
      onDelete={async (item) => {
        return await deleteAnneeAction(item.id);
      }}
      searchFilter={searchFilter}
      searchPlaceholder="Rechercher une année ou description..."
      createLabel="Nouvelle Année"
      emptyMessage="Aucune année enregistrée."
    />
  );
}
