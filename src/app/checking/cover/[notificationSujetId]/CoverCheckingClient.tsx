"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type CheckCoverResponse =
  | {
      valid: true;
      category: "cover";
      notificationSujetId: string;
      verifiedAt: string;
      verificationStatus: "validated" | "rejected" | "pending";
      notificationStatus: "delivered" | "in_review";
      student: {
        id: string;
        fullName: string;
        email: string | null;
        telephone: string | null;
      } | null;
      subject: {
        title: string;
        director: string;
        coDirector: string | null;
      };
      evaluation: {
        note: number | null;
        observations: string[];
      };
      jury: {
        directeur: number | null;
        lecteur1: number | null;
        lecteur2: number | null;
        bonus: number | null;
        total: number;
        hasScores: boolean;
      };
    }
  | {
      valid: false;
      error: string;
    };

type CoverCheckingClientProps = {
  notificationSujetId: string;
};

const verificationLabels: Record<"validated" | "rejected" | "pending", string> = {
  validated: "Projet valide",
  rejected: "Projet rejete",
  pending: "Projet en cours d'evaluation",
};

const verificationTone: Record<"validated" | "rejected" | "pending", string> = {
  validated: "border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200",
  rejected: "border-rose-300 bg-rose-50 text-rose-900 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200",
  pending: "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200",
};

const juryCards = [
  { key: "directeur", label: "Directeur" },
  { key: "lecteur1", label: "Lecteur 1" },
  { key: "lecteur2", label: "Lecteur 2" },
  { key: "bonus", label: "Bonus" },
] as const;

export default function CoverCheckingClient({ notificationSujetId }: CoverCheckingClientProps) {
  const [result, setResult] = useState<{
    data?: CheckCoverResponse;
    error?: string;
  } | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    fetch(`/api/checking/cover/${encodeURIComponent(notificationSujetId)}`, {
      method: "GET",
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        const json = (await response.json()) as CheckCoverResponse;
        if (!response.ok) {
          const message = json && "error" in json ? json.error : "Erreur de verification.";
          throw new Error(message);
        }

        return json;
      })
      .then((json) => setResult({ data: json }))
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        setResult({
          error: error instanceof Error ? error.message : "Erreur de verification.",
        });
      });

    return () => controller.abort();
  }, [notificationSujetId]);

  const content = (() => {
    if (!result) {
      return <p className="text-sm text-slate-600 dark:text-slate-300">Verification en cours...</p>;
    }

    if (result.error) {
      return <p className="text-sm text-rose-600 dark:text-rose-400">{result.error}</p>;
    }

    if (!result.data || !result.data.valid) {
      return <p className="text-sm text-rose-600 dark:text-rose-400">Document invalide.</p>;
    }

    const { student, subject, evaluation, jury, verificationStatus, notificationStatus } = result.data;

    return (
      <div className="space-y-6">
        <section
          className={`rounded-[28px] border p-6 shadow-sm transition-all duration-500 ${verificationTone[verificationStatus]} animate-in fade-in slide-in-from-top-2`}
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] opacity-70">Authentification documentaire</p>
              <h1 className="mt-2 text-2xl font-semibold">{verificationLabels[verificationStatus]}</h1>
              <p className="mt-2 text-sm opacity-80">
                Suivi: {notificationStatus === "delivered" ? "Document notifie" : "Instruction en cours"}
              </p>
            </div>
            <div className="rounded-2xl bg-white/60 px-4 py-3 text-right backdrop-blur dark:bg-black/10">
              <p className="text-xs uppercase tracking-wide opacity-70">Emission</p>
              <p className="mt-1 text-sm font-medium">{new Date(result.data.verifiedAt).toLocaleString("fr-FR")}</p>
            </div>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
          <article className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm transition-all duration-500 animate-in fade-in slide-in-from-left-2 dark:border-slate-800 dark:bg-white/[0.03]">
            <p className="text-xs uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">Projet de recherche</p>
            <h2 className="mt-3 text-2xl font-semibold text-slate-900 dark:text-white/90">{subject.title}</h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-900/60">
                <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Etudiant</p>
                <p className="mt-2 text-sm font-medium text-slate-900 dark:text-white/90">{student?.fullName ?? "Non renseigne"}</p>
                <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                  {[student?.email, student?.telephone].filter(Boolean).join(" • ") || "Coordonnees non renseignees"}
                </p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-900/60">
                <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Encadrement</p>
                <p className="mt-2 text-sm font-medium text-slate-900 dark:text-white/90">{subject.director}</p>
                <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">{subject.coDirector ?? "Sans co-directeur"}</p>
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Note du projet</p>
                <p className="mt-2 text-xl font-semibold text-slate-900 dark:text-white/90">
                  {evaluation.note === null ? "En attente" : `${evaluation.note}/25`}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Statut de verification</p>
                <p className="mt-2 text-xl font-semibold text-slate-900 dark:text-white/90">{verificationLabels[verificationStatus]}</p>
              </div>
            </div>

            <div className="mt-5 rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
              <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Observations</p>
              <pre className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700 dark:text-slate-200">
                {evaluation.observations.length > 0 ? evaluation.observations.join("\n") : "Aucune observation disponible pour le moment."}
              </pre>
            </div>
          </article>

          <article className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm transition-all duration-500 animate-in fade-in slide-in-from-right-2 dark:border-slate-800 dark:bg-white/[0.03]">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">Cotation du jury</p>
                <h3 className="mt-2 text-xl font-semibold text-slate-900 dark:text-white/90">Evaluation detaillee</h3>
              </div>
              <div className="rounded-2xl bg-brand-50 px-4 py-3 text-right dark:bg-brand-500/10">
                <p className="text-xs uppercase tracking-wide text-brand-700 dark:text-brand-300">Total jury</p>
                <p className="mt-1 text-2xl font-semibold text-brand-900 dark:text-white">{jury.total.toFixed(2)}</p>
              </div>
            </div>

            <div className="mt-5 grid gap-3">
              {juryCards.map((card, index) => (
                <div
                  key={card.key}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-4 transition-all duration-500 dark:border-slate-800 dark:bg-slate-900/60"
                  style={{ animationDelay: `${index * 90}ms` }}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">{card.label}</p>
                      <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-white/90">
                        {jury[card.key] === null ? "En attente" : jury[card.key]?.toFixed(2)}
                      </p>
                    </div>
                    <div className="h-3 w-24 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                      <div
                        className="h-full rounded-full bg-brand-500 transition-all duration-700"
                        style={{
                          width: `${Math.max(8, Math.min(100, ((jury[card.key] ?? 0) / Math.max(jury.total, 1)) * 100))}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-5 rounded-2xl border border-dashed border-slate-300 p-4 text-sm text-slate-600 dark:border-slate-700 dark:text-slate-300">
              {jury.hasScores
                ? "La cotation du jury est disponible et visible publiquement pour le suivi du document."
                : "La cotation du jury n'est pas encore disponible dans la fiche de recherche."}
            </div>
          </article>
        </section>
      </div>
    );
  })();

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.14),_transparent_35%),linear-gradient(180deg,_#f8fafc_0%,_#eef2ff_100%)] px-4 py-10 dark:bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.12),_transparent_30%),linear-gradient(180deg,_#020617_0%,_#0f172a_100%)]">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-slate-500 dark:text-slate-400">Page de garde authentifiee</p>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              Verification publique sans authentification du compte utilisateur.
            </p>
          </div>
          <Link href="/" className="rounded-xl border border-slate-300 bg-white/70 px-4 py-2 text-sm font-medium text-slate-700 backdrop-blur hover:border-brand-500 hover:text-brand-600 dark:border-slate-700 dark:bg-white/5 dark:text-slate-200">
            Retour a l'accueil
          </Link>
        </div>
        {content}
      </div>
    </div>
  );
}
