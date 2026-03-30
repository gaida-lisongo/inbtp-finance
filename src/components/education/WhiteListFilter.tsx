"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/utils/supabase/client";
import type { DashboardFilterState, AcademicYear, Promotion } from "@/types/education";

interface WhiteListFilterProps {
  onFilterChange: (state: DashboardFilterState) => void;
  initialState?: DashboardFilterState;
}

export function WhiteListFilter({
  onFilterChange,
  initialState,
}: WhiteListFilterProps) {
  const [annees, setAnnees] = useState<AcademicYear[]>([]);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [selectedAnnee, setSelectedAnnee] = useState<string | null>(
    initialState?.selectedAnneeId || null
  );
  const [selectedProgramme, setSelectedProgramme] = useState<string | null>(
    initialState?.selectedProgrammeId || null
  );
  const [isLoading, setIsLoading] = useState(true);

  const supabase = createClient();

  // Load academic years
  useEffect(() => {
    async function loadAnnees() {
      try {
        const { data } = await supabase
          .from("annees")
          .select("id, annee, created_at")
          .order("annee", { ascending: false });

        if (data) {
          setAnnees(data);
          // Set first as default if not already selected
          if (!selectedAnnee && data.length > 0) {
            setSelectedAnnee(data[0].id);
          }
        }
      } catch (error) {
        console.error("Error loading academic years:", error);
      }
    }

    loadAnnees();
  }, [supabase, selectedAnnee]);

  // Load promotions when academic year changes
  useEffect(() => {
    async function loadPromotions() {
      if (!selectedAnnee) {
        setPromotions([]);
        return;
      }

      try {
        setIsLoading(true);
        const { data } = await supabase
          .from("programmes")
          .select("id, nom, description, annee_id")
          .eq("annee_id", selectedAnnee)
          .order("nom", { ascending: true });

        if (data) {
          setPromotions(data);
          // Set first as default if not already selected
          if (!selectedProgramme && data.length > 0) {
            setSelectedProgramme(data[0].id);
          } else if (selectedProgramme && !data.find((p) => p.id === selectedProgramme)) {
            // Clear if selected promotion is not in new list
            setSelectedProgramme(null);
          }
        }
      } catch (error) {
        console.error("Error loading promotions:", error);
      } finally {
        setIsLoading(false);
      }
    }

    loadPromotions();
  }, [selectedAnnee, supabase, selectedProgramme]);

  // Notify parent of filter changes
  useEffect(() => {
    onFilterChange({
      selectedAnneeId: selectedAnnee,
      selectedProgrammeId: selectedProgramme,
    });
  }, [selectedAnnee, selectedProgramme, onFilterChange]);

  return (
    <div className="rounded-sm border border-gray-200 bg-white px-6 py-7.5 dark:border-gray-700 dark:bg-gray-dark">
      <div className="mb-5 flex items-center justify-between">
        <h3 className="font-medium text-gray-900 dark:text-white">
          Filtre Année Académique & Promotion
        </h3>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Academic Year Dropdown */}
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Année Académique
          </label>
          <select
            value={selectedAnnee || ""}
            onChange={(e) => setSelectedAnnee(e.target.value || null)}
            className="relative z-20 inline-flex appearance-none rounded border border-gray-200 bg-white py-2 px-4 pr-9 text-sm font-medium outline-none dark:border-gray-700 dark:bg-gray-dark dark:text-white"
          >
            <option value="">-- Sélectionner --</option>
            {annees.map((annee) => (
              <option key={annee.id} value={annee.id}>
                {annee.annee}
              </option>
            ))}
          </select>
        </div>

        {/* Promotion/Programme Dropdown */}
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Promotion
          </label>
          <select
            value={selectedProgramme || ""}
            onChange={(e) => setSelectedProgramme(e.target.value || null)}
            disabled={!selectedAnnee || isLoading}
            className="relative z-20 inline-flex appearance-none rounded border border-gray-200 bg-white py-2 px-4 pr-9 text-sm font-medium outline-none disabled:bg-gray-100 dark:border-gray-700 dark:bg-gray-dark dark:text-white dark:disabled:bg-gray-700"
          >
            <option value="">
              {isLoading ? "Chargement..." : "-- Sélectionner --"}
            </option>
            {promotions.map((promo) => (
              <option key={promo.id} value={promo.id}>
                {promo.nom}
                {promo.description && ` (${promo.description})`}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Display Selected Values */}
      {(selectedAnnee || selectedProgramme) && (
        <div className="mt-4 border-t border-gray-200 pt-4 dark:border-gray-700">
          <p className="text-xs text-gray-600 dark:text-gray-400">
            {selectedAnnee && annees.find((a) => a.id === selectedAnnee) && (
              <span>
                Année: <strong>{annees.find((a) => a.id === selectedAnnee)?.annee}</strong>
                {selectedProgramme && promotions.find((p) => p.id === selectedProgramme) && (
                  <>
                    {" | "}
                    Promotion:{" "}
                    <strong>
                      {promotions.find((p) => p.id === selectedProgramme)?.nom}
                    </strong>
                  </>
                )}
              </span>
            )}
          </p>
        </div>
      )}
    </div>
  );
}
