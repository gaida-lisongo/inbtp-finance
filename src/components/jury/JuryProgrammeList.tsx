"use client";

import { useCallback, useMemo, useState } from "react";
import { startTransition } from "react";

import DocumentGeneratorModal from "@/components/jury/DocumentGeneratorModal";
import ProgrammeDeliberationCard from "@/components/jury/ProgrammeDeliberationCard";
import type { JuryWithMembers } from "@/lib/utils/supabase/jury";
import type { ProgrammeRecord } from "@/lib/utils/supabase/programmes";

type JuryProgrammeListProps = {
  jury: JuryWithMembers;
  programmes: ProgrammeRecord[];
};

export default function JuryProgrammeList({ jury, programmes }: JuryProgrammeListProps) {
  const [activeProgramme, setActiveProgramme] = useState<ProgrammeRecord | null>(null);
  const [isModalOpen, setModalOpen] = useState(false);
  const [isGenerating, setGenerating] = useState(false);

  const handleDocumentRequest = useCallback((programme: ProgrammeRecord) => {
    setActiveProgramme(programme);
    setModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setModalOpen(false);
  }, []);

  const handleGenerateDocument = useCallback(
    async ({
      selectedGrids,
      tab,
    }: {
      selectedGrids: string[];
      tab: "grilles" | "pv" | "palmares";
    }) => {
      if (!activeProgramme || !jury.id) {
        return;
      }

      setGenerating(true);

      try {
        let response: Response;
        let fallbackFilename = `document-${activeProgramme.id}.xlsx`;

        if (tab === "palmares") {
          response = await fetch(
            `/api/jury/jury/${jury.id}/promotion/${activeProgramme.id}/documents/palmares`,
            { method: "GET" },
          );
          fallbackFilename = `palmares-${activeProgramme.id}.xlsx`;
        } else if (tab === "grilles") {
          response = await fetch(
            `/api/jury/jury/${jury.id}/promotion/${activeProgramme.id}/documents/grilles`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ selectedGrids }),
            },
          );
          fallbackFilename = `grilles-${activeProgramme.id}.xlsx`;
        } else if (tab === "pv") {
          response = await fetch(
            `/api/jury/jury/${jury.id}/promotion/${activeProgramme.id}/documents/pv`,
            { method: "GET" },
          );
          fallbackFilename = `pv-${activeProgramme.id}.xlsx`;
        } else {
          throw new Error("Le document demandé n'est pas encore disponible.");
        }

        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as { error?: string } | null;
          throw new Error(payload?.error || "Impossible de générer le document.");
        }

        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const link = window.document.createElement("a");
        const disposition = response.headers.get("Content-Disposition");
        const filenameMatch = disposition?.match(/filename="([^"]+)"/i);

        link.href = downloadUrl;
        link.download = filenameMatch?.[1] ?? fallbackFilename;
        window.document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(downloadUrl);

        startTransition(() => {
          setModalOpen(false);
        });
      } finally {
        setGenerating(false);
      }
    },
    [activeProgramme, jury.id],
  );

  const programmeCountText = useMemo(() => {
    return programmes.length === 0
      ? "Aucune promotion"
      : `${programmes.length} promotion${programmes.length > 1 ? "s" : ""}`;
  }, [programmes.length]);

  return (
    <>
      <div className="space-y-3">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {jury.designation ?? "Jury"}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {jury.annee?.designation ?? "Année académique"} · {programmeCountText}
          </p>
        </div>
        {programmes.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500 dark:border-gray-700">
            Aucune promotion enregistrée pour cette année.
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-1">
            {programmes.map((programme) => (
              <ProgrammeDeliberationCard
                key={programme.id}
                juryId={jury.id}
                programme={programme}
                onRequestDocument={handleDocumentRequest}
              />
            ))}
          </div>
        )}
      </div>

      <DocumentGeneratorModal
        isOpen={isModalOpen}
        programmeName={activeProgramme?.designation ?? null}
        onClose={closeModal}
        onGenerate={handleGenerateDocument}
        isGenerating={isGenerating}
      />
    </>
  );
}
