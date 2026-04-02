"use client";

import { useCallback, useMemo, useState } from "react";

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

  const handleDocumentRequest = useCallback((programme: ProgrammeRecord) => {
    setActiveProgramme(programme);
    setModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setModalOpen(false);
  }, []);

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
        onGenerate={({ selectedGrids, tab }) => {
          console.log("Génération demandée", { programme: activeProgramme, selectedGrids, tab });
        }}
      />
    </>
  );
}
