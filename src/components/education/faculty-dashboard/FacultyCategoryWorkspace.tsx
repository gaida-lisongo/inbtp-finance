"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import MetricTile from "@/components/education/faculty-dashboard/MetricTile";
import PerformanceChart from "@/components/education/faculty-dashboard/PerformanceChart";
import Button from "@/components/ui/button/Button";
import type { FacultyDashboardCommande } from "@/lib/utils/supabase/faculte-dashboard";

type FacultyCategoryWorkspaceProps = {
  categoryKey: string;
  categoryLabel: string;
  rows: FacultyDashboardCommande[];
  rangeLabel: string | null;
  programmeLabel: string | null;
};

const normalize = (value: string | null | undefined) =>
  (value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

const formatAmount = (value: number | null | undefined) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(
    typeof value === "number" ? value : 0,
  );

const formatDate = (value: string) => new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));

export default function FacultyCategoryWorkspace({
  categoryKey,
  categoryLabel,
  rows,
  rangeLabel,
  programmeLabel,
}: FacultyCategoryWorkspaceProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const rowsPerPage = 10;

  const filteredRows = useMemo(() => {
    const query = normalize(search);

    return rows.filter((row) => {
      if (normalize(row.categoryKey) !== normalize(categoryKey)) {
        return false;
      }

      if (statusFilter !== "all" && normalize(row.status) !== statusFilter) {
        return false;
      }

      if (!query) {
        return true;
      }

      const haystack = [
        row.orderNumber,
        row.id,
        row.studentName,
        row.studentEmail,
        row.product,
        row.description,
      ]
        .map((item) => normalize(item))
        .join(" ");

      return haystack.includes(query);
    });
  }, [categoryKey, rows, search, statusFilter]);

  const metrics = useMemo(() => {
    const success = filteredRows.filter((row) => normalize(row.status) === "success");
    const pending = filteredRows.filter((row) => normalize(row.status) === "pending");

    return {
      total: filteredRows.length,
      success: success.length,
      pending: pending.length,
      successRevenue: success.reduce((sum, row) => sum + (row.total ?? 0), 0),
    };
  }, [filteredRows]);

  const chartSeries = useMemo(() => {
    const buckets = new Map<string, { key: string; label: string; success: number; pending: number }>();

    for (const row of filteredRows) {
      const createdAt = new Date(row.created_at);
      const key = `${createdAt.getUTCFullYear()}-${String(createdAt.getUTCMonth() + 1).padStart(2, "0")}`;
      const label = new Intl.DateTimeFormat("fr-FR", { month: "short", year: "numeric" }).format(createdAt);
      const bucket = buckets.get(key) ?? { key, label, success: 0, pending: 0 };

      if (normalize(row.status) === "success") {
        bucket.success += 1;
      } else if (normalize(row.status) === "pending") {
        bucket.pending += 1;
      }

      buckets.set(key, bucket);
    }

    return Array.from(buckets.values()).sort((a, b) => a.key.localeCompare(b.key));
  }, [filteredRows]);

  const pageCount = Math.max(1, Math.ceil(filteredRows.length / rowsPerPage));
  const currentPage = Math.min(page, pageCount);
  const paginatedRows = filteredRows.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
        <p className="text-xs uppercase tracking-[0.24em] text-gray-500 dark:text-gray-400">Ressources faculté</p>
        <h1 className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white/90">{categoryLabel}</h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
          {programmeLabel ? `Promotion: ${programmeLabel}. ` : ""}Periode: {rangeLabel ?? "toute la periode disponible"}.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricTile title="Commandes" value={String(metrics.total)} helper="Selon les filtres actifs" tone="slate" />
        <MetricTile title="Success" value={String(metrics.success)} helper="Paiements confirmes" tone="green" />
        <MetricTile title="Pending" value={String(metrics.pending)} helper="En attente de verification" tone="amber" />
        <MetricTile title="Revenu" value={formatAmount(metrics.successRevenue)} helper="Somme success" tone="blue" />
      </section>

      <PerformanceChart series={chartSeries} rangeLabel={rangeLabel} />

      <section className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="grid gap-4 lg:grid-cols-3">
          <input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="Recherche orderNumber, etudiant..."
            className="h-11 rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 dark:border-gray-700 dark:text-white/90"
          />
          <select
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(event.target.value);
              setPage(1);
            }}
            className="h-11 rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 dark:border-gray-700 dark:text-white/90"
          >
            <option value="all">Tous statuts</option>
            <option value="success">Success</option>
            <option value="pending">Pending</option>
            <option value="no">No</option>
          </select>
          <div className="flex items-center justify-end">
            <Link href="/" className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 dark:border-gray-700 dark:text-gray-200">
              Retour dashboard
            </Link>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        {paginatedRows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 px-6 py-10 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
            Aucune commande pour cette categorie.
          </div>
        ) : (
          paginatedRows.map((row) => (
            <article key={row.id} className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white/90">{row.studentName}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">OrderNumber: {row.orderNumber ?? row.id}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-300">{row.product ?? "Ressource academique"}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700 dark:bg-white/5 dark:text-gray-300">
                    {row.status ?? "Sans statut"}
                  </span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">{formatAmount(row.total)}</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">{formatDate(row.created_at)}</span>
                  <Link href={`/commandes/${row.id}`} className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600">
                    Page metier
                  </Link>
                </div>
              </div>
            </article>
          ))
        )}
      </section>

      <section className="flex items-center justify-between">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Page {currentPage} / {pageCount}
        </p>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={currentPage === 1}>
            Precedent
          </Button>
          <Button variant="outline" onClick={() => setPage((current) => Math.min(pageCount, current + 1))} disabled={currentPage === pageCount}>
            Suivant
          </Button>
        </div>
      </section>
    </div>
  );
}
