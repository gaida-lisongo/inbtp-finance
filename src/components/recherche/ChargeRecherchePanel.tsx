"use client";

import { useMemo, useState } from "react";

import { deleteResearchRecordAction, saveResearchRecordAction } from "@/app/(admin)/(organisateur)/cr/actions";
import ComponentCard from "@/components/common/ComponentCard";
import FormSubmitButton from "@/components/common/FormSubmitButton";
import Tab from "@/components/common/Tab";
import Pagination from "@/components/tables/Pagination";
import Button from "@/components/ui/button/Button";
import { Modal } from "@/components/ui/modal";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { useModal } from "@/hooks/useModal";
import { formatResearchDescription, type ResearchRecord, type ResearchTableName } from "@/lib/utils/supabase/recherche-shared";

type ChargeRecherchePanelProps = {
  anneeId: string;
  promotionId: string;
  defaultTab?: ResearchTableName;
  stages: ResearchRecord[];
  sujets: ResearchRecord[];
  laboratoires: ResearchRecord[];
};

type ResearchEntityPanelProps = {
  anneeId: string;
  promotionId: string;
  tabKey: ResearchTableName;
  title: string;
  singularLabel: string;
  addLabel: string;
  items: ResearchRecord[];
};

const PAGE_SIZE = 5;

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));

const formatAmount = (value: number | null) => {
  if (value == null) {
    return "Non renseigne";
  }

  return new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
};

const getStatusBadgeClassName = (value: string | null) => {
  const normalizedValue = value?.trim().toLowerCase();

  if (normalizedValue === "oui" || normalizedValue === "yes" || normalizedValue === "true" || normalizedValue === "active") {
    return "bg-success-50 text-success-700 ring-success-600/20 dark:bg-success-500/10 dark:text-success-300";
  }

  if (normalizedValue === "non" || normalizedValue === "no" || normalizedValue === "false" || normalizedValue === "inactive") {
    return "bg-error-50 text-error-700 ring-error-600/20 dark:bg-error-500/10 dark:text-error-300";
  }

  return "bg-warning-50 text-warning-700 ring-warning-600/20 dark:bg-warning-500/10 dark:text-warning-300";
};

const matchesSearch = (item: ResearchRecord, query: string) => {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return true;
  }

  const description = formatResearchDescription(item.description);
  const values = [item.slug, item.entra_id, item.is_active, description, item.created_at, item.montant?.toString() ?? ""];

  return values.some((value) => value?.toLowerCase().includes(normalizedQuery));
};

function ResearchEntityPanel({
  anneeId,
  promotionId,
  tabKey,
  title,
  singularLabel,
  addLabel,
  items,
}: ResearchEntityPanelProps) {
  const modal = useModal();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [editingItem, setEditingItem] = useState<ResearchRecord | null>(null);

  const filteredItems = useMemo(() => items.filter((item) => matchesSearch(item, search)), [items, search]);
  const totalPages = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginatedItems = filteredItems.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const activeItemsCount = items.filter((item) => item.is_active?.trim().toLowerCase() === "oui").length;

  const openCreateModal = () => {
    setEditingItem(null);
    modal.openModal();
  };

  const openEditModal = (item: ResearchRecord) => {
    setEditingItem(item);
    modal.openModal();
  };

  const closeModal = () => {
    setEditingItem(null);
    modal.closeModal();
  };

  return (
    <>
      <ComponentCard title={title} desc={`CRUD complet des ${title.toLowerCase()} rattaches a la promotion en cours.`}>
        <div className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl bg-gray-50 px-4 py-3 dark:bg-white/[0.03]">
                <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Total</p>
                <p className="mt-2 text-2xl font-semibold text-gray-800 dark:text-white/90">{items.length}</p>
              </div>
              <div className="rounded-2xl bg-gray-50 px-4 py-3 dark:bg-white/[0.03]">
                <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Actifs</p>
                <p className="mt-2 text-2xl font-semibold text-gray-800 dark:text-white/90">{activeItemsCount}</p>
              </div>
              <div className="rounded-2xl bg-gray-50 px-4 py-3 dark:bg-white/[0.03]">
                <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Resultats</p>
                <p className="mt-2 text-2xl font-semibold text-gray-800 dark:text-white/90">{filteredItems.length}</p>
              </div>
            </div>

            <Button onClick={openCreateModal}>{addLabel}</Button>
          </div>

          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="w-full lg:max-w-md">
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400" htmlFor={`${tabKey}-search`}>
                Recherche
              </label>
              <input
                id={`${tabKey}-search`}
                type="search"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                placeholder={`Rechercher un ${singularLabel.toLowerCase()}...`}
                className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              />
            </div>

            <div className="text-sm text-gray-500 dark:text-gray-400">
              Page {currentPage} sur {totalPages}
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
            <div className="max-w-full overflow-x-auto">
              <Table className="min-w-[980px]">
                <TableHeader className="border-y border-gray-100 dark:border-gray-800">
                  <TableRow>
                    <TableCell isHeader className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                      Slug
                    </TableCell>
                    <TableCell isHeader className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                      Montant
                    </TableCell>
                    <TableCell isHeader className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                      Description
                    </TableCell>
                    <TableCell isHeader className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                      Entra ID
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
                  {paginatedItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="px-5 py-4 text-sm font-medium text-gray-800 dark:text-white/90">
                        {item.slug || "Sans slug"}
                      </TableCell>
                      <TableCell className="px-5 py-4 text-sm text-gray-500 dark:text-gray-400">{formatAmount(item.montant)}</TableCell>
                      <TableCell className="px-5 py-4 text-sm text-gray-500 dark:text-gray-400">
                        <div className="max-w-md whitespace-pre-wrap break-words">{formatResearchDescription(item.description) || "Aucune description"}</div>
                      </TableCell>
                      <TableCell className="px-5 py-4 text-sm text-gray-500 dark:text-gray-400">{item.entra_id || "Non renseigne"}</TableCell>
                      <TableCell className="px-5 py-4 text-sm">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${getStatusBadgeClassName(item.is_active)}`}>
                          {item.is_active || "Indefini"}
                        </span>
                      </TableCell>
                      <TableCell className="px-5 py-4 text-sm text-gray-500 dark:text-gray-400">{formatDate(item.created_at)}</TableCell>
                      <TableCell className="px-5 py-4">
                        <div className="flex justify-end gap-3">
                          <button
                            type="button"
                            onClick={() => openEditModal(item)}
                            className="text-sm font-medium text-brand-500 hover:text-brand-600"
                          >
                            Modifier
                          </button>
                          <form action={deleteResearchRecordAction}>
                            <input type="hidden" name="entity" value={tabKey} />
                            <input type="hidden" name="id" value={item.id} />
                            <input type="hidden" name="annee" value={anneeId} />
                            <input type="hidden" name="promotion" value={promotionId} />
                            <input type="hidden" name="tab" value={tabKey} />
                            <FormSubmitButton idleLabel="Supprimer" pendingLabel="Suppression..." variant="danger" className="px-0 py-0" />
                          </form>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}

                  {paginatedItems.length === 0 ? (
                    <TableRow>
                      <td colSpan={7} className="px-5 py-8 text-sm text-gray-500 dark:text-gray-400">
                        Aucun element ne correspond a la recherche.
                      </td>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </div>
          </div>

          <div className="flex justify-end">
            <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setPage} />
          </div>
        </div>
      </ComponentCard>

      <Modal isOpen={modal.isOpen} onClose={closeModal} className="m-4 max-w-[760px]">
        <div className="space-y-6">
          <div>
            <h3 className="text-xl font-semibold text-gray-800 dark:text-white/90">
              {editingItem ? `Modifier ${singularLabel.toLowerCase()}` : addLabel}
            </h3>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Renseignez les metadonnees de {singularLabel.toLowerCase()} pour cette promotion.
            </p>
          </div>

          <form action={saveResearchRecordAction} className="grid gap-5 lg:grid-cols-2">
            <input type="hidden" name="entity" value={tabKey} />
            <input type="hidden" name="id" value={editingItem?.id ?? ""} />
            <input type="hidden" name="programme_id" value={promotionId} />
            <input type="hidden" name="annee" value={anneeId} />
            <input type="hidden" name="promotion" value={promotionId} />
            <input type="hidden" name="tab" value={tabKey} />

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400" htmlFor={`${tabKey}-slug`}>
                Slug
              </label>
              <input
                id={`${tabKey}-slug`}
                name="slug"
                defaultValue={editingItem?.slug ?? ""}
                placeholder={`Ex. ${tabKey}-ia-2026`}
                className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400" htmlFor={`${tabKey}-montant`}>
                Montant
              </label>
              <input
                id={`${tabKey}-montant`}
                name="montant"
                type="number"
                step="0.01"
                defaultValue={editingItem?.montant ?? ""}
                placeholder="0"
                className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400" htmlFor={`${tabKey}-entra-id`}>
                Entra ID
              </label>
              <input
                id={`${tabKey}-entra-id`}
                name="entra_id"
                defaultValue={editingItem?.entra_id ?? ""}
                className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400" htmlFor={`${tabKey}-is-active`}>
                Statut
              </label>
              <select
                id={`${tabKey}-is-active`}
                name="is_active"
                defaultValue={editingItem?.is_active ?? "oui"}
                className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              >
                <option value="oui">Actif</option>
                <option value="non">Inactif</option>
              </select>
            </div>

            <div className="lg:col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400" htmlFor={`${tabKey}-description`}>
                Description
              </label>
              <textarea
                id={`${tabKey}-description`}
                name="description"
                rows={6}
                defaultValue={formatResearchDescription(editingItem?.description)}
                placeholder='Texte libre ou JSON, par exemple {"resume":"..."}'
                className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-3 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              />
            </div>

            <div className="lg:col-span-2 flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={closeModal}>
                Annuler
              </Button>
              <FormSubmitButton
                idleLabel={editingItem ? "Enregistrer les modifications" : "Creer"}
                pendingLabel="Enregistrement..."
              />
            </div>
          </form>
        </div>
      </Modal>
    </>
  );
}

export default function ChargeRecherchePanel({
  anneeId,
  promotionId,
  defaultTab = "stages",
  stages,
  sujets,
  laboratoires,
}: ChargeRecherchePanelProps) {
  const totalRecords = stages.length + sujets.length + laboratoires.length;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-gray-200 bg-white px-5 py-4 dark:border-white/[0.05] dark:bg-white/[0.03]">
          <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Total global</p>
          <p className="mt-2 text-2xl font-semibold text-gray-800 dark:text-white/90">{totalRecords}</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white px-5 py-4 dark:border-white/[0.05] dark:bg-white/[0.03]">
          <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Stages</p>
          <p className="mt-2 text-2xl font-semibold text-gray-800 dark:text-white/90">{stages.length}</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white px-5 py-4 dark:border-white/[0.05] dark:bg-white/[0.03]">
          <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Sujets</p>
          <p className="mt-2 text-2xl font-semibold text-gray-800 dark:text-white/90">{sujets.length}</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white px-5 py-4 dark:border-white/[0.05] dark:bg-white/[0.03]">
          <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Laboratoires</p>
          <p className="mt-2 text-2xl font-semibold text-gray-800 dark:text-white/90">{laboratoires.length}</p>
        </div>
      </div>

      <Tab
        defaultTab={defaultTab}
        tabs={[
          {
            key: "stages",
            label: `Stages (${stages.length})`,
            content: (
              <ResearchEntityPanel
                anneeId={anneeId}
                promotionId={promotionId}
                tabKey="stages"
                title="Stages"
                singularLabel="Un stage"
                addLabel="Ajouter un stage"
                items={stages}
              />
            ),
          },
          {
            key: "sujets",
            label: `Sujets (${sujets.length})`,
            content: (
              <ResearchEntityPanel
                anneeId={anneeId}
                promotionId={promotionId}
                tabKey="sujets"
                title="Sujets"
                singularLabel="Un sujet"
                addLabel="Ajouter un sujet"
                items={sujets}
              />
            ),
          },
          {
            key: "laboratoires",
            label: `Laboratoires (${laboratoires.length})`,
            content: (
              <ResearchEntityPanel
                anneeId={anneeId}
                promotionId={promotionId}
                tabKey="laboratoires"
                title="Laboratoires"
                singularLabel="Un laboratoire"
                addLabel="Ajouter un laboratoire"
                items={laboratoires}
              />
            ),
          },
        ]}
      />
    </div>
  );
}
