"use client";

import React from "react";
import type { JuryWithMembers } from "@/lib/utils/supabase/jury";
import Button from "@/components/ui/button/Button";

interface JuryItemProps {
  item: JuryWithMembers;
  onDetail?: (item: JuryWithMembers) => void;
  onDelete?: (item: JuryWithMembers) => void;
}

export default function JuryItem({ item, onDetail, onDelete }: JuryItemProps) {
  const presidentName = [item.president?.prenom, item.president?.post_nom, item.president?.nom].filter(Boolean).join(" ") || "Non défini";
  const secretaireName = [item.secretaire?.prenom, item.secretaire?.post_nom, item.secretaire?.nom].filter(Boolean).join(" ") || "Non défini";

  return (
    <div className="flex flex-col justify-between rounded-xl border border-gray-200 bg-white p-5 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
      <div>
        <div className="mb-1 flex items-start justify-between">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            {item.designation || "Jury sans nom"}
          </h3>
          <span
            className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
              item.isActivate
                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200"
                : "bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-gray-300"
            }`}
          >
            {item.isActivate ? "Actif" : "Inactif"}
          </span>
        </div>

        {item.annee?.designation && (
          <p className="mb-4 text-xs text-gray-500 dark:text-gray-400">
            Année : <span className="font-medium text-gray-700 dark:text-gray-300">{item.annee.designation}</span>
          </p>
        )}

        <div className="space-y-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Président</p>
            <p className="mt-0.5 text-sm font-medium text-gray-800 dark:text-gray-200">{presidentName}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Secrétaire</p>
            <p className="mt-0.5 text-sm font-medium text-gray-800 dark:text-gray-200">{secretaireName}</p>
          </div>
        </div>
      </div>

      <div className="mt-6 flex justify-end gap-3">
        {onDetail && (
          <button
            onClick={() => onDetail(item)}
            className="text-sm font-medium text-brand-500 hover:text-brand-600"
          >
            Modifier
          </button>
        )}
        {onDelete && (
          <button
            onClick={() => {
              if (window.confirm("Voulez-vous vraiment supprimer ce jury ?")) {
                onDelete(item);
              }
            }}
            className="text-sm font-medium text-error-500 hover:text-error-600"
          >
            Supprimer
          </button>
        )}
      </div>
    </div>
  );
}
