"use client";

import { useMemo, useState } from "react";

import { deleteResearchRecordAction, notifyResearchRecordAction, saveResearchRecordAction } from "@/app/(admin)/(organisateur)/cr/actions";
import AsyncProgressButton from "@/components/common/AsyncProgressButton";
import ComponentCard from "@/components/common/ComponentCard";
import FormSubmitButton from "@/components/common/FormSubmitButton";
import Tab from "@/components/common/Tab";
import Pagination from "@/components/tables/Pagination";
import Button from "@/components/ui/button/Button";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import {
  formatResearchDescription,
  type ResearchRecord,
  type ResearchTableName,
  type SujetJuryMember,
} from "@/lib/utils/supabase/recherche-shared";

type ChargeRecherchePanelProps = {
  anneeId: string;
  promotionId: string;
  defaultTab?: ResearchTableName;
  stages: ResearchRecord[];
  sujets: ResearchRecord[];
  laboratoires: ResearchRecord[];
  programmeLabel: string | null;
};

type ResearchEntityPanelProps = {
  anneeId: string;
  promotionId: string;
  tabKey: ResearchTableName;
  title: string;
  singularLabel: string;
  addLabel: string;
  items: ResearchRecord[];
  programmeLabel: string | null;
  onNotify: (feedback: { type: "success" | "error"; message: string }) => void;
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

  const values = [item.slug, item.is_active, item.created_at, item.montant?.toString() ?? ""];

  return values.some((value) => value?.toLowerCase().includes(normalizedQuery));
};

const parseSujetJuryMembers = (value: unknown): SujetJuryMember[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const row = item as Record<string, unknown>;
      const membre = typeof row.membre === "string" ? row.membre.trim() : "";
      const enseignant = typeof row.enseignant === "string" ? row.enseignant.trim() : "";

      if (!membre && !enseignant) {
        return null;
      }

      return {
        membre,
        enseignant,
      };
    })
    .filter((item): item is SujetJuryMember => item !== null);
};

function ResearchEntityPanel({
  anneeId,
  promotionId,
  tabKey,
  title,
  singularLabel,
  addLabel,
  items,
  programmeLabel,
  onNotify,
}: ResearchEntityPanelProps) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [editingItem, setEditingItem] = useState<ResearchRecord | null>(null);
  const [juryRows, setJuryRows] = useState<SujetJuryMember[]>([{ membre: "", enseignant: "" }]);
  const [editorMode, setEditorMode] = useState<"list" | "create" | "edit">("list");

  const filteredItems = useMemo(() => items.filter((item) => matchesSearch(item, search)), [items, search]);
  const totalPages = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginatedItems = filteredItems.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const activeItemsCount = items.filter((item) => item.is_active?.trim().toLowerCase() === "oui").length;

  const startCreate = () => {
    setEditingItem(null);
    if (tabKey === "sujets") {
      setJuryRows([{ membre: "", enseignant: "" }]);
    }
    setEditorMode("create");
  };

  const startEdit = (item: ResearchRecord) => {
    setEditingItem(item);
    if (tabKey === "sujets") {
      const existingRows = parseSujetJuryMembers(item.jury);
      setJuryRows(existingRows.length > 0 ? existingRows : [{ membre: "", enseignant: "" }]);
    }
    setEditorMode("edit");
  };

  const backToMainView = () => {
    setEditingItem(null);
    setEditorMode("list");
  };

  const submitResearchRecord = async (formData: FormData) => {
    await saveResearchRecordAction(formData);
  };

  const submitDeleteResearchRecord = async (formData: FormData) => {
    await deleteResearchRecordAction(formData);
  };

  if (editorMode !== "list") {
    return (
      <ComponentCard
        title={editorMode === "edit" ? `Modification ${singularLabel.toLowerCase()}` : addLabel}
        desc={`Renseignez les metadonnees de ${singularLabel.toLowerCase()} pour cette promotion.`}
      >
        <div className="space-y-6">
          <div className="flex items-center justify-between gap-3">
            <Button type="button" variant="outline" onClick={backToMainView}>
              Retour a la page principale
            </Button>
          </div>

          <form action={submitResearchRecord} className="grid gap-5 lg:grid-cols-2">
            <input type="hidden" name="entity" value={tabKey} />
            <input type="hidden" name="id" value={editingItem?.id ?? ""} />
            <input type="hidden" name="programme_id" value={promotionId} />
            <input type="hidden" name="annee" value={anneeId} />
            <input type="hidden" name="promotion" value={promotionId} />
            <input type="hidden" name="tab" value={tabKey} />
            {tabKey === "sujets" ? <input type="hidden" name="jury_json" value={JSON.stringify(juryRows)} /> : null}

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
                rows={10}
                defaultValue={formatResearchDescription(editingItem?.description)}
                placeholder="Decrivez la ressource avec un texte clair (resume, objectif, consignes, etc.)."
                className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-3 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              />
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                Affichage simplifie: le champ privilegie un texte lisible meme si la valeur source est en JSON.
              </p>
            </div>

            {tabKey === "sujets" ? (
              <div className="lg:col-span-2 space-y-3 rounded-2xl border border-gray-200 p-4 dark:border-gray-800">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-semibold text-gray-800 dark:text-white/90">Jury</h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Structure: {`{ membre: string, enseignant: string }[]`}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setJuryRows((current) => [...current, { membre: "", enseignant: "" }])}
                  >
                    Ajouter un membre
                  </Button>
                </div>

                <div className="space-y-3">
                  {juryRows.map((row, index) => (
                    <div key={`${tabKey}-jury-${index}`} className="grid gap-3 rounded-xl border border-gray-200 p-3 dark:border-gray-700 lg:grid-cols-[1fr_1fr_auto]">
                      <input
                        value={row.membre}
                        onChange={(event) =>
                          setJuryRows((current) =>
                            current.map((item, currentIndex) =>
                              currentIndex === index ? { ...item, membre: event.target.value } : item,
                            ),
                          )
                        }
                        placeholder="Membre (ex: President)"
                        className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                      />
                      <input
                        value={row.enseignant}
                        onChange={(event) =>
                          setJuryRows((current) =>
                            current.map((item, currentIndex) =>
                              currentIndex === index ? { ...item, enseignant: event.target.value } : item,
                            ),
                          )
                        }
                        placeholder="Enseignant (ex: Prof. Nom Prenom)"
                        className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() =>
                          setJuryRows((current) => {
                            if (current.length <= 1) {
                              return [{ membre: "", enseignant: "" }];
                            }

                            return current.filter((_, currentIndex) => currentIndex !== index);
                          })
                        }
                      >
                        Supprimer
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="lg:col-span-2 flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={backToMainView}>
                Annuler
              </Button>
              <FormSubmitButton
                idleLabel={editingItem ? "Enregistrer les modifications" : "Creer"}
                pendingLabel="Enregistrement..."
              />
            </div>
          </form>
        </div>
      </ComponentCard>
    );
  }

  return (
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

          <Button onClick={startCreate}>{addLabel}</Button>
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
                    <TableCell className="px-5 py-4 text-sm">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${getStatusBadgeClassName(item.is_active)}`}>
                        {item.is_active || "Indefini"}
                      </span>
                    </TableCell>
                    <TableCell className="px-5 py-4 text-sm text-gray-500 dark:text-gray-400">{formatDate(item.created_at)}</TableCell>
                    <TableCell className="px-5 py-4">
                      <div className="flex justify-end gap-3">
                        <AsyncProgressButton
                          action={async () => {
                            const payload = new FormData();
                            payload.append("entity", tabKey);
                            payload.append("programme_id", promotionId);
                            payload.append("promotion", promotionId);
                            payload.append("annee", anneeId);
                            payload.append("record_id", item.id);
                            payload.append("programme_label", programmeLabel ?? "");
                            return notifyResearchRecordAction(payload);
                          }}
                          idleLabel="Notifier"
                          progressMessages={[
                            "Preparation...",
                            "Chargement des inscrits...",
                            "Envoi des emails...",
                            "Finalisation...",
                          ]}
                          onSuccess={(result) => {
                            onNotify({
                              type: "success",
                              message: `${result?.notifiedCount ?? 0} etudiant(s) notifie(s).`,
                            });
                          }}
                          onError={(error) => {
                            onNotify({
                              type: "error",
                              message: error.message,
                            });
                          }}
                          className="px-3 py-2"
                        />
                        <button
                          type="button"
                          onClick={() => startEdit(item)}
                          className="text-sm font-medium text-brand-500 hover:text-brand-600"
                        >
                          Modifier
                        </button>
                        <form action={submitDeleteResearchRecord}>
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
                    <td colSpan={5} className="px-5 py-8 text-sm text-gray-500 dark:text-gray-400">
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
  );
}

export default function ChargeRecherchePanel({
  anneeId,
  promotionId,
  defaultTab = "stages",
  stages,
  sujets,
  laboratoires,
  programmeLabel,
}: ChargeRecherchePanelProps) {
  const totalRecords = stages.length + sujets.length + laboratoires.length;
  const [notificationFeedback, setNotificationFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  return (
    <div className="space-y-6">
      {notificationFeedback ? (
        <div
          className={`rounded-2xl border px-4 py-3 text-sm ${
            notificationFeedback.type === "success"
              ? "border-success-200 bg-success-50 text-success-700 dark:border-success-500/30 dark:bg-success-500/10 dark:text-success-300"
              : "border-error-200 bg-error-50 text-error-700 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-300"
          }`}
        >
          {notificationFeedback.message}
        </div>
      ) : null}

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
                programmeLabel={programmeLabel}
                onNotify={setNotificationFeedback}
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
                programmeLabel={programmeLabel}
                onNotify={setNotificationFeedback}
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
                programmeLabel={programmeLabel}
                onNotify={setNotificationFeedback}
              />
            ),
          },
        ]}
      />
    </div>
  );
}
