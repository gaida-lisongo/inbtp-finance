"use client";
import { useMemo, useState } from "react";

import { Modal } from "@/components/ui/modal";

type ProgrammeStudent = {
  id: string;
  matricule: string | null;
  nom: string | null;
  post_nom: string | null;
  prenom: string | null;
};

type DocumentTab = "grilles" | "pv" | "palmares";

type ProgrammeDeliberationCardProps = {
  programme: {
    id: string;
    designation: string | null;
    description: string | null;
    annee_id: string | null;
  };
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

export default function ProgrammeDeliberationCard({
  programme,
}: ProgrammeDeliberationCardProps) {
  const [students, setStudents] = useState<ProgrammeStudent[] | null>(null);
  const [isFetching, setFetching] = useState(false);
  const [isExpanded, setExpanded] = useState(false);
  const [isModalOpen, setModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<DocumentTab>("grilles");
  const [selectedGrids, setSelectedGrids] = useState<string[]>([
    "semestre-principale",
  ]);
  const [searchTerm, setSearchTerm] = useState("");

  const loadStudents = async () => {
    setFetching(true);
    try {
      const resp = await fetch(
        `/api/jury/programmes/${programme.id}/students`,
        { cache: "no-store" },
      );
      const payload = await resp.json();
      if (resp.ok) {
        setStudents(payload.students);
      }
    } catch (error) {
      setStudents([]);
    } finally {
      setFetching(false);
    }
  };

  const toggleExpanded = () => {
    if (!isExpanded && students === null) {
      loadStudents();
    }
    setExpanded((prev) => !prev);
  };

  const toggleGrid = (gridId: string) => {
    setSelectedGrids((prev) =>
      prev.includes(gridId)
        ? prev.filter((item) => item !== gridId)
        : [...prev, gridId],
    );
  };

  const filteredStudents = useMemo(() => {
    if (!students) return null;
    const lowered = searchTerm.trim().toLowerCase();
    if (!lowered) return students;
    return students.filter((student) => {
      const label = `${student.prenom ?? ""} ${student.post_nom ?? ""} ${student.nom ?? ""} ${student.matricule ?? ""}`.toLowerCase();
      return label.includes(lowered);
    });
  }, [students, searchTerm]);

  const metrics = useMemo(() => {
    if (!students) {
      return { total: 0, matricules: 0 };
    }
    const uniqueMatricules = new Set(
      students
        .map((student) => student.matricule ?? "")
        .filter((value) => value.length > 0),
    );
    return {
      total: students.length,
      matricules: uniqueMatricules.size,
    };
  }, [students]);

  const displayStudents = filteredStudents ?? [];

  return (
    <div className="flex w-full flex-col gap-3 rounded-3xl border border-gray-200 bg-white p-5 shadow-sm shadow-gray-200 transition hover:-translate-y-1 hover:shadow-lg dark:border-gray-800 dark:bg-gray-900 dark:shadow-none">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <p className="text-xs font-semibold uppercase tracking-[0.4em] text-gray-400">
              Programme
            </p>
            <h3 className="mt-1 text-lg font-semibold text-gray-900 dark:text-white truncate">
              {programme.designation ?? "Programme sans titre"}
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {programme.annee_id ? "Promotion active" : "Année manquante"}
            </p>
          </div>
          <button
            onClick={() => setModalOpen(true)}
            className="rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:border-gray-400 hover:text-gray-900 dark:border-gray-800 dark:text-gray-300 dark:hover:border-gray-600 dark:hover:text-white"
          >
            Générer un document
          </button>
        </div>
      <div className="mt-4 flex flex-wrap items-center gap-3 text-xs font-semibold uppercase tracking-[0.3em] text-gray-400">
        <span>{metrics.total} étudiants</span>
        <span className="text-gray-500">{metrics.matricules} matricules uniques</span>
        <span className="ml-auto text-gray-500">
          {programme.annee_id ? "Promotion active" : "Année manquante"}
        </span>
      </div>

      {isExpanded && (
        <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Rechercher un étudiant..."
              className="flex-1 min-w-[180px] rounded-full border border-gray-200 px-4 py-1 text-sm outline-none focus:border-indigo-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
            />
            <button
              onClick={() => setModalOpen(true)}
              className="flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-gray-600 shadow-sm transition hover:border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M5 5H19V14H18V6H6V18H12V19H5V5Z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M13 15H19V21H13V15Z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M9 8V6H15V8"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M11 11V13"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Documents
            </button>
          </div>
          {isFetching ? (
            <p className="text-sm text-gray-500">Chargement des étudiants…</p>
          ) : displayStudents.length > 0 ? (
            <div className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
              {displayStudents.map((student) => (
                <div
                  key={student.id}
                  className="flex items-center justify-between rounded-lg bg-white px-3 py-2 text-xs font-medium text-gray-700 shadow-sm dark:bg-gray-800 dark:text-white"
                >
                  <span>
                    {student.prenom ?? ""} {student.post_nom ?? ""}{" "}
                    {student.nom ?? ""}
                  </span>
                  <span className="text-gray-400">
                    {student.matricule ?? "—"}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-300">
              Aucun étudiant pour ce programme pour l’instant.
            </p>
          )}
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setModalOpen(false)} size="xl">
        <div className="space-y-6">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-gray-400">
              Génération documentaire
            </p>
            <h3 className="mt-1 text-2xl font-semibold text-gray-900 dark:text-white">
              {programme.designation ?? "Programme"}
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
                Sélectionne les types de grilles à générer.
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
              Le procès-verbal présentera les statistiques globales et les signatures.
            </p>
          ) : (
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Le palmarès classe tous les étudiants selon leur pourcentage.
            </p>
          )}

          <div className="flex justify-end gap-3 pt-3">
            <button
              onClick={() => setModalOpen(false)}
              className="rounded-full border border-gray-200 px-5 py-2 text-sm font-semibold text-gray-600 dark:border-gray-800 dark:text-gray-300"
            >
              Annuler
            </button>
            <button
              onClick={() => setModalOpen(false)}
              className="rounded-full bg-indigo-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500"
            >
              Générer <span className="font-light">(à implémenter)</span>
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
