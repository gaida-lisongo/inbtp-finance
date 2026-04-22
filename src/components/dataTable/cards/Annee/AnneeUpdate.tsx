"use client";

import React, { useState } from "react";
import Button from "@/components/ui/button/Button";
import type { AnneeRecord } from "@/lib/utils/supabase/annees";

interface AnneeUpdateProps {
  item: AnneeRecord;
  onUpdate?: (payload: any) => void;
  onClose?: () => void;
}

export default function AnneeUpdate({ item, onUpdate, onClose }: AnneeUpdateProps) {
  const [designation, setDesignation] = useState(item.designation || "");
  const [dateDebut, setDateDebut] = useState(item.date_debut ? item.date_debut.split("T")[0] : "");
  const [dateFin, setDateFin] = useState(item.date_fin ? item.date_fin.split("T")[0] : "");
  const [description, setDescription] = useState(item.description || "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdate?.({
      id: item.id,
      designation,
      date_debut: dateDebut || null,
      date_fin: dateFin || null,
      description: description || null,
    });
  };

  return (
    <div className="p-6 sm:p-8">
      <h3 className="mb-6 text-xl font-semibold text-gray-800 dark:text-white/90">Modifier l'Année Académique</h3>
      
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
            Désignation
          </label>
          <input
            type="text"
            required
            value={designation}
            onChange={(e) => setDesignation(e.target.value)}
            className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
              Date de début
            </label>
            <input
              type="date"
              required
              value={dateDebut}
              onChange={(e) => setDateDebut(e.target.value)}
              className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
              Date de fin
            </label>
            <input
              type="date"
              required
              value={dateFin}
              onChange={(e) => setDateFin(e.target.value)}
              className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
            />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
          />
        </div>

        <div className="mt-8 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-300 px-5 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]"
          >
            Annuler
          </button>
          <Button type="submit">Enregistrer</Button>
        </div>
      </form>
    </div>
  );
}
