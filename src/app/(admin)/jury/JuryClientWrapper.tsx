"use client";

import React from "react";
import DataTable from "@/components/dataTable";
import JuryItem from "@/components/dataTable/cards/jury/JuryItem";
import JuryCreate from "@/components/dataTable/cards/jury/JuryCreate";
import JuryUpdate from "@/components/dataTable/cards/jury/JuryUpdate";
import { createJuryAction, updateJuryAction, deleteJuryAction } from "@/app/actions/jury";
import type { JuryWithMembers } from "@/lib/utils/supabase/jury";

export default function JuryClientWrapper({ juries, anneeId }: { juries: JuryWithMembers[]; anneeId: string }) {
  const searchFilter = (item: JuryWithMembers, query: string) => {
    const q = query.toLowerCase();
    const designationMatch = item.designation?.toLowerCase().includes(q) || false;
    const presidentName = [item.president?.prenom, item.president?.post_nom, item.president?.nom].filter(Boolean).join(" ").toLowerCase();
    const secretaireName = [item.secretaire?.prenom, item.secretaire?.post_nom, item.secretaire?.nom].filter(Boolean).join(" ").toLowerCase();
    return designationMatch || presidentName.includes(q) || secretaireName.includes(q);
  };

  return (
    <DataTable<JuryWithMembers>
      title="Bureaux des jurys"
      description="Gérez les présidents et secrétaires de jurys pour l'année courante."
      items={juries}
      CardItem={JuryItem}
      CardDetail={JuryUpdate}
      CardCreate={JuryCreate}
      onCreate={createJuryAction}
      onUpdate={updateJuryAction}
      onDelete={async (item) => {
        return await deleteJuryAction(item.id);
      }}
      searchFilter={searchFilter}
      searchPlaceholder="Rechercher par jury, président ou secrétaire..."
      createLabel="Nouveau Jury"
      emptyMessage="Aucun jury trouvé pour cette année."
    />
  );
}
