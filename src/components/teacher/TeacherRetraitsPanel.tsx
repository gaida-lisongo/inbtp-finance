"use client";

import { useMemo, useState } from "react";

import {
  createTeacherRetraitActivityAction,
  deleteTeacherRetraitActivityAction,
  getTeacherRetraitActivitiesAction,
  getTeacherRetraitsActivityAction,
  updateTeacherRetraitActivityAction,
} from "@/app/actions/teacher-retraits";
import DataTable from "@/components/common/DataTable";
import Label from "@/components/form/Label";
import { Modal } from "@/components/ui/modal";
import type {
  TeacherRetraitActivityOption,
  TeacherRetraitActivityRecord,
} from "@/lib/utils/supabase/teacher-retraits";

type TeacherRetraitsPanelProps = {
  initialRetraits: TeacherRetraitActivityRecord[];
  initialActivities: TeacherRetraitActivityOption[];
};

type RetraitFormState = {
  activity_id: string;
  montant: string;
  observation: string;
};

const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));

const formatAmount = (value: number | null) =>
  typeof value === "number" && Number.isFinite(value)
    ? new Intl.NumberFormat("fr-FR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(value)
    : "0,00";

const buildActivityLabel = (activity: TeacherRetraitActivityOption) => {
  const designation = activity.designation?.trim() || "Activité sans désignation";
  const category = activity.categorie?.trim() ? ` · ${activity.categorie}` : "";
  const slug = activity.cours_slug?.trim() ? ` · ${activity.cours_slug}` : "";
  return `${designation}${category}${slug}`;
};

const initialForm: RetraitFormState = {
  activity_id: "",
  montant: "",
  observation: "",
};

export default function TeacherRetraitsPanel({
  initialRetraits,
  initialActivities,
}: TeacherRetraitsPanelProps) {
  const [retraits, setRetraits] = useState<TeacherRetraitActivityRecord[]>(initialRetraits);
  const [activities, setActivities] = useState<TeacherRetraitActivityOption[]>(initialActivities);
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRetrait, setEditingRetrait] = useState<TeacherRetraitActivityRecord | null>(null);
  const [activitySearch, setActivitySearch] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [form, setForm] = useState<RetraitFormState>(initialForm);

  const filteredActivities = useMemo(() => {
    const query = activitySearch.trim().toLowerCase();

    if (!query) {
      return activities;
    }

    return activities.filter((activity) => buildActivityLabel(activity).toLowerCase().includes(query));
  }, [activitySearch, activities]);

  const selectedActivity = useMemo(
    () => activities.find((activity) => activity.id === form.activity_id) ?? null,
    [activities, form.activity_id],
  );

  const reloadData = async () => {
    setIsLoading(true);

    try {
      const [nextRetraits, nextActivities] = await Promise.all([
        getTeacherRetraitsActivityAction(),
        getTeacherRetraitActivitiesAction(),
      ]);
      setRetraits(nextRetraits);
      setActivities(nextActivities);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingRetrait(null);
    setErrorMessage(null);
    setForm(initialForm);
    setActivitySearch("");
    setIsModalOpen(true);
  };

  const handleEdit = (retrait: TeacherRetraitActivityRecord) => {
    setEditingRetrait(retrait);
    setErrorMessage(null);
    setForm({
      activity_id: retrait.activity_id ?? "",
      montant: retrait.montant === null ? "" : String(retrait.montant),
      observation: retrait.observation ?? "",
    });
    setActivitySearch(retrait.activity ? buildActivityLabel(retrait.activity) : "");
    setIsModalOpen(true);
  };

  const handleDelete = async (retrait: TeacherRetraitActivityRecord) => {
    if (!window.confirm("Supprimer ce retrait ?")) {
      return;
    }

    setErrorMessage(null);

    try {
      await deleteTeacherRetraitActivityAction(retrait.id);
      await reloadData();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Impossible de supprimer ce retrait.");
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);

    const amount = Number(form.montant.replace(",", "."));
    if (!Number.isFinite(amount)) {
      setErrorMessage("Le montant est invalide.");
      return;
    }

    if (!form.activity_id) {
      setErrorMessage("Veuillez sélectionner une activité.");
      return;
    }

    const payload = {
      activity_id: form.activity_id,
      montant: amount,
      observation: form.observation,
    };

    try {
      if (editingRetrait) {
        await updateTeacherRetraitActivityAction(editingRetrait.id, payload);
      } else {
        await createTeacherRetraitActivityAction(payload);
      }

      setIsModalOpen(false);
      setEditingRetrait(null);
      setForm(initialForm);
      await reloadData();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Impossible d'enregistrer le retrait.");
    }
  };

  const columns = [
    {
      key: "created_at",
      label: "Date",
      render: (item: TeacherRetraitActivityRecord) => formatDateTime(item.created_at),
    },
    {
      key: "activity",
      label: "Activité",
      render: (item: TeacherRetraitActivityRecord) =>
        item.activity ? buildActivityLabel(item.activity) : "Activité introuvable",
    },
    {
      key: "montant",
      label: "Montant",
      render: (item: TeacherRetraitActivityRecord) => `${formatAmount(item.montant)} USD`,
    },
    {
      key: "reference",
      label: "Référence",
      render: (item: TeacherRetraitActivityRecord) => item.reference || "—",
    },
    {
      key: "status",
      label: "Statut",
      render: (item: TeacherRetraitActivityRecord) => item.status || "—",
    },
    {
      key: "observation",
      label: "Observation",
      render: (item: TeacherRetraitActivityRecord) => item.observation || "—",
    },
  ];

  return (
    <div className="space-y-5">
      {isLoading ? (
        <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-500 dark:border-gray-800 dark:bg-white/[0.03] dark:text-gray-400">
          Actualisation des retraits...
        </div>
      ) : null}

      {errorMessage ? (
        <div className="rounded-2xl border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-700 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-300">
          {errorMessage}
        </div>
      ) : null}

      <DataTable
        data={retraits}
        columns={columns}
        searchPlaceholder="Rechercher un retrait..."
        onAdd={handleAdd}
        onEdit={handleEdit}
        onDelete={handleDelete}
        addButtonLabel="Nouveau retrait"
      />

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} size="lg">
        <div className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white/90">
            {editingRetrait ? "Modifier le retrait" : "Créer un retrait"}
          </h2>

          <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
            <div>
              <Label>Rechercher une activité</Label>
              <input
                type="text"
                value={activitySearch}
                onChange={(event) => setActivitySearch(event.target.value)}
                placeholder="Nom activité, catégorie, canal..."
                className="mt-1.5 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm text-gray-800 outline-hidden focus:border-brand-400 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
              />
            </div>

            <div>
              <Label>Activité</Label>
              <select
                value={form.activity_id}
                onChange={(event) => setForm((current) => ({ ...current, activity_id: event.target.value }))}
                className="mt-1.5 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm text-gray-800 outline-hidden focus:border-brand-400 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                required
              >
                <option value="">Sélectionner une activité</option>
                {filteredActivities.map((activity) => (
                  <option key={activity.id} value={activity.id}>
                    {buildActivityLabel(activity)}
                  </option>
                ))}
              </select>
              {selectedActivity ? (
                <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                  Montant activité: {formatAmount(selectedActivity.montant)} USD
                </p>
              ) : null}
            </div>

            <div>
              <Label>Montant du retrait</Label>
              <input
                type="text"
                value={form.montant}
                onChange={(event) => setForm((current) => ({ ...current, montant: event.target.value }))}
                placeholder="0.00"
                className="mt-1.5 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm text-gray-800 outline-hidden focus:border-brand-400 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                required
              />
              <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                Le statut est automatiquement défini à pending. La référence sera ajoutée lors de l&apos;approbation.
              </p>
            </div>

            <div>
              <Label>Observation</Label>
              <textarea
                value={form.observation}
                onChange={(event) => setForm((current) => ({ ...current, observation: event.target.value }))}
                rows={4}
                placeholder="Commentaire facultatif..."
                className="mt-1.5 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm text-gray-800 outline-hidden focus:border-brand-400 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:border-gray-400 dark:border-gray-700 dark:text-gray-300"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
              >
                {editingRetrait ? "Mettre à jour" : "Créer"}
              </button>
            </div>
          </form>
        </div>
      </Modal>
    </div>
  );
}
