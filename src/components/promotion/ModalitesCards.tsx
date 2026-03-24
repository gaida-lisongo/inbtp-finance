"use client";

import { FormEvent, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

import {
  bulkInsertModalitesAction,
  createModaliteEntraGroupAction,
  deleteModaliteAction,
  saveModaliteAction,
  type ModaliteActionResult,
  type ModaliteBulkInput,
} from "@/app/(admin)/promotion/[promotionId]/[anneeId]/actions";
import AppLoader from "@/components/common/AppLoader";
import CsvImportModal, {
  type CsvImportColumn,
  type CsvImportHelpers,
  type CsvImportPreviewBase,
} from "@/components/common/CsvImportModal";
import Label from "@/components/form/Label";
import InputField from "@/components/form/input/InputField";
import { Modal } from "@/components/ui/modal";

export type FraisOption = {
  id: string;
  designation: string | null;
};

export type ModaliteRecord = {
  id: number;
  created_at: string | null;
  designation: string | null;
  slug: string | null;
  montant: number | null;
  description: string | null;
  status: string | null;
  annee_id: string | null;
  frais_id: string | null;
  groupe_id: string | null;
};

type ModalitesCardsProps = {
  promotionId: string;
  anneeId: string;
  fraisOptions: FraisOption[];
  modalites: ModaliteRecord[];
};

type ModaliteCsvPreviewRow = CsvImportPreviewBase & {
  designation: string;
  frais: string;
  fraisId: string;
  slug: string;
  montant: string;
  montantValue: number;
  description: string;
  status: string;
};

const initialActionState: ModaliteActionResult = {
  ok: true,
  message: "",
};

const formatCurrency = (value: number | null) =>
  new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value ?? 0);

const normalizeMultilineText = (value: string) => value.replace(/\\n/g, "\n").trim();

const slugify = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export default function ModalitesCards({
  promotionId,
  anneeId,
  fraisOptions,
  modalites,
}: ModalitesCardsProps) {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkFraisId, setBulkFraisId] = useState("");
  const [editingModalite, setEditingModalite] = useState<ModaliteRecord | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeletingId, setIsDeletingId] = useState<number | null>(null);
  const [isCreatingGroupId, setIsCreatingGroupId] = useState<number | null>(null);
  const [actionState, setActionState] = useState<ModaliteActionResult>(initialActionState);

  const currentValues = editingModalite ?? {
    id: 0,
    created_at: null,
    designation: "",
    slug: "",
    montant: null,
    description: "",
    status: "active",
    annee_id: anneeId,
    frais_id: "",
  };

  const getFraisLabel = (fraisId: string | null) =>
    fraisOptions.find((item) => item.id === fraisId)?.designation ?? "Frais non defini";

  const closeModal = () => {
    if (isSubmitting) {
      return;
    }

    setIsModalOpen(false);
    setEditingModalite(null);
    setActionState(initialActionState);
  };

  const openCreateModal = () => {
    setEditingModalite(null);
    setActionState(initialActionState);
    setIsModalOpen(true);
  };

  const openEditModal = (item: ModaliteRecord) => {
    setEditingModalite(item);
    setActionState(initialActionState);
    setIsModalOpen(true);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setActionState(initialActionState);
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const result = await saveModaliteAction(formData);

    setActionState(result);
    setIsSubmitting(false);

    if (result.ok) {
      closeModal();
      router.refresh();
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Supprimer cette modalite ?")) {
      return;
    }

    setIsDeletingId(id);
    const result = await deleteModaliteAction({
      id: String(id),
      promotionId,
      anneeId,
    });
    setActionState(result);
    setIsDeletingId(null);

    if (result.ok) {
      router.refresh();
    }
  };

  const handleCreateEntraGroup = async (item: ModaliteRecord) => {
    setActionState(initialActionState);
    setIsCreatingGroupId(item.id);

    const result = await createModaliteEntraGroupAction({
      id: String(item.id),
      promotionId,
      anneeId,
      designation: item.designation ?? "",
      slug: item.slug ?? "",
      groupeId: item.groupe_id,
    });

    setActionState(result);
    setIsCreatingGroupId(null);

    if (result.ok) {
      router.refresh();
    }
  };

  const parseModaliteCsvRow = (
    rowData: Record<string, string>,
    rowNumber: number,
  ): ModaliteCsvPreviewRow => {
    const designation = String(rowData.designation ?? "").trim();
    const frais = getFraisLabel(bulkFraisId);
    const slug = String(rowData.slug ?? "").trim() || slugify(designation);
    const montant = String(rowData.montant ?? "").trim();
    const montantValue = Number(montant.replace(",", "."));
    const description = normalizeMultilineText(String(rowData.description ?? ""));
    const status = String(rowData.status ?? "").trim() || "active";
    const fraisId = bulkFraisId.trim();

    const error = !designation
      ? "Designation manquante"
      : !fraisId
      ? "Frais manquant"
      : !montant
      ? "Montant manquant"
      : !Number.isFinite(montantValue) || montantValue < 0
      ? "Montant invalide"
      : !status
      ? "Statut manquant"
      : null;

    return {
      rowNumber,
      designation,
      frais,
      fraisId,
      slug,
      montant,
      montantValue,
      description,
      status,
      isValid: !error,
      error,
    };
  };

  const modalitesPreviewColumns: CsvImportColumn<ModaliteCsvPreviewRow>[] = [
    {
      label: "Designation",
      render: (row) => <span className="text-gray-800 dark:text-white/90">{row.designation || "-"}</span>,
    },
    { label: "Frais", render: (row) => row.frais || "-" },
    { label: "Slug", render: (row) => row.slug || "-" },
    { label: "Montant", render: (row) => row.montant || "-" },
    {
      label: "Description",
      render: (row) => (
        <span className="block max-w-xs whitespace-pre-line">{row.description || "-"}</span>
      ),
    },
    { label: "Statut", render: (row) => row.status || "-" },
  ];

  const handleBulkImport = async (
    rows: ModaliteCsvPreviewRow[],
    { reportProgress }: CsvImportHelpers,
  ) => {
    const chunkSize = 20;
    let inserted = 0;

    reportProgress(0, rows.length);

    for (let index = 0; index < rows.length; index += chunkSize) {
      const chunk = rows.slice(index, index + chunkSize);
      const payload: ModaliteBulkInput[] = chunk.map((row) => ({
        designation: row.designation,
        slug: row.slug,
        montant: row.montantValue,
        description: row.description,
        status: row.status,
        fraisId: row.fraisId,
      }));

      const result = await bulkInsertModalitesAction(promotionId, anneeId, payload);

      if (!result.ok) {
        return {
          ok: false,
          message: result.message,
        };
      }

      inserted += result.insertedCount;
      reportProgress(inserted, rows.length);
    }

    router.refresh();

    return {
      ok: true,
      message: `${inserted} modalite(s) importee(s) avec succes.`,
    };
  };

  return (
    <>
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            Modalites de paiements
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Definissez les modalites associees aux frais de cette promotion.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => {
              setBulkFraisId("");
              setIsBulkModalOpen(true);
            }}
            className="inline-flex items-center justify-center rounded-lg bg-white px-5 py-3 text-sm font-medium text-gray-700 ring-1 ring-inset ring-gray-300 transition hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-400 dark:ring-gray-700 dark:hover:bg-white/[0.03]"
          >
            Import CSV
          </button>
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center justify-center rounded-lg bg-brand-500 px-5 py-3 text-sm font-medium text-white transition hover:bg-brand-600"
          >
            Nouvelle modalite
          </button>
        </div>
      </div>

      {actionState.message ? (
        <div
          className={`rounded-xl border px-4 py-3 text-sm ${
            actionState.ok
              ? "border-success-200 bg-success-50 text-success-700 dark:border-success-500/30 dark:bg-success-500/10 dark:text-success-400"
              : "border-error-200 bg-error-50 text-error-700 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-400"
          }`}
        >
          <p>{actionState.message}</p>
          {actionState.details?.length ? (
            <div className="mt-2 space-y-1 font-medium">
              {actionState.details.map((detail) => (
                <p key={detail} className="break-all">
                  {detail}
                </p>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        {modalites.map((item) => (
          <article
            key={item.id}
            className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03]"
          >
            <div className="relative h-44 w-full">
              <Image
                src="/images/carousel/carousel-04.png"
                alt={item.designation ?? "Illustration de la modalite"}
                fill
                className="object-cover"
              />
              <button
                type="button"
                title={
                  item.groupe_id
                    ? "Groupe Entra ID deja cree"
                    : isCreatingGroupId === item.id
                    ? "Creation du groupe Entra ID en cours"
                    : "Creer le groupe Entra ID"
                }
                aria-label={
                  item.groupe_id
                    ? "Groupe Entra ID deja cree"
                    : isCreatingGroupId === item.id
                    ? "Creation du groupe Entra ID en cours"
                    : "Creer le groupe Entra ID"
                }
                disabled={Boolean(item.groupe_id) || isCreatingGroupId === item.id}
                onClick={() => void handleCreateEntraGroup(item)}
                className={`absolute right-4 top-4 inline-flex h-8 w-16 items-center rounded-full border px-1 transition ${
                  item.groupe_id
                    ? "border-success-200 bg-success-500 justify-end dark:border-success-500/30"
                    : "border-gray-200 bg-white/90 justify-start hover:border-brand-200 dark:border-gray-700 dark:bg-gray-900/80"
                } ${isCreatingGroupId === item.id ? "opacity-70" : ""}`}
              >
                <span
                  className={`inline-block h-6 w-6 rounded-full transition ${
                    item.groupe_id
                      ? "bg-white"
                      : "bg-brand-500 dark:bg-brand-400"
                  }`}
                />
              </button>
            </div>

            <div className="space-y-4 p-5">
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
                    {item.designation ?? "Sans designation"}
                  </h3>
                  <span className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700 dark:bg-brand-500/10 dark:text-brand-300">
                    {formatCurrency(item.montant)}
                  </span>
                </div>
                <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                  {getFraisLabel(item.frais_id)}
                </p>
                <p className="whitespace-pre-line text-sm text-gray-500 dark:text-gray-400">
                  {normalizeMultilineText(item.description ?? "Aucune description pour cette modalite.")}
                </p>
              </div>

              <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                <span>Slug: {item.slug ?? "-"}</span>
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full px-2.5 py-1 font-medium ${
                      item.groupe_id
                        ? "bg-success-50 text-success-700 dark:bg-success-500/10 dark:text-success-400"
                        : "bg-warning-50 text-warning-700 dark:bg-warning-500/10 dark:text-warning-400"
                    }`}
                  >
                    {item.groupe_id ? "Groupe cree" : "Groupe non cree"}
                  </span>
                  <span className="rounded-full bg-gray-100 px-2.5 py-1 font-medium text-gray-700 dark:bg-white/10 dark:text-gray-300">
                    {item.status ?? "non defini"}
                  </span>
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t border-gray-100 pt-4 dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => openEditModal(item)}
                  className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-800 dark:text-gray-300 dark:hover:bg-white/[0.03]"
                >
                  Modifier
                </button>
                <button
                  type="button"
                  disabled={isDeletingId === item.id}
                  onClick={() => void handleDelete(item.id)}
                  className="rounded-lg border border-error-200 px-3 py-2 text-sm font-medium text-error-700 transition hover:bg-error-50 disabled:opacity-50 dark:border-error-500/30 dark:text-error-300 dark:hover:bg-error-500/10"
                >
                  {isDeletingId === item.id ? "Suppression..." : "Supprimer"}
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>

      {modalites.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 px-6 py-10 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
          Aucune modalite n&apos;est encore enregistree pour cette annee et cette promotion.
        </div>
      ) : null}

      <Modal isOpen={isModalOpen} onClose={closeModal} className="m-4 max-w-[700px]">
        <div className="relative p-6 sm:p-8">
          {isSubmitting ? (
            <div className="absolute inset-0 z-10 rounded-3xl bg-white/90 backdrop-blur-sm dark:bg-gray-900/90">
              <AppLoader message="Enregistrement de la modalite" fullscreen />
            </div>
          ) : null}

          <div className="mb-6">
            <h3 className="text-xl font-semibold text-gray-800 dark:text-white/90">
              {editingModalite ? "Modifier la modalite" : "Nouvelle modalite"}
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Associez une modalite a un frais de la promotion.
            </p>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            <input type="hidden" name="id" value={editingModalite?.id ?? ""} />
            <input type="hidden" name="promotionId" value={promotionId} />
            <input type="hidden" name="anneeId" value={anneeId} />

            <div className="grid grid-cols-1 gap-5">
              <div>
                <Label htmlFor="designation">Designation</Label>
                <InputField id="designation" name="designation" defaultValue={currentValues.designation ?? ""} />
                {actionState.errors?.designation ? (
                  <p className="mt-1.5 text-xs text-error-500">{actionState.errors.designation}</p>
                ) : null}
              </div>

              <div>
                <Label htmlFor="fraisId">Frais</Label>
                <select
                  id="fraisId"
                  name="fraisId"
                  defaultValue={currentValues.frais_id ?? ""}
                  className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:focus:border-brand-800"
                >
                  <option value="">Selectionnez un frais</option>
                  {fraisOptions.map((frais) => (
                    <option key={frais.id} value={frais.id}>
                      {frais.designation ?? "Frais sans designation"}
                    </option>
                  ))}
                </select>
                {actionState.errors?.fraisId ? (
                  <p className="mt-1.5 text-xs text-error-500">{actionState.errors.fraisId}</p>
                ) : null}
              </div>

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div>
                  <Label htmlFor="slug">Slug</Label>
                  <InputField id="slug" name="slug" defaultValue={currentValues.slug ?? ""} />
                  {actionState.errors?.slug ? (
                    <p className="mt-1.5 text-xs text-error-500">{actionState.errors.slug}</p>
                  ) : null}
                </div>
                <div>
                  <Label htmlFor="status">Statut</Label>
                  <select
                    id="status"
                    name="status"
                    defaultValue={currentValues.status ?? "active"}
                    className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:focus:border-brand-800"
                  >
                    <option value="active">active</option>
                    <option value="inactive">inactive</option>
                    <option value="planifiee">planifiee</option>
                  </select>
                  {actionState.errors?.status ? (
                    <p className="mt-1.5 text-xs text-error-500">{actionState.errors.status}</p>
                  ) : null}
                </div>
              </div>

              <div>
                <Label htmlFor="montant">Montant</Label>
                <InputField
                  id="montant"
                  name="montant"
                  type="number"
                  step={0.01}
                  defaultValue={currentValues.montant ?? ""}
                />
                {actionState.errors?.montant ? (
                  <p className="mt-1.5 text-xs text-error-500">{actionState.errors.montant}</p>
                ) : null}
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <textarea
                  id="description"
                  name="description"
                  rows={5}
                  defaultValue={currentValues.description ?? ""}
                  className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:focus:border-brand-800"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-gray-100 pt-5 dark:border-gray-800">
              <button
                type="button"
                onClick={closeModal}
                disabled={isSubmitting}
                className="inline-flex items-center justify-center rounded-lg bg-white px-5 py-3 text-sm font-medium text-gray-700 ring-1 ring-inset ring-gray-300 transition hover:bg-gray-50 disabled:opacity-50 dark:bg-gray-800 dark:text-gray-400 dark:ring-gray-700 dark:hover:bg-white/[0.03]"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center justify-center rounded-lg bg-brand-500 px-5 py-3 text-sm font-medium text-white transition hover:bg-brand-600 disabled:opacity-50"
              >
                {editingModalite ? "Mettre a jour" : "Creer"}
              </button>
            </div>
          </form>
        </div>
      </Modal>

      <CsvImportModal
        isOpen={isBulkModalOpen}
        onClose={() => {
          setIsBulkModalOpen(false);
          setBulkFraisId("");
        }}
        title="Import CSV des modalites"
        expectedColumns={["designation", "slug", "montant", "description", "status"]}
        templateFileName="modele-modalites.csv"
        templateRows={[
          ["designation", "slug", "montant", "description", "status"],
          ["1ere tranche", "premiere-tranche", "50", "Paiement au debut\\nDu semestre", "active"],
          ["Solde", "", "100", "Paiement final", "planifiee"],
        ]}
        previewColumns={modalitesPreviewColumns}
        parseRow={parseModaliteCsvRow}
        onImport={handleBulkImport}
        progressMessage={(current, total) => `Creation des modalites ${current}/${total}`}
        stepOneContent={
          <div>
            <Label htmlFor="bulk-frais-id">Frais a associer a ce fichier</Label>
            <select
              id="bulk-frais-id"
              value={bulkFraisId}
              onChange={(event) => setBulkFraisId(event.target.value)}
              className="mt-2 h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:focus:border-brand-800"
            >
              <option value="">Selectionnez un frais</option>
              {fraisOptions.map((frais) => (
                <option key={frais.id} value={frais.id}>
                  {frais.designation ?? "Frais sans designation"}
                </option>
              ))}
            </select>
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              Toutes les lignes du fichier CSV seront rattachees a ce frais.
            </p>
          </div>
        }
        stepTwoSummaryContent={
          <>
            Frais selectionne : <span className="font-semibold">{getFraisLabel(bulkFraisId)}</span>
          </>
        }
      />
    </>
  );
}
