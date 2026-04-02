"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type ProgrammeStudent = {
  id: string;
  matricule: string | null;
  nom: string | null;
  post_nom: string | null;
  prenom: string | null;
};

type ProgrammeDeliberationCardProps = {
  juryId: string;
  programme: {
    id: string;
    designation: string | null;
    description: string | null;
    annee_id: string | null;
  };
  onRequestDocument?: (
    programme: ProgrammeDeliberationCardProps["programme"],
  ) => void;
};

export default function ProgrammeDeliberationCard({
  juryId,
  programme,
  onRequestDocument,
}: ProgrammeDeliberationCardProps) {
  const [students, setStudents] = useState<ProgrammeStudent[] | null>(null);
  const [isFetching, setFetching] = useState(false);
  const [isExpanded, setExpanded] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const loadStudents = async () => {
    setFetching(true);
    try {
      const resp = await fetch(`/api/jury/programmes/${programme.id}/students`, {
        cache: "no-store",
      });
      const payload = await resp.json();
      setStudents(resp.ok ? payload.students : []);
    } catch {
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

  const filteredStudents = useMemo(() => {
    if (!students) return null;
    const lowered = searchTerm.trim().toLowerCase();
    if (!lowered) return students;
    return students.filter((student) => {
      const label =
        `${student.prenom ?? ""} ${student.post_nom ?? ""} ${student.nom ?? ""} ${student.matricule ?? ""}`.toLowerCase();
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
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-[0.4em] text-gray-400">
            Promotion
          </p>
          <h3 className="mt-1 truncate text-lg font-semibold text-gray-900 dark:text-white">
            {programme.designation ?? "Programme sans titre"}
          </h3>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Link
              href={`/jury/${juryId}/promotion/${programme.id}`}
              className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-gray-600 shadow-sm transition hover:border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            >
              Ouvrir
            </Link>
            <span className="text-xs font-semibold uppercase tracking-[0.3em] text-gray-400">
              {programme.annee_id ? "Année liée" : "Année manquante"}
            </span>
          </div>
        </div>
        <button
          onClick={() => onRequestDocument?.(programme)}
          className="rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:border-gray-400 hover:text-gray-900 dark:border-gray-800 dark:text-gray-300 dark:hover:border-gray-600 dark:hover:text-white"
        >
          Générer un document
        </button>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3 text-xs font-semibold uppercase tracking-[0.3em] text-gray-400">
        <span>{metrics.total} étudiants</span>
        <span className="text-gray-500">
          {metrics.matricules} matricules uniques
        </span>
      </div>

      <div className="mt-2 flex items-center justify-between gap-3">
        <span className="text-xs uppercase tracking-[0.3em] text-gray-400">
          {isExpanded ? "Délibération visible" : "Délibération masquée"}
        </span>
        <button
          onClick={toggleExpanded}
          className="rounded-full bg-red-600 px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-white shadow-sm shadow-red-200 transition hover:bg-red-500"
        >
          {isExpanded ? "Masquer la délibération" : "Voir la délibération"}
        </button>
      </div>

      {isExpanded && (
        <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Rechercher un étudiant..."
              className="min-w-[180px] flex-1 rounded-full border border-gray-200 px-4 py-1 text-sm outline-none focus:border-indigo-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
            />
            <button
              onClick={() => onRequestDocument?.(programme)}
              className="flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-gray-600 shadow-sm transition hover:border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              type="button"
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
                  <span className="truncate">
                    {student.prenom ?? ""} {student.post_nom ?? ""}{" "}
                    {student.nom ?? ""}
                  </span>
                  <span className="shrink-0 text-gray-400">
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
    </div>
  );
}
