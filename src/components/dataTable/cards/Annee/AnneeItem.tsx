"use client";

import React, { useTransition } from "react";
import Button from "@/components/ui/button/Button";
import type { AnneeRecord } from "@/lib/utils/supabase/annees";
import Switch from "@/components/form/switch/Switch";
import { toggleAnneeActiveAction } from "@/app/actions/annees";

interface AnneeItemProps {
  item: AnneeRecord;
  onDetail?: (item: AnneeRecord) => void;
  onDelete?: (item: AnneeRecord) => void;
}

export default function AnneeItem({ item, onDetail, onDelete }: AnneeItemProps) {
  const [isPending, startTransition] = useTransition();
  const isActivate = item.active === true || item.active === "true";

  const handleToggle = () => {
    startTransition(async () => {
      try {
        await toggleAnneeActiveAction(item.id, !isActivate);
      } catch (error) {
        console.error("Failed to toggle annee state", error);
      }
    });
  };

  return (
    <div className="flex flex-col justify-between rounded-xl border border-gray-200 bg-white p-5 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
      <div>
        <div className="mb-4 flex items-start justify-between">
          <div className="flex flex-col gap-1">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
              {item.designation || "Année sans nom"}
            </h3>
            <div className="flex items-center gap-2">
              <Switch
                label={isActivate ? "Active" : "Inactive"}
                checked={isActivate}
                onChange={handleToggle}
                disabled={isPending}
              />
            </div>
          </div>
          <span
            className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
              isActivate
                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200"
                : "bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-gray-300"
            }`}
          >
            {isActivate ? "Active" : "Inactive"}
          </span>
        </div>

        <div className="space-y-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Période</p>
            <p className="mt-0.5 text-sm font-medium text-gray-800 dark:text-gray-200">
              {item.date_debut ? new Date(item.date_debut).toLocaleDateString() : "—"} -{" "}
              {item.date_fin ? new Date(item.date_fin).toLocaleDateString() : "—"}
            </p>
          </div>
          {item.description && (
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Description</p>
              <p className="mt-0.5 text-sm font-medium text-gray-800 line-clamp-2 dark:text-gray-200">
                {item.description}
              </p>
            </div>
          )}
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
              if (window.confirm("Voulez-vous vraiment supprimer cette année ?")) {
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
