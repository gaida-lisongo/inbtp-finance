"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import ComponentCard from "@/components/common/ComponentCard";

type CheckProtocolResponse =
  | {
      valid: true;
      category: "protocol";
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
    }
  | {
      valid: false;
      error: string;
    };

type ProtocolCheckingClientProps = {
  notificationSujetId: string;
};

const verificationLabels: Record<"validated" | "rejected" | "pending", string> = {
  validated: "Document verifie et projet valide",
  rejected: "Document verifie et projet rejete",
  pending: "Document authentifie, evaluation en cours",
};

const notificationLabels: Record<"delivered" | "in_review", string> = {
  delivered: "Suivi transmis",
  in_review: "Suivi en cours de traitement",
};

export default function ProtocolCheckingClient({ notificationSujetId }: ProtocolCheckingClientProps) {
  const [result, setResult] = useState<{
    data?: CheckProtocolResponse;
    error?: string;
  } | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    fetch(`/api/checking/protocol/${encodeURIComponent(notificationSujetId)}`, {
      method: "GET",
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        const json = (await response.json()) as CheckProtocolResponse;
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
      return <p className="text-sm text-gray-600 dark:text-gray-300">Verification en cours...</p>;
    }

    if (result.error) {
      return <p className="text-sm text-red-600 dark:text-red-400">{result.error}</p>;
    }

    if (!result.data || !result.data.valid) {
      return <p className="text-sm text-red-600 dark:text-red-400">Document invalide.</p>;
    }

    const { student, subject, evaluation, verificationStatus, notificationStatus } = result.data;

    return (
      <div className="space-y-3">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-950/40 dark:text-emerald-200">
          <p className="text-sm font-medium">{verificationLabels[verificationStatus]}</p>
          <p className="mt-1 text-xs opacity-80">Suivi: {notificationLabels[notificationStatus]}</p>
          <p className="mt-1 text-xs opacity-80">Emission: {new Date(result.data.verifiedAt).toLocaleString("fr-FR")}</p>
        </div>

        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-white/[0.03] sm:col-span-2">
            <dt className="text-xs text-gray-500 dark:text-gray-400">Etudiant</dt>
            <dd className="mt-1 text-sm font-medium text-gray-900 dark:text-white/90">
              {student?.fullName ?? "Etudiant non renseigne"}
            </dd>
            <dd className="mt-1 break-all text-xs text-gray-600 dark:text-gray-300">
              {[student?.email ? `Email: ${student.email}` : null, student?.telephone ? `Telephone: ${student.telephone}` : null]
                .filter(Boolean)
                .join(" • ")}
            </dd>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-white/[0.03] sm:col-span-2">
            <dt className="text-xs text-gray-500 dark:text-gray-400">Sujet</dt>
            <dd className="mt-1 text-sm font-medium text-gray-900 dark:text-white/90">{subject.title}</dd>
            <dd className="mt-1 break-all text-xs text-gray-600 dark:text-gray-300">
              {[`Directeur: ${subject.director}`, subject.coDirector ? `Co-directeur: ${subject.coDirector}` : null]
                .filter(Boolean)
                .join(" • ")}
            </dd>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-white/[0.03]">
            <dt className="text-xs text-gray-500 dark:text-gray-400">Note</dt>
            <dd className="mt-1 text-sm font-medium text-gray-900 dark:text-white/90">
              {evaluation.note === null ? "En attente" : `${evaluation.note}/25`}
            </dd>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-white/[0.03]">
            <dt className="text-xs text-gray-500 dark:text-gray-400">Statut</dt>
            <dd className="mt-1 text-sm font-medium text-gray-900 dark:text-white/90">{verificationLabels[verificationStatus]}</dd>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-white/[0.03] sm:col-span-2">
            <dt className="text-xs text-gray-500 dark:text-gray-400">Observations</dt>
            <dd className="mt-1 whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-200">
              {evaluation.observations.length > 0 ? evaluation.observations.join("\n") : "Aucune observation pour le moment."}
            </dd>
          </div>
        </dl>
      </div>
    );
  })();

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl items-center px-4 py-10">
      <div className="w-full">
        <ComponentCard
          title="Verification du protocole de recherche"
          desc="Cette page authentifie le protocole et permet de suivre l'evolution du projet."
        >
          {content}
          <div className="pt-2">
            <Link href="/" className="text-sm font-medium text-brand-600 hover:underline dark:text-brand-400">
              Retour a l'accueil
            </Link>
          </div>
        </ComponentCard>
      </div>
    </div>
  );
}
