import Link from "next/link";

type JuryPromotionCardProps = {
  jury: {
    id: string;
    designation: string | null;
    annee: {
      designation: string | null;
    } | null;
    isActivate: boolean | null;
    president: { prenom: string | null; post_nom: string | null; nom: string | null } | null;
    secretaire: { prenom: string | null; post_nom: string | null; nom: string | null } | null;
  };
  programmes: Array<{
    id: string;
    designation: string | null;
    description: string | null;
    annee_id: string | null;
  }>;
};

export default function JuryPromotionCard({ jury, programmes }: JuryPromotionCardProps) {

  const presidentLabel = jury.president
    ? [jury.president.prenom, jury.president.post_nom, jury.president.nom]
        .filter(Boolean)
        .join(" ")
    : "Non renseigné";

  const secretaireLabel = jury.secretaire
    ? [jury.secretaire.prenom, jury.secretaire.post_nom, jury.secretaire.nom]
        .filter(Boolean)
        .join(" ")
    : "Non renseigné";

  return (
    <article className="overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm shadow-gray-100 dark:border-gray-800 dark:bg-gray-900">
      <div className="relative h-48 overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: "url(/images/cards/card-01.jpg)",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/40 to-transparent" />
        <div className="relative flex h-full flex-col justify-between p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.4em] text-white/70">
                Jury
              </p>
              <h2 className="mt-1 text-2xl font-bold">
                {jury.designation ?? "Jury sans désignation"}
              </h2>
            </div>
            <div className="text-right text-sm">
              <p className="font-semibold">
                {jury.isActivate ? "Actif" : "Inactif"}
              </p>
              <p className="text-white/80">
                {jury.annee?.designation ?? "Année inconnue"}
              </p>
            </div>
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-3 px-6 py-5">
        <div className="text-sm font-semibold text-gray-900 dark:text-white">
          {presidentLabel !== "Non renseigné" && (
            <p className="leading-normal">
              <span className="text-xs uppercase tracking-[0.3em] text-gray-400">
                Président
              </span>
              <br />
              <span className="text-base font-bold">{presidentLabel}</span>
            </p>
          )}
          <div className="mt-2 text-xs uppercase tracking-[0.3em] text-gray-500">
            Secrétaire
          </div>
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            {secretaireLabel}
          </p>
        </div>
        <div className="mt-4 flex items-center justify-between gap-3">
          <span className="text-xs font-semibold uppercase tracking-[0.3em] text-gray-400">
            {programmes.length} promotion{programmes.length > 1 ? "s" : ""}
          </span>
          <Link
            href={`/jury/${jury.id}`}
            className="rounded-full bg-red-600 px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-white transition hover:bg-red-500"
          >
            Voir les promotions
          </Link>
        </div>
      </div>
    </article>
  );
}
