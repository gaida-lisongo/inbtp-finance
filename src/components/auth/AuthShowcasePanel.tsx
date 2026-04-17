import Link from "next/link";

import AssetImage from "@/components/common/AssetImage";
import { getAuthLandingMetrics, type AuthLandingMetrics } from "@/lib/utils/supabase/auth-landing";

const formatCount = (value: number) => new Intl.NumberFormat("fr-FR").format(value);

const metricsCards = (metrics: AuthLandingMetrics) => [
  {
    label: "Programmes",
    value: formatCount(metrics.counts.programmes),
    accent: "from-[#f7a73d] to-[#f4c37d]",
  },
  {
    label: "Unites d'enseignement",
    value: formatCount(metrics.counts.unites),
    accent: "from-[#058AC5] to-[#63c5e8]",
  },
  {
    label: "Elements constitutifs",
    value: formatCount(metrics.counts.elementsConstitutifs),
    accent: "from-[#5ECB44] to-[#9fe08e]",
  },
];

export default async function AuthShowcasePanel() {
  const metrics = await getAuthLandingMetrics();

  return (
    <div className="relative hidden min-h-screen overflow-hidden lg:flex lg:w-1/2">
      <div
        className="absolute -inset-6 bg-cover bg-center blur-xl scale-110"
        style={{ backgroundImage: "url('/images/inbtp/campus.png')" }}
      />
      <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(39,40,38,0.78),rgba(39,40,38,0.52),rgba(5,138,197,0.34))]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(247,167,61,0.20),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(94,203,68,0.14),transparent_28%)]" />

      <div className="relative z-10 flex w-full flex-col justify-between px-10 py-10 xl:px-14 xl:py-12">
        <div className="animate-fade-up">
          <div className="mb-10 flex items-center gap-4">
            <div className="rounded-3xl border border-white/20 bg-white/92 p-3 shadow-[0_18px_40px_rgba(39,40,38,0.18)]">
              <AssetImage src="elmes" alt="ELMESACAD" width={48} height={48} className="h-12 w-12 rounded-2xl object-contain" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.32em] text-white/78">ELMESACAD</p>
              <h2 className="text-2xl font-semibold text-white">Espace numerique de travail</h2>
            </div>
          </div>

          <div className="max-w-2xl">
            <div className="inline-flex items-center rounded-full border border-white/20 bg-[#272826]/72 px-4 py-2 text-xs font-medium text-white/88">
              Collaboration entre etudiants, enseignants et section
            </div>
            <h1 className="mt-6 max-w-xl text-4xl font-semibold leading-tight text-white xl:text-5xl">
              Pilotez les traitements administratifs et la vie academique depuis un seul espace.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-white/88">
              ELMESACAD centralise les operations academiques, les validations, les ressources et le suivi des transactions avec une experience plus lisible et plus rapide.
            </p>
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            <div className="rounded-[24px] border border-white/18 bg-white/92 p-4 shadow-[0_18px_40px_rgba(39,40,38,0.14)]">
              <p className="text-xs uppercase tracking-[0.24em] text-gray-500">Workflow</p>
              <p className="mt-3 text-lg font-semibold text-[#272826]">Connexion guidee</p>
              <p className="mt-2 text-sm leading-6 text-gray-600">Entree claire selon votre profil etudiant, enseignant ou administration.</p>
            </div>
            <div className="rounded-[24px] border border-white/18 bg-white/92 p-4 shadow-[0_18px_40px_rgba(39,40,38,0.14)]">
              <p className="text-xs uppercase tracking-[0.24em] text-gray-500">Pilotage</p>
              <p className="mt-3 text-lg font-semibold text-[#272826]">Vision academique</p>
              <p className="mt-2 text-sm leading-6 text-gray-600">Lecture immediate des programmes, unites et elements constitutifs de l'annee active.</p>
            </div>
            <div className="rounded-[24px] border border-white/18 bg-white/92 p-4 shadow-[0_18px_40px_rgba(39,40,38,0.14)]">
              <p className="text-xs uppercase tracking-[0.24em] text-gray-500">Experience</p>
              <p className="mt-3 text-lg font-semibold text-[#272826]">Acces plus lisible</p>
              <p className="mt-2 text-sm leading-6 text-gray-600">Une entree plus claire pour lancer rapidement le bon workflow administratif.</p>
            </div>
          </div>
        </div>

        <div className="animate-fade-up rounded-[30px] border border-white/18 bg-white/94 p-6 shadow-[0_22px_55px_rgba(39,40,38,0.18)] [animation-delay:120ms]">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.32em] text-gray-500">Annee academique courante</p>
              <h3 className="mt-2 text-2xl font-semibold text-[#272826]">
                {metrics.activeAnnee?.designation ?? "Configuration en attente"}
              </h3>
              <p className="mt-2 text-sm text-gray-600">
                {metrics.activeAnnee?.rangeLabel ?? "Definissez une annee active pour afficher les metriques."}
              </p>
            </div>
            <Link
              href="/"
              className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-4 py-2 text-sm font-medium text-[#272826] transition hover:bg-gray-100"
            >
              Decouvrir l'espace
            </Link>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {metricsCards(metrics).map((item) => (
              <div key={item.label} className="rounded-[24px] border border-gray-200 bg-[#f7f7f5] p-4">
                <div className={`h-1.5 w-16 rounded-full bg-gradient-to-r ${item.accent}`} />
                <p className="mt-4 text-xs font-semibold uppercase tracking-[0.24em] text-gray-500">{item.label}</p>
                <p className="mt-3 text-3xl font-semibold text-[#272826]">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
