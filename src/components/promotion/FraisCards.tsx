"use client";

import { FormEvent, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

import {
  bulkInsertFraisAction,
  deleteFraisAction,
  saveFraisAction,
  type FraisActionResult,
  type FraisBulkInput,
} from "@/app/(admin)/promotion/[promotionId]/actions";
import Label from "@/components/form/Label";
import InputField from "@/components/form/input/InputField";
import AppLoader from "@/components/common/AppLoader";
import CsvImportModal, {
  type CsvImportColumn,
  type CsvImportHelpers,
  type CsvImportPreviewBase,
} from "@/components/common/CsvImportModal";
import { Modal } from "@/components/ui/modal";

export type FraisRecord = {
  id: string;
  created_at: string | null;
  designation: string | null;
  description: string | null;
  montant: number | null;
  promotion_id: string | null;
};

type FraisCardsProps = {
  promotionId: string;
  promotionName: string;
  frais: FraisRecord[];
};

type FraisCsvPreviewRow = CsvImportPreviewBase & {
  designation: string;
  description: string;
  montant: string;
  montantValue: number;
};

const initialActionState: FraisActionResult = {
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

export default function FraisCards({ promotionId, promotionName, frais }: FraisCardsProps) {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [editingFrais, setEditingFrais] = useState<FraisRecord | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
  const [actionState, setActionState] = useState<FraisActionResult>(initialActionState);

  const currentValues = editingFrais ?? {
    id: "",
    created_at: null,
    designation: "",
    description: "",
    montant: null,
    promotion_id: promotionId,
  };

  const closeModal = () => {
    if (isSubmitting) {
      return;
    }

    setIsModalOpen(false);
    setEditingFrais(null);
    setActionState(initialActionState);
  };

  const openCreateModal = () => {
    setEditingFrais(null);
    setActionState(initialActionState);
    setIsModalOpen(true);
  };

  const openEditModal = (item: FraisRecord) => {
    setEditingFrais(item);
    setActionState(initialActionState);
    setIsModalOpen(true);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setActionState(initialActionState);
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const result = await saveFraisAction(formData);

    setActionState(result);
    setIsSubmitting(false);

    if (result.ok) {
      closeModal();
      router.refresh();
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Supprimer ce frais ?")) {
      return;
    }

    setIsDeletingId(id);
    const result = await deleteFraisAction({ id, promotionId });
    setActionState(result);
    setIsDeletingId(null);

    if (result.ok) {
      router.refresh();
    }
  };

  const parseFraisCsvRow = (rowData: Record<string, string>, rowNumber: number): FraisCsvPreviewRow => {
    const designation = String(rowData.designation ?? "").trim();
    const description = normalizeMultilineText(String(rowData.description ?? ""));
    const montant = String(rowData.montant ?? "").trim();
    const montantValue = Number(montant.replace(",", "."));
    const error = !designation
      ? "Designation manquante"
      : !montant
      ? "Montant manquant"
      : !Number.isFinite(montantValue) || montantValue < 0
      ? "Montant invalide"
      : null;

    return {
      rowNumber,
      designation,
      description,
      montant,
      montantValue,
      isValid: !error,
      error,
    };
  };

  const fraisPreviewColumns: CsvImportColumn<FraisCsvPreviewRow>[] = [
    {
      label: "Designation",
      render: (row) => <span className="text-gray-800 dark:text-white/90">{row.designation || "-"}</span>,
    },
    {
      label: "Description",
      render: (row) => (
        <span className="block max-w-xs whitespace-pre-line">{row.description || "-"}</span>
      ),
    },
    { label: "Montant", render: (row) => row.montant || "-" },
  ];

  const handleBulkImport = async (
    rows: FraisCsvPreviewRow[],
    { reportProgress }: CsvImportHelpers,
  ) => {
    const chunkSize = 20;
    let inserted = 0;

    reportProgress(0, rows.length);

    for (let index = 0; index < rows.length; index += chunkSize) {
      const chunk = rows.slice(index, index + chunkSize);
      const payload: FraisBulkInput[] = chunk.map((row) => ({
        designation: row.designation,
        description: row.description,
        montant: row.montantValue,
      }));

      const result = await bulkInsertFraisAction(promotionId, payload);

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
      message: `${inserted} frais importe(s) avec succes.`,
    };
  };

  return (
    <>
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">{promotionName}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Frais rattaches a cette promotion.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setIsBulkModalOpen(true)}
            className="inline-flex items-center justify-center rounded-lg bg-white px-5 py-3 text-sm font-medium text-gray-700 ring-1 ring-inset ring-gray-300 transition hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-400 dark:ring-gray-700 dark:hover:bg-white/[0.03]"
          >
            Import CSV
          </button>
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center justify-center rounded-lg bg-brand-500 px-5 py-3 text-sm font-medium text-white transition hover:bg-brand-600"
          >
            Nouveau frais
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
          {actionState.message}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        {frais.map((item) => (
          <article
            key={item.id}
            className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03]"
          >
            <div className="relative h-44 w-full">
              <Image
                src="/images/carousel/carousel-03.png"
                alt={item.designation ?? "Illustration du frais"}
                fill
                className="object-cover"
              />
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
                <p className="whitespace-pre-line text-sm text-gray-500 dark:text-gray-400">
                  {normalizeMultilineText(item.description ?? "Aucune description pour ce frais.")}
                </p>
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

      {frais.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 px-6 py-10 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
          Aucun frais n&apos;est encore enregistre pour cette promotion.
        </div>
      ) : null}

      <Modal isOpen={isModalOpen} onClose={closeModal} className="m-4 max-w-[700px]">
        <div className="relative p-6 sm:p-8">
          {isSubmitting ? (
            <div className="absolute inset-0 z-10 rounded-3xl bg-white/90 backdrop-blur-sm dark:bg-gray-900/90">
              <AppLoader message="Enregistrement du frais" fullscreen />
            </div>
          ) : null}

          <div className="mb-6">
            <h3 className="text-xl font-semibold text-gray-800 dark:text-white/90">
              {editingFrais ? "Modifier le frais" : "Nouveau frais"}
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Creez ou mettez a jour un frais de la promotion.
            </p>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            <input type="hidden" name="id" value={currentValues.id} />
            <input type="hidden" name="promotionId" value={promotionId} />

            <div className="grid grid-cols-1 gap-5">
              <div>
                <Label htmlFor="designation">Designation</Label>
                <InputField id="designation" name="designation" defaultValue={currentValues.designation ?? ""} />
                {actionState.errors?.designation ? (
                  <p className="mt-1.5 text-xs text-error-500">{actionState.errors.designation}</p>
                ) : null}
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
                {editingFrais ? "Mettre a jour" : "Creer"}
              </button>
            </div>
          </form>
        </div>
      </Modal>

      <CsvImportModal
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        title="Import CSV des frais"
        expectedColumns={["designation", "description", "montant"]}
        templateFileName="modele-frais.csv"
        templateRows={[
          ["designation", "description", "montant"],
          ["Frais academiques", "Paiement principal\\nObligatoire", "150"],
          ["Bibliotheque", "Acces aux ressources", "25"],
        ]}
        previewColumns={fraisPreviewColumns}
        parseRow={parseFraisCsvRow}
        onImport={handleBulkImport}
        progressMessage={(current, total) => `Creation des frais ${current}/${total}`}
      />
    </>
  );
}
