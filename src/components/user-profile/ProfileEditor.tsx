/* eslint-disable @next/next/no-img-element */
"use client";
import { UserType, useUserStore } from "@/store/useUserStore";
import { useEffect, useState } from "react";

type ProfileEditorProps = {
  status?: string;
  message?: string;
};

const fieldClassName =
  "h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800";

export default function ProfileEditor({ status, message }: ProfileEditorProps) {
  // Récupération des états et actions du store
  const { profile, syncPhoto, syncProfile, isLoading } = useUserStore();
  
  // État local pour gérer les retours visuels (succès/erreur)
  const [localStatus, setLocalStatus] = useState<{ type: string; msg: string } | null>(null);

  // Gestion de la mise à jour des informations textuelles
  const handleUpdateProfile = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    // Construction du payload à partir du formulaire
    const payload: Partial<UserType> = {
      prenom: formData.get("prenom") as string,
      post_nom: formData.get("post_nom") as string,
      nom: formData.get("nom") as string,
      telephone: formData.get("telephone") as string,
      pays: formData.get("pays") as string,
      ville: formData.get("ville") as string,
      commune: formData.get("commune") as string,
      adresse: formData.get("adresse") as string,
      facebook: formData.get("facebook") as string,
      twitter: formData.get("twitter") as string,
    };

    try {
      await syncProfile(payload);
      setLocalStatus({ type: "success", msg: "Profil mis à jour avec succès." });
    } catch (error) {
      setLocalStatus({ type: "error", msg: "La mise à jour a échoué." });
    }
  };

  // Gestion de l'upload de photo
  const handlePhotoUpdate = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const formData = new FormData();
      formData.append("photo", file);
      try {
        await syncPhoto(formData);
        setLocalStatus({ type: "success", msg: "Photo mise à jour." });
      } catch (error) {
        setLocalStatus({ type: "error", msg: "Échec de l'envoi de la photo." });
      }
    }
  };

  if (!profile) return <p>Chargement du profil...</p>;

  return (
    <form onSubmit={handleUpdateProfile} className="space-y-6">
      {/* Affichage des messages de statut */}
      {(localStatus || status) && (
        <div className={`rounded-xl border px-4 py-3 text-sm ${
          (localStatus?.type === "success" || status === "success") 
            ? "border-success-200 bg-success-50 text-success-700" 
            : "border-error-200 bg-error-50 text-error-700"
        }`}>
          {localStatus?.msg || message}
        </div>
      )}

      {/* Section Header & Photo */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] lg:p-6">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-col items-center gap-5 xl:flex-row">
            <div className="relative h-24 w-24">
              {profile.photo ? (
                <img
                  src={profile.photo}
                  alt={profile.nom || "User"}
                  className="h-24 w-24 rounded-full border border-gray-200 object-cover dark:border-gray-800"
                />
              ) : (
                <div className="flex h-24 w-24 items-center justify-center rounded-full border border-gray-200 bg-brand-50 text-2xl font-semibold text-brand-600 dark:border-gray-800 dark:bg-brand-500/10 dark:text-brand-400">
                  {profile.nom?.slice(0, 2).toUpperCase() || "UN"}
                </div>
              )}
            </div>

            <div>
              <h3 className="text-xl font-semibold text-gray-800 dark:text-white/90">
                {profile.prenom} {profile.nom}
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{profile.email}</p>
            </div>
          </div>

          <div className="w-full xl:w-auto">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-400" htmlFor="photo">
              Changer la photo
            </label>
            <input
              id="photo"
              type="file"
              onChange={handlePhotoUpdate}
              className="mt-2 block w-full text-sm text-gray-500 file:mr-4 file:rounded-lg file:border-0 file:bg-brand-500 file:px-4 file:py-2.5 file:font-medium file:text-white hover:file:bg-brand-600 xl:w-[320px]"
            />
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        {/* Informations Personnelles */}
        <section className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] lg:p-6">
          <h4 className="mb-5 text-lg font-semibold text-gray-800 dark:text-white/90">Informations personnelles</h4>
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Prénom</label>
              <input name="prenom" defaultValue={profile.prenom ?? ""} className={fieldClassName} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Post-nom</label>
              <input name="post_nom" defaultValue={profile.post_nom ?? ""} className={fieldClassName} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Nom</label>
              <input name="nom" defaultValue={profile.nom ?? ""} className={fieldClassName} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Téléphone</label>
              <input name="telephone" defaultValue={profile.telephone ?? ""} className={fieldClassName} />
            </div>
          </div>
        </section>

        {/* Coordonnées */}
        <section className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] lg:p-6">
          <h4 className="mb-5 text-lg font-semibold text-gray-800 dark:text-white/90">Coordonnées</h4>
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Pays</label>
              <input name="pays" defaultValue={profile.pays ?? ""} className={fieldClassName} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Ville</label>
              <input name="ville" defaultValue={profile.ville ?? ""} className={fieldClassName} />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Adresse</label>
              <input name="adresse" defaultValue={profile.adresse ?? ""} className={fieldClassName} />
            </div>
          </div>
        </section>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isLoading}
          className="inline-flex items-center justify-center rounded-lg bg-brand-500 px-5 py-3.5 text-sm font-medium text-white shadow-theme-xs transition hover:bg-brand-600 disabled:opacity-50"
        >
          {isLoading ? "Enregistrement..." : "Enregistrer les modifications"}
        </button>
      </div>
    </form>
  );
}