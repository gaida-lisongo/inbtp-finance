/* eslint-disable @next/next/no-img-element */

import { updateProfileAction } from "@/app/(admin)/(others-pages)/profile/actions";
import type { AgentProfile } from "@/lib/utils/supabase/agents";

type ProfileEditorProps = {
  agent: AgentProfile;
  status?: string;
  message?: string;
};

const fieldClassName =
  "h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800";

const textareaClassName =
  "w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800";

export default function ProfileEditor({ agent, status, message }: ProfileEditorProps) {
  return (
    <form action={updateProfileAction} className="space-y-6">
      {status === "success" ? (
        <div className="rounded-xl border border-success-200 bg-success-50 px-4 py-3 text-sm text-success-700 dark:border-success-500/30 dark:bg-success-500/10 dark:text-success-400">
          Profil mis a jour avec succes.
        </div>
      ) : null}

      {status === "error" ? (
        <div className="rounded-xl border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-700 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-400">
          {message || "La mise a jour du profil a echoue."}
        </div>
      ) : null}

      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] lg:p-6">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-col items-center gap-5 xl:flex-row">
            {agent.photoUrl ? (
              <img
                src={agent.photoUrl}
                alt={agent.displayName}
                className="h-24 w-24 rounded-full border border-gray-200 object-cover dark:border-gray-800"
              />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-full border border-gray-200 bg-brand-50 text-2xl font-semibold text-brand-600 dark:border-gray-800 dark:bg-brand-500/10 dark:text-brand-400">
                {agent.displayName.slice(0, 2).toUpperCase()}
              </div>
            )}

            <div>
              <h3 className="text-xl font-semibold text-gray-800 dark:text-white/90">{agent.displayName}</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{agent.email}</p>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Le compte courant est synchronise avec la table <code>agents</code>.
              </p>
            </div>
          </div>

          <div className="w-full xl:w-auto">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-400" htmlFor="photo">
              Photo de profil
            </label>
            <input
              id="photo"
              name="photo"
              type="file"
              accept="image/*"
              className="mt-2 block w-full text-sm text-gray-500 file:mr-4 file:rounded-lg file:border-0 file:bg-brand-500 file:px-4 file:py-2.5 file:font-medium file:text-white hover:file:bg-brand-600 dark:text-gray-400 xl:w-[320px]"
            />
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] lg:p-6">
          <h4 className="mb-5 text-lg font-semibold text-gray-800 dark:text-white/90">Informations personnelles</h4>
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400" htmlFor="prenom">
                Prenom
              </label>
              <input id="prenom" name="prenom" defaultValue={agent.prenom ?? ""} className={fieldClassName} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400" htmlFor="post_nom">
                Post nom
              </label>
              <input id="post_nom" name="post_nom" defaultValue={agent.post_nom ?? ""} className={fieldClassName} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400" htmlFor="nom">
                Nom
              </label>
              <input id="nom" name="nom" defaultValue={agent.nom ?? ""} className={fieldClassName} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400" htmlFor="telephone">
                Telephone
              </label>
              <input
                id="telephone"
                name="telephone"
                defaultValue={agent.telephone ?? ""}
                className={fieldClassName}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400" htmlFor="grade">
                Grade
              </label>
              <input id="grade" name="grade" defaultValue={agent.grade ?? ""} className={fieldClassName} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400" htmlFor="role">
                Role
              </label>
              <input id="role" name="role" defaultValue={agent.role ?? ""} className={fieldClassName} />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400" htmlFor="bio">
                Bio
              </label>
              <textarea
                id="bio"
                name="bio"
                rows={5}
                defaultValue={agent.bio ?? ""}
                className={textareaClassName}
              />
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] lg:p-6">
          <h4 className="mb-5 text-lg font-semibold text-gray-800 dark:text-white/90">Coordonnees et reseaux</h4>
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400" htmlFor="pays">
                Pays
              </label>
              <input id="pays" name="pays" defaultValue={agent.pays ?? ""} className={fieldClassName} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400" htmlFor="ville">
                Ville
              </label>
              <input id="ville" name="ville" defaultValue={agent.ville ?? ""} className={fieldClassName} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400" htmlFor="commune">
                Commune
              </label>
              <input id="commune" name="commune" defaultValue={agent.commune ?? ""} className={fieldClassName} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400" htmlFor="entra_id">
                Entra ID
              </label>
              <input id="entra_id" name="entra_id" defaultValue={agent.entra_id ?? ""} className={fieldClassName} />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400" htmlFor="adresse">
                Adresse
              </label>
              <input id="adresse" name="adresse" defaultValue={agent.adresse ?? ""} className={fieldClassName} />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400" htmlFor="facebook">
                Facebook
              </label>
              <input id="facebook" name="facebook" defaultValue={agent.facebook ?? ""} className={fieldClassName} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400" htmlFor="x">
                X
              </label>
              <input id="x" name="x" defaultValue={agent.x ?? ""} className={fieldClassName} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400" htmlFor="twitter">
                Twitter
              </label>
              <input id="twitter" name="twitter" defaultValue={agent.twitter ?? ""} className={fieldClassName} />
            </div>
          </div>
        </section>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          className="inline-flex items-center justify-center rounded-lg bg-brand-500 px-5 py-3.5 text-sm font-medium text-white shadow-theme-xs transition hover:bg-brand-600"
        >
          Enregistrer les modifications
        </button>
      </div>
    </form>
  );
}
