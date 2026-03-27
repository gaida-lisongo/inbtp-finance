"use client";

import Link from "next/link";

import ComponentCard from "@/components/common/ComponentCard";
import FormSubmitButton from "@/components/common/FormSubmitButton";
import type { CoursRecord, EnseignantOption, MatiereRecord } from "@/lib/utils/supabase/enseignement";

type MatiereCoursPanelProps = {
  anneeId: string;
  promotionId: string;
  uniteId: string;
  matiere: MatiereRecord;
  cours: CoursRecord | null;
  enseignants: EnseignantOption[];
  saveCoursAction: (formData: FormData) => Promise<void>;
};

const buildEnseignantLabel = (enseignant: EnseignantOption) => {
  const fullName = [enseignant.prenom, enseignant.post_nom, enseignant.nom].filter(Boolean).join(" ").trim();
  return fullName.length > 0 ? fullName : enseignant.email || "Agent sans nom";
};

export default function MatiereCoursPanel({
  anneeId,
  promotionId,
  uniteId,
  matiere,
  cours,
  enseignants,
  saveCoursAction,
}: MatiereCoursPanelProps) {
  const selectedEnseignantId = cours?.titulaire_id ?? "";
  const backHref = `/ce/unite?annee=${anneeId}&promotion=${promotionId}&unite=${uniteId}`;
  const selectedEnseignant = enseignants.find((enseignant) => enseignant.id === selectedEnseignantId) ?? null;

  return (
    <ComponentCard
      title={`Cours associe - ${matiere.designation || "Matiere"}`}
      desc="Configurez ici l'animateur et le nom de l'equipe Teams associee a cette matiere."
    >
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-gray-50 p-4 dark:bg-white/[0.03]">
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Matiere</p>
            <p className="mt-2 text-lg font-semibold text-gray-800 dark:text-white/90">
              {matiere.designation || "Matiere"}
            </p>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Credits: {matiere.credits ?? 0}
            </p>
          </div>

          <Link
            href={backHref}
            className="inline-flex items-center justify-center rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]"
          >
            Retour aux matieres
          </Link>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl bg-gray-50 p-4 dark:bg-white/[0.03]">
            <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Statut</p>
            <p className="mt-2 text-sm font-medium text-gray-800 dark:text-white/90">
              {cours ? "Cours deja configure" : "Aucun cours rattache"}
            </p>
          </div>
          <div className="rounded-2xl bg-gray-50 p-4 dark:bg-white/[0.03]">
            <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Animateur actuel</p>
            <p className="mt-2 text-sm font-medium text-gray-800 dark:text-white/90">
              {selectedEnseignant ? buildEnseignantLabel(selectedEnseignant) : "Non defini"}
            </p>
          </div>
          <div className="rounded-2xl bg-gray-50 p-4 dark:bg-white/[0.03]">
            <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Reference Teams</p>
            <p className="mt-2 text-sm font-medium text-gray-800 dark:text-white/90">{cours?.entra_id || "Aucune reference creee"}</p>
          </div>
        </div>

        <form action={saveCoursAction} className="grid gap-5 lg:grid-cols-2">
          <input type="hidden" name="annee" value={anneeId} />
          <input type="hidden" name="promotion" value={promotionId} />
          <input type="hidden" name="unite" value={uniteId} />
          <input type="hidden" name="matiere" value={matiere.id} />
          <input type="hidden" name="matiere_id" value={matiere.id} />

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400" htmlFor="cours-titulaire">
              Enseignant
            </label>
            <select
              id="cours-titulaire"
              name="titulaire_id"
              defaultValue={selectedEnseignantId}
              className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              required
            >
              <option value="">Selectionnez un enseignant</option>
              {enseignants.map((enseignant) => (
                <option key={enseignant.id} value={enseignant.id}>
                  {buildEnseignantLabel(enseignant)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400" htmlFor="cours-slug">
              Nom de l&apos;equipe Teams
            </label>
            <input
              id="cours-slug"
              name="slug"
              defaultValue={cours?.slug ?? ""}
              className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              placeholder="Ex. L1 Info - Algorithmique - Groupe A"
              required
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Ce champ sert ici de nom cible pour l&apos;equipe Teams a creer.
            </p>
          </div>

          <div className="rounded-2xl border border-dashed border-gray-300 px-4 py-4 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400 lg:col-span-2">
            L&apos;identifiant `entra_id` reste affiche en lecture seule pour l&apos;instant. Il pourra etre renseigne ensuite au moment de la creation effective de l&apos;equipe dans le tenant Microsoft 365.
          </div>

          <div className="flex justify-end lg:col-span-2">
            <FormSubmitButton
              idleLabel={cours ? "Mettre a jour le cours" : "Enregistrer le cours"}
              pendingLabel={cours ? "Mise a jour..." : "Enregistrement..."}
            />
          </div>
        </form>
      </div>
    </ComponentCard>
  );
}
