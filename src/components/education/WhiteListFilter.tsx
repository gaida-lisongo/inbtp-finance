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

  const [supabase] = useState(() => createClient());
  const selectedAnneeDetails = annees.find((annee) => annee.id === selectedAnnee) ?? null;
  const selectedPromotionDetails = promotions.find((promotion) => promotion.id === selectedProgramme) ?? null;

  // Load academic years
  useEffect(() => {
    async function loadAnnees() {
      try {
        const { data } = await supabase
          .from("annees")
          .select("id, designation, active, created_at")
          .order("active", { ascending: false })
          .order("date_debut", { ascending: false, nullsFirst: false })
          .order("created_at", { ascending: false });

        if (data) {
          setAnnees(data);

          setSelectedAnnee((current) => {
            if (current || data.length === 0) {
              return current;
            }

            const activeAnnee = data.find((annee) => annee.active);
            return activeAnnee?.id ?? data[0].id;
          });
        }
      } catch (error) {
        console.error("Error loading academic years:", error);
      }
    }

    loadAnnees();
  }, [supabase]);

  // Load promotions when academic year changes
  useEffect(() => {
    async function loadPromotions() {
      if (!selectedAnnee) {
        setPromotions([]);
        setSelectedProgramme(null);
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const { data } = await supabase
          .from("programmes")
          .select("id, designation, description, annee_id")
          .eq("annee_id", selectedAnnee)
          .order("designation", { ascending: true });

        if (data) {
          setPromotions(data);
          setSelectedProgramme((current) => {
            if (!current) {
              return data[0]?.id ?? null;
            }

            return data.some((promotion) => promotion.id === current) ? current : null;
          });
        }
      } catch (error) {
        console.error("Error loading promotions:", error);
      } finally {
        setIsLoading(false);
      }
    }

    loadPromotions();
  }, [selectedAnnee, supabase]);

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
                {annee.designation || "Annee sans designation"}
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
                {promo.designation || "Promotion sans designation"}
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
            {selectedAnnee && selectedAnneeDetails && (
              <span>
                Année: <strong>{selectedAnneeDetails.designation || "Annee sans designation"}</strong>
                {selectedAnneeDetails.active ? " (active)" : ""}
                {selectedProgramme && selectedPromotionDetails && (
                  <>
                    {" | "}
                    Promotion:{" "}
                    <strong>
                      {selectedPromotionDetails.designation || "Promotion sans designation"}
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
