"use client";

export type DashboardFraisItem = {
  id: string;
  designation: string;
  description: string;
  montant: number | null;
  promotionLabel: string;
  promotionSlug: string;
  modalitesCount: number;
  collectedAmount: number;
  pendingAmount: number;
};

type ListeWhatchlistProps = {
  frais: DashboardFraisItem[];
  selectedFraisId: string | null;
  onSelect: (fraisId: string) => void;
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);

export default function ListeWhatchlist({
  frais,
  selectedFraisId,
  onSelect,
}: ListeWhatchlistProps) {
  return (
    <div className="h-[520px] rounded-2xl border border-gray-200 bg-white px-5 py-5 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6 sm:py-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
          Liste des frais
        </h3>
        <p className="mt-1 text-theme-sm text-gray-500 dark:text-gray-400">
          Selectionnez un frais pour afficher ses modalites de paiement.
        </p>
      </div>

      <div className="custom-scrollbar h-[420px] space-y-3 overflow-y-auto pr-1">
        {frais.length > 0 ? (
          frais.map((item) => {
            const isActive = item.id === selectedFraisId;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelect(item.id)}
                className={`w-full rounded-2xl border px-4 py-4 text-left transition ${
                  isActive
                    ? "border-brand-200 bg-brand-50 dark:border-brand-500/30 dark:bg-brand-500/10"
                    : "border-gray-200 bg-white hover:border-brand-200 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900/40 dark:hover:border-brand-500/20 dark:hover:bg-white/[0.03]"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-gray-800 dark:text-white/90">
                      {item.designation}
                    </p>
                    <p className="mt-1 text-theme-xs text-gray-500 dark:text-gray-400">
                      {item.promotionLabel}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-800 dark:text-white/90">
                      {formatCurrency(item.collectedAmount)}
                    </p>
                    <p className="mt-1 text-theme-xs text-gray-500 dark:text-gray-400">
                      encaisses
                    </p>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between text-theme-xs text-gray-500 dark:text-gray-400">
                  <span>{item.modalitesCount} modalite(s)</span>
                  <span>{formatCurrency(item.pendingAmount)} en attente</span>
                </div>
              </button>
            );
          })
        ) : (
          <div className="rounded-2xl border border-dashed border-gray-300 px-4 py-8 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
            Aucun frais n&apos;est disponible pour cette vue.
          </div>
        )}
      </div>
    </div>
  );
}
