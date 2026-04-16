"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import ComponentCard from "@/components/common/ComponentCard";

type CheckValidationResponse =
  | {
      valid: true;
      category: "validation";
      productId: string;
      studentId: string;
      orderReference: string;
      validatedAt: string;
      student?: {
        id: string;
        fullName: string;
        email: string | null;
        telephone: string | null;
        pays: string | null;
        ville: string | null;
        adresse: string | null;
        commune: string | null;
      } | null;
      product?: {
        id: string;
        designation: string | null;
        category: string;
        programmeId: string | null;
      };
      programme?: {
        id: string;
        designation: string | null;
        annee: string | null;
      } | null;
      commande?: {
        id: string;
        orderNumber: string | null;
        categorie: string | null;
        total: number | null;
      };
    }
  | {
      valid: false;
      error: string;
    };

type ValidationCheckingClientProps = {
  productId: string;
  studentId?: string;
  order?: string;
};

export default function ValidationCheckingClient({ productId, studentId, order }: ValidationCheckingClientProps) {
  const isMissingStudentId = !studentId;

  const requestKey = useMemo(() => {
    if (!studentId) return null;
    return `${productId}:${studentId}:${order ?? ""}`;
  }, [order, productId, studentId]);

  const [result, setResult] = useState<{
    key: string;
    data?: CheckValidationResponse;
    error?: string;
  } | null>(null);

  useEffect(() => {
    if (!studentId || !requestKey) return;

    const controller = new AbortController();
    const query = new URLSearchParams({ student_id: studentId });
    if (order) query.set("order", order);

    fetch(`/api/checking/validation/${encodeURIComponent(productId)}?${query.toString()}`, {
      method: "GET",
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        const json = (await response.json()) as CheckValidationResponse;
        if (!response.ok) {
          const message = json && "error" in json ? json.error : "Erreur de vérification.";
          throw new Error(message);
        }
        return json;
      })
      .then((json) => setResult({ key: requestKey, data: json }))
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
        setResult({
          key: requestKey,
          error: error instanceof Error ? error.message : "Erreur de vérification.",
        });
      });

    return () => controller.abort();
  }, [order, productId, requestKey, studentId]);

  const content = (() => {
    if (isMissingStudentId) {
      return <p className="text-sm text-red-600 dark:text-red-400">Lien de vérification incomplet (student_id manquant).</p>;
    }

    if (requestKey && result?.key !== requestKey) {
      return <p className="text-sm text-gray-600 dark:text-gray-300">Vérification en cours...</p>;
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
    const product = result.data.product ?? null;
    const programme = result.data.programme ?? null;
    const commande = result.data.commande ?? null;

    return (
      <div className="space-y-3">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-950/40 dark:text-emerald-200">
          <p className="text-sm font-medium">Document authentifie</p>
          <p className="mt-1 text-xs opacity-80">Validation: {new Date(result.data.validatedAt).toLocaleString("fr-FR")}</p>
        </div>

        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-white/[0.03]">
            <dt className="text-xs text-gray-500 dark:text-gray-400">Reference</dt>
            <dd className="mt-1 text-sm font-medium text-gray-900 dark:text-white/90">{result.data.orderReference}</dd>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-white/[0.03]">
            <dt className="text-xs text-gray-500 dark:text-gray-400">Document</dt>
            <dd className="mt-1 break-all text-sm font-medium text-gray-900 dark:text-white/90">
              {product?.designation ?? result.data.productId}
            </dd>
            {product?.category ? (
              <dd className="mt-1 text-xs text-gray-600 dark:text-gray-300">Categorie: {product.category}</dd>
            ) : null}
          </div>

          <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-white/[0.03] sm:col-span-2">
            <dt className="text-xs text-gray-500 dark:text-gray-400">Etudiant</dt>
            <dd className="mt-1 text-sm font-medium text-gray-900 dark:text-white/90">{student?.fullName ?? result.data.studentId}</dd>
            <dd className="mt-1 break-all text-xs text-gray-600 dark:text-gray-300">
              {[
                student?.email ? `Email: ${student.email}` : null,
                student?.telephone ? `Telephone: ${student.telephone}` : null,
                student?.ville ? `Ville: ${student.ville}` : null,
                student?.adresse ? `Adresse: ${student.adresse}` : null,
              ]
                .filter(Boolean)
                .join(" • ")}
            </dd>
          </div>

          {programme ? (
            <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-white/[0.03] sm:col-span-2">
              <dt className="text-xs text-gray-500 dark:text-gray-400">Programme</dt>
              <dd className="mt-1 break-all text-sm font-medium text-gray-900 dark:text-white/90">
                {programme.designation ?? programme.id}
              </dd>
              {programme.annee ? (
                <dd className="mt-1 text-xs text-gray-600 dark:text-gray-300">Annee: {programme.annee}</dd>
              ) : null}
            </div>
          ) : null}

          {commande ? (
            <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-white/[0.03] sm:col-span-2">
              <dt className="text-xs text-gray-500 dark:text-gray-400">Commande</dt>
              <dd className="mt-1 break-all text-sm font-medium text-gray-900 dark:text-white/90">
                {commande.orderNumber ?? commande.id}
              </dd>
              <dd className="mt-1 break-all text-xs text-gray-600 dark:text-gray-300">
                {[
                  commande.categorie ? `Categorie: ${commande.categorie}` : null,
                  typeof commande.total === "number" ? `Total: ${commande.total}` : null,
                ]
                  .filter(Boolean)
                  .join(" • ")}
              </dd>
            </div>
          ) : null}
        </dl>
      </div>
    );
  })();

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl items-center px-4 py-10">
      <div className="w-full">
        <ComponentCard
          title="Verification de la fiche de validation"
          desc="Cette page confirme l'authenticite du document scanne (QR code)."
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
