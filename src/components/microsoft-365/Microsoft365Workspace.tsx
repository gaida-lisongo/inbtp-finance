import { getMicrosoft365Overview } from "@/lib/utils/microsoft-graph";

const formatDate = (value: string | null) => {
  if (!value) {
    return "N/A";
  }

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
};

export default async function Microsoft365Workspace() {
  try {
    const overview = await getMicrosoft365Overview();

    return (
      <div className="col-span-12 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] lg:p-6">
        <div className="mb-6 flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">Microsoft 365</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Profil, boite mail, calendrier et OneDrive du compte connecte.
            </p>
          </div>
          <div className="rounded-xl bg-brand-50 px-3 py-2 text-sm text-brand-700 dark:bg-brand-500/10 dark:text-brand-300">
            {overview.profile.displayName || overview.profile.userPrincipalName || "Compte Microsoft 365"}
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-4">
          <section className="rounded-2xl border border-gray-200 p-4 dark:border-gray-800">
            <h4 className="mb-3 text-sm font-semibold text-gray-800 dark:text-white/90">Profil</h4>
            <div className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
              <p>{overview.profile.displayName || "Nom indisponible"}</p>
              <p>{overview.profile.mail || overview.profile.userPrincipalName || "Email indisponible"}</p>
              <p>{overview.profile.jobTitle || "Poste non renseigne"}</p>
            </div>
          </section>

          <section className="rounded-2xl border border-gray-200 p-4 dark:border-gray-800">
            <h4 className="mb-3 text-sm font-semibold text-gray-800 dark:text-white/90">Derniers emails</h4>
            <div className="space-y-3">
              {overview.messages.length > 0 ? (
                overview.messages.map((message) => (
                  <div key={message.id} className="rounded-xl bg-gray-50 p-3 dark:bg-white/[0.03]">
                    <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                      {message.subject || "Sans objet"}
                    </p>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{message.from || "Expediteur inconnu"}</p>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{formatDate(message.receivedDateTime)}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400">Aucun email recent.</p>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-gray-200 p-4 dark:border-gray-800">
            <h4 className="mb-3 text-sm font-semibold text-gray-800 dark:text-white/90">Agenda</h4>
            <div className="space-y-3">
              {overview.events.length > 0 ? (
                overview.events.map((event) => (
                  <div key={event.id} className="rounded-xl bg-gray-50 p-3 dark:bg-white/[0.03]">
                    <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                      {event.subject || "Evenement sans titre"}
                    </p>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      {formatDate(event.start)} - {formatDate(event.end)}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400">Aucun evenement recent.</p>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-gray-200 p-4 dark:border-gray-800">
            <h4 className="mb-3 text-sm font-semibold text-gray-800 dark:text-white/90">OneDrive</h4>
            <div className="space-y-3">
              {overview.files.length > 0 ? (
                overview.files.map((file) => (
                  <a
                    key={file.id}
                    href={file.webUrl || "#"}
                    target="_blank"
                    rel="noreferrer"
                    className="block rounded-xl bg-gray-50 p-3 transition hover:bg-gray-100 dark:bg-white/[0.03] dark:hover:bg-white/[0.05]"
                  >
                    <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                      {file.name || "Fichier sans nom"}
                    </p>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      {formatDate(file.lastModifiedDateTime)}
                    </p>
                  </a>
                ))
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400">Aucun fichier recent.</p>
              )}
            </div>
          </section>
        </div>
      </div>
    );
  } catch (error) {
    return (
      <div className="col-span-12 rounded-2xl border border-error-200 bg-error-50 p-5 text-sm text-error-700 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-300 lg:p-6">
        {error instanceof Error
          ? error.message
          : "Impossible de charger les donnees Microsoft 365 pour ce compte."}
      </div>
    );
  }
}
