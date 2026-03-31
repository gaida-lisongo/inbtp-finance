import ComponentCard from "@/components/common/ComponentCard";
import type { FacultyDashboardSnapshot } from "@/lib/utils/supabase/faculte-dashboard";

type PromotionsListProps = {
  programmes: FacultyDashboardSnapshot["programmes"];
  activeAnneeLabel: string;
  activeRangeLabel: string;
  selectedProgrammeId: string | null;
  onSelectProgramme: (programmeId: string) => void;
};

export default function PromotionsList({
  programmes,
  activeAnneeLabel,
  activeRangeLabel,
  selectedProgrammeId,
  onSelectProgramme,
}: PromotionsListProps) {
  return (
    <ComponentCard title="Année académique" desc={activeAnneeLabel} className="h-full">
      <div className="space-y-3">
        <p className="text-sm text-gray-500 dark:text-gray-400">{activeRangeLabel}</p>

        {programmes.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">Aucune promotion trouvée pour l'année active.</p>
        ) : (
          <div className="max-h-[360px] overflow-y-auto pr-2">
            <div className="divide-y divide-gray-200 dark:divide-gray-800">
              {programmes.map((programme) => (
                <button
                  key={programme.id}
                  type="button"
                  onClick={() => onSelectProgramme(programme.id)}
                  className="block w-full py-4 text-left"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className="text-sm font-semibold text-gray-800 dark:text-white/90">
                        {programme.designation || "Promotion sans designation"}
                      </h4>
                      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        {programme.filiereDesignation || "Filiere non renseignée"}
                      </p>
                    </div>
                    {programme.id === selectedProgrammeId ? (
                      <span className="rounded-full bg-success-50 px-2.5 py-1 text-xs font-medium text-success-700 dark:bg-success-500/10 dark:text-success-300">
                        Promotion active
                      </span>
                    ) : null}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </ComponentCard>
  );
}
