"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import ComponentCard from "@/components/common/ComponentCard";

type CheckSessionResponse =
  | {
      valid: true;
      category: "session";
      productId: string;
      studentId: string;
      orderReference: string;
      validatedAt: string;
      student?: {
        id: string;
        fullName: string;
        email: string | null;
        telephone: string | null;
        ville: string | null;
        adresse: string | null;
        matricule: string | null;
      } | null;
      session?: {
        id: string;
        designation: string | null;
        dateDebut: string | null;
        dateFin: string | null;
        montant: number | null;
        matieres: unknown[];
      } | null;
    }
  | {
      valid: false;
      error: string;
    };

type SessionCheckingClientProps = {
  productId: string;
  studentId?: string;
  order?: string;
};

export default function SessionCheckingClient({ productId, studentId, order }: SessionCheckingClientProps) {
  const requestKey = useMemo(() => {
    if (!studentId) return null;
    return `${productId}:${studentId}:${order ?? ""}`;
  }, [order, productId, studentId]);

  const [result, setResult] = useState<{
    key: string;
    data?: CheckSessionResponse;
    error?: string;
  } | null>(null);

  useEffect(() => {
    if (!studentId || !requestKey) return;

    const controller = new AbortController();
    const query = new URLSearchParams({ student_id: studentId });
    if (order) query.set("order", order);

    fetch(`/api/checking/session/${encodeURIComponent(productId)}?${query.toString()}`, {
      method: "GET",
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        const json = (await response.json()) as CheckSessionResponse;
        if (!response.ok) {
          const message = json && "error" in json ? json.error : "Erreur de verification.";
          throw new Error(message);
        }
        return json;
      })
      .then((json) => setResult({ key: requestKey, data: json }))
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
        setResult({ key: requestKey, error: error instanceof Error ? error.message : "Erreur de verification." });
      });

    return () => controller.abort();
  }, [order, productId, requestKey, studentId]);

  const content = (() => {
    if (!studentId) {
      return <p className="text-sm text-red-600 dark:text-red-400">Lien de verification incomplet.</p>;
    }
    if (requestKey && result?.key !== requestKey) {
      return <p className="text-sm text-gray-600 dark:text-gray-300">Verification en cours...</p>;
    }
    if (requestKey && result?.key === requestKey && result.error) {
      return <p className="text-sm text-red-600 dark:text-red-400">{result.error}</p>;
    }
    if (!requestKey || !result?.data || result.key !== requestKey) {
      return <p className="text-sm text-gray-600 dark:text-gray-300">Pret.</p>;
    }
    if (!result.data.valid) {
      return <p className="text-sm text-red-600 dark:text-red-400">{result.data.error}</p>;
    }

    const student = result.data.student ?? null;
    const session = result.data.session ?? null;

    return (
      <div className="space-y-3">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-950/40 dark:text-emerald-200">
          <p className="text-sm font-medium">Macaron authentifie</p>
          <p className="mt-1 text-xs opacity-80">Paiement valide le {new Date(result.data.validatedAt).toLocaleString("fr-FR")}</p>
        </div>

        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-white/[0.03]">
            <dt className="text-xs text-gray-500 dark:text-gray-400">Reference</dt>
            <dd className="mt-1 text-sm font-medium text-gray-900 dark:text-white/90">{result.data.orderReference}</dd>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-white/[0.03]">
            <dt className="text-xs text-gray-500 dark:text-gray-400">Montant</dt>
            <dd className="mt-1 text-sm font-medium text-gray-900 dark:text-white/90">
              {typeof session?.montant === "number" ? `${session.montant} USD` : "Non renseigne"}
            </dd>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-white/[0.03] sm:col-span-2">
            <dt className="text-xs text-gray-500 dark:text-gray-400">Etudiant</dt>
            <dd className="mt-1 text-sm font-medium text-gray-900 dark:text-white/90">{student?.fullName ?? result.data.studentId}</dd>
            <dd className="mt-1 break-all text-xs text-gray-600 dark:text-gray-300">
              {[student?.matricule ? `Matricule: ${student.matricule}` : null, student?.email ? `Email: ${student.email}` : null, student?.telephone ? `Telephone: ${student.telephone}` : null]
                .filter(Boolean)
                .join(" • ")}
            </dd>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-white/[0.03] sm:col-span-2">
            <dt className="text-xs text-gray-500 dark:text-gray-400">Session</dt>
            <dd className="mt-1 text-sm font-medium text-gray-900 dark:text-white/90">{session?.designation ?? "Session"}</dd>
            <dd className="mt-1 break-all text-xs text-gray-600 dark:text-gray-300">
              {[
                session?.dateDebut ? `Debut: ${session.dateDebut}` : null,
                session?.dateFin ? `Fin: ${session.dateFin}` : null,
                Array.isArray(session?.matieres) ? `Matieres: ${session?.matieres.length}` : null,
              ]
                .filter(Boolean)
                .join(" • ")}
            </dd>
          </div>
        </dl>
      </div>
    );
  })();

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl items-center px-4 py-10">
      <div className="w-full">
        <ComponentCard title="Verification du macaron session" desc="Cette page confirme l'authenticite du macaron et affiche les informations utiles.">
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
