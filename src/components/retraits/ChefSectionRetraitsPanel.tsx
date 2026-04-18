"use client";

import { useMemo, useState } from "react";

import ComponentCard from "@/components/common/ComponentCard";
import ChefSectionArchiveWorkspace from "@/components/retraits/ChefSectionArchiveWorkspace";
import Button from "@/components/ui/button/Button";
import { useModal } from "@/hooks/useModal";
import { Modal } from "@/components/ui/modal";
import Pagination from "@/components/tables/Pagination";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import type { CsArchiveSnapshot } from "@/lib/utils/supabase/cs-archive";
import RetraitsRealtimeSync from "@/components/retraits/RetraitsRealtimeSync";
import type { RetraitRecord } from "@/lib/utils/supabase/retraits";

type ChefSectionRetraitsPanelProps = {
  retraits: RetraitRecord[];
  agentId: string;
  anneeId: string;
  promotionId: string;
  programmeDesignation: string;
  anneeDesignation: string;
  archiveSnapshot: CsArchiveSnapshot;
  createAction: (formData: FormData) => Promise<void>;
  deleteAction: (formData: FormData) => Promise<void>;
  confirmAction: (formData: FormData) => Promise<void>;
};

const PAGE_SIZE = 10;

const amountFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const dateFormatter = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "medium",
  timeStyle: "short",
});

const getStatusBadgeClassName = (status: string | null) => {
  const normalizedStatus = status?.toLowerCase();

  if (normalizedStatus === "approved" || normalizedStatus === "paid") {
    return "bg-success-50 text-success-700 ring-success-600/20 dark:bg-success-500/10 dark:text-success-300";
  }

  if (normalizedStatus === "success") {
    return "bg-success-50 text-success-700 ring-success-600/20 dark:bg-success-500/10 dark:text-success-300";
  }

  if (normalizedStatus === "no") {
    return "bg-error-50 text-error-700 ring-error-600/20 dark:bg-error-500/10 dark:text-error-300";
  }

  if (normalizedStatus === "pending") {
    return "bg-warning-50 text-warning-700 ring-warning-600/20 dark:bg-warning-500/10 dark:text-warning-300";
  }

  return "bg-gray-100 text-gray-700 ring-gray-500/20 dark:bg-white/10 dark:text-gray-300";
};

const formatStatusLabel = (status: string | null) => {
  const normalizedStatus = status?.toLowerCase();

  if (normalizedStatus === "approved") {
    return "Approuve";
  }

  if (normalizedStatus === "success") {
    return "Success";
  }

  if (normalizedStatus === "no") {
    return "No";
  }

  if (normalizedStatus === "paid") {
    return "Paye";
  }

  if (normalizedStatus === "pending") {
    return "Pending";
  }

  return "Brouillon";
};

const formatAmount = (value: number | null) => {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "$0.00";
  }

  return amountFormatter.format(value);
};

export default function ChefSectionRetraitsPanel({
  retraits,
  agentId,
  anneeId,
  promotionId,
  programmeDesignation,
  anneeDesignation,
  archiveSnapshot,
  createAction,
  deleteAction,
  confirmAction,
}: ChefSectionRetraitsPanelProps) {
  const { isOpen, openModal, closeModal } = useModal();
  const [activeTab, setActiveTab] = useState<"retraits" | "archives">("retraits");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);

  const filteredRetraits = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return retraits.filter((retrait) => {
      const normalizedStatus = retrait.status?.toLowerCase() ?? "brouillon";
      const matchesStatus = statusFilter === "all" || normalizedStatus === statusFilter;

      if (!matchesStatus) {
        return false;
      }

      if (normalizedSearch.length === 0) {
        return true;
      }

      const haystack = [
        retrait.designation,
        retrait.description,
        retrait.categorie,
        retrait.orderNumber,
        retrait.id,
        normalizedStatus,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedSearch);
    });
  }, [retraits, searchTerm, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredRetraits.length / PAGE_SIZE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * PAGE_SIZE;
  const paginatedRetraits = filteredRetraits.slice(startIndex, startIndex + PAGE_SIZE);
  const draftCount = retraits.filter((item) => item.status?.toLowerCase() === "brouillon").length;
  const pendingCount = retraits.filter((item) => item.status?.toLowerCase() === "pending").length;

  return (
    <>
      <RetraitsRealtimeSync agentId={agentId} />

      <ComponentCard
        title="Retraits"
        desc="Chef de section: retraits et archivage des resultats par CSV."
      >
        <div className="space-y-5">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("retraits")}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                activeTab === "retraits"
                  ? "bg-brand-500 text-white"
                  : "border border-gray-300 text-gray-700 hover:border-brand-300 hover:text-brand-600 dark:border-gray-700 dark:text-gray-300"
              }`}
            >
              Retraits
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("archives")}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                activeTab === "archives"
                  ? "bg-brand-500 text-white"
                  : "border border-gray-300 text-gray-700 hover:border-brand-300 hover:text-brand-600 dark:border-gray-700 dark:text-gray-300"
              }`}
            >
              Archivage des resultats
            </button>
          </div>

          {activeTab === "retraits" ? (
            <>
              <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_220px_auto]">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400" htmlFor="retrait-search">
                Recherche
              </label>
              <input
                id="retrait-search"
                value={searchTerm}
                onChange={(event) => {
                  setSearchTerm(event.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Rechercher par designation, categorie, statut ou identifiant"
                className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400" htmlFor="retrait-status-filter">
                Filtre statut
              </label>
              <select
                id="retrait-status-filter"
                value={statusFilter}
                onChange={(event) => {
                  setStatusFilter(event.target.value);
                  setCurrentPage(1);
                }}
                className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              >
                <option value="all">Tous les statuts</option>
                <option value="brouillon">Brouillon</option>
                <option value="pending">Pending</option>
                <option value="success">Success</option>
                <option value="approved">Approuve</option>
                <option value="no">No</option>
                <option value="paid">Paye</option>
              </select>
            </div>

            <div className="flex items-end">
              <Button className="w-full xl:w-auto" onClick={openModal}>
                Ajouter un retrait
              </Button>
            </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl bg-gray-50 p-4 dark:bg-white/[0.03]">
              <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Promotion</p>
              <p className="mt-2 text-sm font-medium text-gray-800 dark:text-white/90">{programmeDesignation}</p>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{anneeDesignation}</p>
            </div>
            <div className="rounded-2xl bg-gray-50 p-4 dark:bg-white/[0.03]">
              <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Brouillons</p>
              <p className="mt-2 text-2xl font-semibold text-gray-800 dark:text-white/90">{draftCount}</p>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Demandes a confirmer avant envoi</p>
            </div>
            <div className="rounded-2xl bg-gray-50 p-4 dark:bg-white/[0.03]">
              <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Pending</p>
              <p className="mt-2 text-2xl font-semibold text-gray-800 dark:text-white/90">{pendingCount}</p>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Demandes supprimables tant qu&apos;elles restent pending</p>
            </div>
              </div>

              <div className="overflow-x-auto">
            <Table className="min-w-full">
              <TableHeader className="border-y border-gray-100 dark:border-gray-800">
                <TableRow>
                  <TableCell isHeader className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                    Retrait
                  </TableCell>
                  <TableCell isHeader className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                    Categorie
                  </TableCell>
                  <TableCell isHeader className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                    Montant
                  </TableCell>
                  <TableCell isHeader className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                    Statut
                  </TableCell>
                  <TableCell isHeader className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                    Cree le
                  </TableCell>
                  <TableCell isHeader className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wide text-gray-500">
                    Actions
                  </TableCell>
                </TableRow>
              </TableHeader>

              <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
                {paginatedRetraits.map((retrait) => {
                  const normalizedStatus = retrait.status?.toLowerCase() ?? "brouillon";
                  const canConfirm = normalizedStatus === "brouillon";
                  const canDelete = normalizedStatus === "pending";

                  return (
                    <TableRow key={retrait.id}>
                      <TableCell className="px-5 py-4 text-sm text-gray-500 dark:text-gray-400">
                        <div className="space-y-1">
                          <p className="font-medium text-gray-800 dark:text-white/90">
                            {retrait.designation || "Sans designation"}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {retrait.orderNumber || "Aucun numero de retrait pour le moment"}
                          </p>
                        </div>
                      </TableCell>

                      <TableCell className="px-5 py-4 text-sm text-gray-500 dark:text-gray-400">
                        {retrait.categorie || "Non classe"}
                      </TableCell>

                      <TableCell className="px-5 py-4 text-sm font-medium text-gray-800 dark:text-white/90">
                        {formatAmount(retrait.montant)}
                      </TableCell>

                      <TableCell className="px-5 py-4 text-sm text-gray-500 dark:text-gray-400">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${getStatusBadgeClassName(retrait.status)}`}
                        >
                          {formatStatusLabel(retrait.status)}
                        </span>
                      </TableCell>

                      <TableCell className="px-5 py-4 text-sm text-gray-500 dark:text-gray-400">
                        {dateFormatter.format(new Date(retrait.created_at))}
                      </TableCell>

                      <TableCell className="px-5 py-4">
                        <div className="flex flex-wrap items-center justify-end gap-3">
                          {canConfirm ? (
                            <form action={confirmAction}>
                              <input type="hidden" name="id" value={retrait.id} />
                              <input type="hidden" name="annee" value={anneeId} />
                              <input type="hidden" name="promotion" value={promotionId} />
                              <button type="submit" className="text-sm font-medium text-success-600 hover:text-success-700">
                                Confirmer
                              </button>
                            </form>
                          ) : null}

                          {canDelete ? (
                            <form action={deleteAction}>
                              <input type="hidden" name="id" value={retrait.id} />
                              <input type="hidden" name="annee" value={anneeId} />
                              <input type="hidden" name="promotion" value={promotionId} />
                              <button type="submit" className="text-sm font-medium text-error-500 hover:text-error-600">
                                Supprimer
                              </button>
                            </form>
                          ) : null}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}

                {filteredRetraits.length === 0 ? (
                  <TableRow>
                    <td colSpan={6} className="px-5 py-10 text-sm text-gray-500 dark:text-gray-400">
                      Aucun retrait ne correspond a votre recherche.
                    </td>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
              </div>

              {filteredRetraits.length > PAGE_SIZE ? (
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Affichage de {startIndex + 1} a {Math.min(startIndex + PAGE_SIZE, filteredRetraits.length)} sur {filteredRetraits.length}
              </p>
              <Pagination
                currentPage={safeCurrentPage}
                totalPages={totalPages}
                onPageChange={(page) => {
                  const nextPage = Math.max(1, Math.min(page, totalPages));
                  setCurrentPage(nextPage);
                }}
              />
            </div>
              ) : null}
            </>
          ) : (
            <ChefSectionArchiveWorkspace
              anneeId={anneeId}
              programmeId={promotionId}
              snapshot={archiveSnapshot}
            />
          )}
        </div>
      </ComponentCard>

      <Modal isOpen={isOpen} onClose={closeModal} className="max-w-[760px] m-4">
        <div className="p-6 sm:p-8">
          <div className="mb-6">
            <h3 className="text-xl font-semibold text-gray-800 dark:text-white/90">Nouveau retrait</h3>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Le retrait est cree en statut brouillon. Vous pourrez ensuite le confirmer pour l&apos;envoyer en validation.
            </p>
          </div>

          <form action={createAction} className="grid gap-5 lg:grid-cols-2">
            <input type="hidden" name="annee" value={anneeId} />
            <input type="hidden" name="promotion" value={promotionId} />
            <input type="hidden" name="annee_id" value={anneeId} />
            <input type="hidden" name="pgrogramme_id" value={promotionId} />

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400" htmlFor="designation">
                Designation
              </label>
              <input
                id="designation"
                name="designation"
                className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                placeholder="Ex. Achat fournitures"
                required
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400" htmlFor="categorie">
                Categorie
              </label>
              <input
                id="categorie"
                name="categorie"
                className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                placeholder="Ex. Fonctionnement"
                required
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400" htmlFor="montant">
                Montant
              </label>
              <input
                id="montant"
                name="montant"
                type="number"
                min="0"
                step="0.01"
                className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                placeholder="0.00"
                required
              />
            </div>

            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-white/[0.03]">
              <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Initialisation</p>
              <p className="mt-2 text-sm font-medium text-gray-800 dark:text-white/90">Statut: brouillon</p>
              <p className="mt-1 text-sm font-medium text-gray-800 dark:text-white/90">Order number: null</p>
            </div>

            <div className="lg:col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400" htmlFor="description">
                Description
              </label>
              <textarea
                id="description"
                name="description"
                rows={4}
                className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                placeholder="Details complementaires"
              />
            </div>

            <div className="lg:col-span-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={closeModal}
                className="inline-flex items-center justify-center rounded-lg bg-white px-4 py-3 text-sm font-medium text-gray-700 ring-1 ring-inset ring-gray-300 transition hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:ring-gray-700 dark:hover:bg-white/[0.03]"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="rounded-lg bg-brand-500 px-5 py-3 text-sm font-medium text-white hover:bg-brand-600"
              >
                Enregistrer le brouillon
              </button>
            </div>
          </form>
        </div>
      </Modal>
    </>
  );
}
