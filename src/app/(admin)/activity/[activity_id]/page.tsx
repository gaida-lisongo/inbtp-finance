import { redirect } from "next/navigation";
import type { Metadata } from "next";

import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { getAuthenticatedUser } from "@/lib/utils/supabase/session";
import { getTeacherActivityCommandesPageData } from "@/lib/utils/supabase/teacher-teaching";

import { updateActivityCommandeAction } from "./actions";

type ActivityCommandesPageProps = {
  params: Promise<{
    activity_id: string;
  }>;
  searchParams: Promise<{
    status?: string;
    message?: string;
  }>;
};

export const metadata: Metadata = {
  title: "Activity | Dashboard Enseignant",
  description: "Edition des commandes d'une activite enseignant.",
};

const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));

const getMessage = (status?: string, message?: string) => {
  if (status === "success" && message === "commande_updated") {
    return "La commande a ete mise a jour.";
  }

  if (status !== "error") {
    return null;
  }

  switch (message) {
    case "note_invalid":
      return "La note saisie est invalide.";
    case "note_not_found":
      return "Commande introuvable.";
    case "teacher_access_denied":
      return "Vous n'avez pas acces a cette activite.";
    default:
      return "Impossible de mettre a jour la commande.";
  }
};

export default async function ActivityCommandesPage({ params, searchParams }: ActivityCommandesPageProps) {
  const [{ activity_id: activityId }, user, query] = await Promise.all([params, getAuthenticatedUser(), searchParams]);

  if (!user) {
    redirect("/signin");
  }

  if (user.activePersona !== "teacher") {
    redirect("/");
  }

  const data = await getTeacherActivityCommandesPageData(activityId);
  const feedback = getMessage(query.status, query.message);

  return (
    <div className="space-y-6">
      <PageBreadcrumb pageTitle={data.activity.designation || "Activite"} />

      <section className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl bg-gray-50 px-4 py-3 dark:bg-white/5">
            <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Matiere</div>
            <div className="mt-1 font-semibold text-gray-900 dark:text-white/90">{data.assignment.matiere.designation || "Matiere"}</div>
          </div>
          <div className="rounded-xl bg-gray-50 px-4 py-3 dark:bg-white/5">
            <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Categorie</div>
            <div className="mt-1 font-semibold text-gray-900 dark:text-white/90">{data.activity.category.toUpperCase()}</div>
          </div>
          <div className="rounded-xl bg-gray-50 px-4 py-3 dark:bg-white/5">
            <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Montant</div>
            <div className="mt-1 font-semibold text-gray-900 dark:text-white/90">{typeof data.activity.montant === "number" ? `${data.activity.montant} USD` : "-"}</div>
          </div>
          <div className="rounded-xl bg-gray-50 px-4 py-3 dark:bg-white/5">
            <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Date limite</div>
            <div className="mt-1 font-semibold text-gray-900 dark:text-white/90">{data.activity.date_limite || "-"}</div>
          </div>
        </div>

        {feedback ? (
          <div
            className={`mt-4 rounded-xl px-4 py-3 text-sm ${
              query.status === "success"
                ? "border border-success-200 bg-success-50 text-success-700 dark:border-success-500/30 dark:bg-success-500/10 dark:text-success-300"
                : "border border-error-200 bg-error-50 text-error-700 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-300"
            }`}
          >
            {feedback}
          </div>
        ) : null}
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
        <h2 className="text-base font-semibold text-gray-900 dark:text-white/90">Commandes de l&apos;activite</h2>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
          Modifiez la note, le statut ou le commentaire d&apos;une commande puis enregistrez.
        </p>

        {data.commandes.length === 0 ? (
          <div className="mt-5 rounded-xl border border-dashed border-gray-300 px-4 py-8 text-sm text-gray-600 dark:border-gray-700 dark:text-gray-300">
            Aucune commande disponible pour cette activite.
          </div>
        ) : (
          <div className="mt-5 space-y-3">
            {data.commandes.map((commande) => (
              <form
                key={commande.id}
                action={updateActivityCommandeAction}
                className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-white/[0.02]"
              >
                <input type="hidden" name="activity_id" value={data.activity.id} />
                <input type="hidden" name="note_id" value={commande.id} />

                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="text-sm font-semibold text-gray-900 dark:text-white/90">
                      {[commande.student?.prenom, commande.student?.post_nom, commande.student?.nom].filter(Boolean).join(" ") || "Etudiant"}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {commande.student?.email || "Email non renseigne"} • {formatDateTime(commande.created_at)}
                    </div>
                  </div>
                </div>

                <div className="mt-3 grid gap-3 md:grid-cols-3">
                  <label className="text-xs text-gray-600 dark:text-gray-300">
                    Note
                    <input
                      name="note"
                      type="number"
                      step="0.01"
                      defaultValue={typeof commande.note === "number" ? commande.note : ""}
                      className="mt-1 h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-800 outline-none focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                    />
                  </label>

                  <label className="text-xs text-gray-600 dark:text-gray-300">
                    Statut
                    <select
                      name="status"
                      defaultValue={commande.status || "pending"}
                      className="mt-1 h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-800 outline-none focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                    >
                      <option value="pending">pending</option>
                      <option value="success">success</option>
                    </select>
                  </label>

                  <label className="text-xs text-gray-600 dark:text-gray-300">
                    Commentaire
                    <input
                      name="comment"
                      type="text"
                      defaultValue={commande.comment || ""}
                      className="mt-1 h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-800 outline-none focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                    />
                  </label>
                </div>

                <div className="mt-3 flex justify-end">
                  <button
                    type="submit"
                    className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-600"
                  >
                    Enregistrer
                  </button>
                </div>
              </form>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
