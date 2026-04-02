"use client";
import { useCallback, useState } from "react";

import { Modal } from "@/components/ui/modal";

type DocumentTab = "grilles" | "pv" | "palmares";

type DocumentGeneratorModalProps = {
  isOpen: boolean;
  programmeName: string | null;
  onClose: () => void;
  onGenerate?: (options: { selectedGrids: string[]; tab: DocumentTab }) => void;
};

const gridOptions = [
  { id: "semestre-principale", label: "Grille semestrielle (principale)" },
  { id: "semestre-rattrapage", label: "Grille semestrielle (rattrapage)" },
  { id: "annuelle", label: "Grille annuelle (meilleure)" },
];

const tabs: { id: DocumentTab; label: string }[] = [
  { id: "grilles", label: "Grilles" },
  { id: "pv", label: "PV" },
  { id: "palmares", label: "Palmarès" },
];

export default function DocumentGeneratorModal({
  isOpen,
  onClose,
  programmeName,
  onGenerate,
}: DocumentGeneratorModalProps) {
  const [activeTab, setActiveTab] = useState<DocumentTab>("grilles");
  const [selectedGrids, setSelectedGrids] = useState<string[]>([
    "semestre-principale",
  ]);

  const toggleGrid = useCallback((gridId: string) => {
    setSelectedGrids((prev) =>
      prev.includes(gridId) ? prev.filter((item) => item !== gridId) : [...prev, gridId],
    );
  }, []);

  const handleGenerate = useCallback(() => {
    onGenerate?.({ selectedGrids, tab: activeTab });
    onClose();
  }, [activeTab, onClose, onGenerate, selectedGrids]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl">
      <div className="space-y-6">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-gray-400">
            Génération documentaire
          </p>
          <h3 className="mt-1 text-2xl font-semibold text-gray-900 dark:text-white">
            {programmeName ?? "Programme"}
          </h3>
        </div>

        <div className="flex gap-3 border-b border-gray-200 pb-2 dark:border-gray-800">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-full px-4 py-1 text-sm font-semibold transition ${
                activeTab === tab.id
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "grilles" ? (
          <div className="space-y-3">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Sélectionne les grilles à générer.
            </p>
            <div className="grid gap-2 md:grid-cols-2">
              {gridOptions.map((option) => (
                <label
                  key={option.id}
                  className="flex items-center gap-2 rounded-2xl border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 dark:border-gray-800 dark:text-gray-300"
                >
                  <input
                    type="checkbox"
                    checked={selectedGrids.includes(option.id)}
                    onChange={() => toggleGrid(option.id)}
                    className="accent-indigo-600"
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>
          </div>
        ) : activeTab === "pv" ? (
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Le procès-verbal présentera les signatures et les statistiques.
          </p>
        ) : (
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Le palmarès classe tous les étudiants selon leur pourcentage.
          </p>
        )}

        <div className="flex justify-end gap-3 pt-3">
          <button
            onClick={onClose}
            className="rounded-full border border-gray-200 px-5 py-2 text-sm font-semibold text-gray-600 dark:border-gray-800 dark:text-gray-300"
          >
            Annuler
          </button>
          <button
            onClick={handleGenerate}
            className="rounded-full bg-indigo-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500"
          >
            Générer
          </button>
        </div>
      </div>
    </Modal>
  );
}
