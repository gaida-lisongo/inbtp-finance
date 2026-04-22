"use client";

import React, { useState, useEffect, useRef } from "react";
import { getAnneesAction } from "@/app/actions/annees";
import type { AnneeRecord } from "@/lib/utils/supabase/annees";

interface FindAnneeProps {
  onSelect: (annee: AnneeRecord | null) => void;
  label?: string;
  placeholder?: string;
  defaultAnnee?: { id: string; designation: string | null } | null;
  required?: boolean;
}

export default function FindAnnee({
  onSelect,
  label = "Rechercher une année académique",
  placeholder = "Saisissez l'année...",
  defaultAnnee,
  required = false,
}: FindAnneeProps) {
  const [annees, setAnnees] = useState<AnneeRecord[]>([]);
  const [query, setQuery] = useState(defaultAnnee?.designation || "");
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function loadAnnees() {
      try {
        const data = await getAnneesAction();
        setAnnees(data);
      } catch (error) {
        console.error("Failed to load annees", error);
      } finally {
        setLoading(false);
      }
    }
    loadAnnees();
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredAnnees = annees.filter((annee) => {
    const designation = (annee.designation || "").toLowerCase();
    return designation.includes(query.toLowerCase());
  });

  const handleSelect = (annee: AnneeRecord) => {
    const designation = annee.designation || "";
    setQuery(designation);
    setIsOpen(false);
    onSelect(annee);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    setIsOpen(true);
    if (e.target.value.trim() === "") {
      onSelect(null);
    }
  };

  return (
    <div className="relative" ref={wrapperRef}>
      {label && (
        <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
          {label} {required && <span className="text-error-500">*</span>}
        </label>
      )}
      <input
        type="text"
        value={query}
        onChange={handleChange}
        onFocus={() => setIsOpen(true)}
        placeholder={placeholder}
        required={required}
        className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
      />
      {loading && (
        <div className="absolute right-3 top-[38px]">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-brand-500 border-t-transparent"></div>
        </div>
      )}
      {isOpen && query && !loading && (
        <ul className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-800 dark:bg-gray-900">
          {filteredAnnees.length === 0 ? (
            <li className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">Aucune année trouvée</li>
          ) : (
            filteredAnnees.map((annee) => {
              const designation = annee.designation || "Année sans nom";
              const isActivate = annee.active === "true" || annee.active === true;
              
              return (
                <li
                  key={annee.id}
                  onClick={() => handleSelect(annee)}
                  className="cursor-pointer px-4 py-2 text-sm text-gray-800 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{designation}</span>
                    {isActivate && (
                      <span className="inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200">
                        Active
                      </span>
                    )}
                  </div>
                  {annee.date_debut && annee.date_fin && (
                    <div className="text-xs text-gray-500">
                      {new Date(annee.date_debut).toLocaleDateString()} - {new Date(annee.date_fin).toLocaleDateString()}
                    </div>
                  )}
                </li>
              );
            })
          )}
        </ul>
      )}
    </div>
  );
}
