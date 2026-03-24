"use client";

import { FormEvent, startTransition, useState } from "react";
import { useRouter } from "next/navigation";

import AppLoader from "@/components/common/AppLoader";
import Label from "@/components/form/Label";
import InputField from "@/components/form/input/InputField";
import Button from "@/components/ui/button/Button";
import { Modal } from "@/components/ui/modal";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import {
  deletePromotionAction,
  savePromotionAction,
  type PromotionActionResult,
} from "@/app/(admin)/promotions/actions";

export type PromotionRecord = {
  id: string;
  created_at: string | null;
  designation: string | null;
  slug: string | null;
  description: string | null;
};

type PromotionsDataTableProps = {
  promotions: PromotionRecord[];
};

type EditingPromotion = PromotionRecord | null;

const initialActionState: PromotionActionResult = {
  ok: true,
  message: "",
};

const textareaClassName =
  "w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800";

const formatDate = (value: string | null) => {
  if (!value) {
    return "Non renseignee";
  }

  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
};

const getDefaultFormValues = (): Omit<PromotionRecord, "id" | "created_at"> => ({
  designation: "",
  slug: "",
  description: "",
});

export default function PromotionsDataTable({ promotions }: PromotionsDataTableProps) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPromotion, setEditingPromotion] = useState<EditingPromotion>(null);
  const [actionState, setActionState] = useState<PromotionActionResult>(initialActionState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);

  const filteredPromotions = promotions.filter((promotion) => {
    const haystack = [
      promotion.designation ?? "",
      promotion.slug ?? "",
      promotion.description ?? "",
    ]
      .join(" ")
      .toLowerCase();

    return haystack.includes(searchTerm.trim().toLowerCase());
  });

  const openCreateModal = () => {
    setEditingPromotion(null);
    setActionState(initialActionState);
    setIsModalOpen(true);
  };

  const openEditModal = (promotion: PromotionRecord) => {
    setEditingPromotion(promotion);
    setActionState(initialActionState);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    if (isSubmitting) {
      return;
    }

    setIsModalOpen(false);
    setEditingPromotion(null);
    setActionState(initialActionState);
  };

  const handleSubmit = async (formData: FormData) => {
    setIsSubmitting(true);

    const result = await savePromotionAction(formData);
    setActionState(result);

    if (result.ok) {
      setIsSubmitting(false);
      closeModal();
      router.refresh();
      return;
    }

    setIsSubmitting(false);
  };

  const handleFormSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setActionState(initialActionState);

    const formData = new FormData(event.currentTarget);
    await handleSubmit(formData);
  };

  const handleDelete = (id: string, designation: string | null) => {
    if (!window.confirm(`Supprimer la promotion "${designation ?? "Sans designation"}" ?`)) {
      return;
    }

    setActionState(initialActionState);
    setIsDeletingId(id);

    startTransition(async () => {
      const result = await deletePromotionAction(id);
      setActionState(result);
      setIsDeletingId(null);

      if (result.ok) {
        router.refresh();
      }
    });
  };

  const currentValues = editingPromotion ?? {
    id: "",
    created_at: null,
    ...getDefaultFormValues(),
  };

  return (
    <>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="w-full lg:max-w-sm">
          <Label htmlFor="promotions-search">Recherche</Label>
          <InputField
            id="promotions-search"
            placeholder="Designation, slug ou description"
            defaultValue={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
        </div>

        <div className="flex items-end">
          <Button onClick={openCreateModal}>Nouvelle promotion</Button>
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

      <div className="overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-800">
        <div className="max-w-full overflow-x-auto">
          <Table>
            <TableHeader className="border-b border-gray-100 bg-gray-50 dark:border-gray-800 dark:bg-white/[0.02]">
              <TableRow>
                {["Designation", "Slug", "Description", "Creation", "Actions"].map((label) => (
                  <TableCell
                    key={label}
                    isHeader
                    className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400"
                  >
                    {label}
                  </TableCell>
                ))}
              </TableRow>
            </TableHeader>

            <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
              {filteredPromotions.length > 0 ? (
                filteredPromotions.map((promotion) => (
                  <TableRow key={promotion.id} className="align-top">
                    <TableCell className="px-5 py-4 text-sm font-medium text-gray-800 dark:text-white/90">
                      {promotion.designation ?? "Sans designation"}
                    </TableCell>
                    <TableCell className="px-5 py-4 text-sm text-gray-500 dark:text-gray-400">
                      {promotion.slug ?? "-"}
                    </TableCell>
                    <TableCell className="px-5 py-4 text-sm text-gray-500 dark:text-gray-400">
                      <div className="max-w-[320px] whitespace-pre-wrap">
                        {promotion.description ?? "-"}
                      </div>
                    </TableCell>
                    <TableCell className="px-5 py-4 text-sm text-gray-500 dark:text-gray-400">
                      {formatDate(promotion.created_at)}
                    </TableCell>
                    <TableCell className="px-5 py-4">
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="outline" onClick={() => openEditModal(promotion)}>
                          Modifier
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={isDeletingId === promotion.id}
                          onClick={() => handleDelete(promotion.id, promotion.designation)}
                        >
                          {isDeletingId === promotion.id ? "Suppression..." : "Supprimer"}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <td
                    colSpan={5}
                    className="px-5 py-10 text-center text-sm text-gray-500 dark:text-gray-400"
                  >
                    Aucune promotion ne correspond a votre recherche.
                  </td>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={closeModal} className="m-4 max-w-[700px]">
        <div className="relative p-6 sm:p-8">
          {isSubmitting ? (
            <div className="absolute inset-0 z-10 rounded-3xl bg-white/90 backdrop-blur-sm dark:bg-gray-900/90">
              <AppLoader message="Enregistrement de la promotion" fullscreen />
            </div>
          ) : null}

          <div className="mb-6">
            <h3 className="text-xl font-semibold text-gray-800 dark:text-white/90">
              {editingPromotion ? "Modifier la promotion" : "Nouvelle promotion"}
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Renseignez les informations essentielles de la promotion.
            </p>
          </div>

          <form key={editingPromotion?.id ?? "create"} className="space-y-5" onSubmit={handleFormSubmit}>
            <input type="hidden" name="id" value={currentValues.id} />

            <div className="grid grid-cols-1 gap-5">
              <div>
                <Label htmlFor="designation">Designation</Label>
                <InputField
                  id="designation"
                  name="designation"
                  placeholder="Ex: Licence 1"
                  defaultValue={currentValues.designation ?? ""}
                />
                {actionState.errors?.designation ? (
                  <p className="mt-1.5 text-xs text-error-500">{actionState.errors.designation}</p>
                ) : null}
              </div>

              <div>
                <Label htmlFor="slug">Slug</Label>
                <InputField
                  id="slug"
                  name="slug"
                  placeholder="Laisse vide pour generation automatique"
                  defaultValue={currentValues.slug ?? ""}
                />
                {actionState.errors?.slug ? (
                  <p className="mt-1.5 text-xs text-error-500">{actionState.errors.slug}</p>
                ) : null}
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <textarea
                  id="description"
                  name="description"
                  rows={5}
                  placeholder="Description de la promotion"
                  defaultValue={currentValues.description ?? ""}
                  className={textareaClassName}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-gray-100 pt-5 dark:border-gray-800">
              <button
                type="button"
                onClick={closeModal}
                disabled={isSubmitting}
                className="inline-flex items-center justify-center rounded-lg bg-white px-5 py-3 text-sm font-medium text-gray-700 ring-1 ring-inset ring-gray-300 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-gray-800 dark:text-gray-400 dark:ring-gray-700 dark:hover:bg-white/[0.03]"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center justify-center rounded-lg bg-brand-500 px-5 py-3 text-sm font-medium text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting ? "Enregistrement..." : editingPromotion ? "Mettre a jour" : "Creer"}
              </button>
            </div>
          </form>
        </div>
      </Modal>
    </>
  );
}
