"use client";

import { useDeferredValue, useMemo, useState } from "react";

import ComponentCard from "@/components/common/ComponentCard";
import Button from "@/components/ui/button/Button";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import type { FacultyDashboardCommande } from "@/lib/utils/supabase/faculte-dashboard";

import { formatAmount, formatDate } from "./utils";

type LatestTransactionsProps = {
  rows: FacultyDashboardCommande[];
  categoryFilter: string;
  onCategoryFilterChange: (value: string) => void;
};

export default function LatestTransactions({
  rows,
  categoryFilter,
  onCategoryFilterChange,
}: LatestTransactionsProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const deferredSearch = useDeferredValue(search);
  const rowsPerPage = 5;

  const filteredRows = useMemo(() => {
    const query = deferredSearch.trim().toLowerCase();

    return rows.filter((row) => {
      if (categoryFilter !== "all" && row.categoryKey !== categoryFilter) {
        return false;
      }

      if (statusFilter !== "all" && row.status !== statusFilter) {
        return false;
      }

      if (!query) {
        return true;
      }

      return [row.orderNumber, row.product, row.categoryLabel, row.studentName, row.studentEmail, row.status]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
    });
  }, [categoryFilter, deferredSearch, rows, statusFilter]);

  const pageCount = Math.max(1, Math.ceil(filteredRows.length / rowsPerPage));
  const currentPage = Math.min(page, pageCount);
  const paginatedRows = filteredRows.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  const categories = useMemo(
    () => Array.from(new Map(rows.map((row) => [row.categoryKey, row.categoryLabel])).entries()),
    [rows],
  );

  return (
    <ComponentCard title="Latest transactions" desc="20 dernières transactions de l'année active, avec recherche, filtre et pagination 5 lignes par page.">
      <div className="flex flex-col gap-3 xl:flex-row">
        <input
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
          placeholder="Rechercher une transaction..."
          className="h-11 w-full rounded-xl border border-gray-300 bg-transparent px-4 text-sm text-gray-800 outline-none focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:text-white/90"
        />
        <select
          value={categoryFilter}
          onChange={(event) => {
            onCategoryFilterChange(event.target.value);
            setPage(1);
          }}
          className="h-11 min-w-[180px] rounded-xl border border-gray-300 bg-transparent px-4 text-sm text-gray-800 outline-none focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:text-white/90"
        >
          <option value="all">Toutes catégories</option>
          {categories.map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(event) => {
            setStatusFilter(event.target.value);
            setPage(1);
          }}
          className="h-11 min-w-[160px] rounded-xl border border-gray-300 bg-transparent px-4 text-sm text-gray-800 outline-none focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:text-white/90"
        >
          <option value="all">Tous statuts</option>
          <option value="success">Success</option>
          <option value="pending">Pending</option>
        </select>
      </div>

      <div className="overflow-x-auto">
        <Table className="min-w-full">
          <TableHeader className="border-y border-gray-100 dark:border-gray-800">
            <TableRow>
              <TableCell isHeader className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Nom</TableCell>
              <TableCell isHeader className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Date</TableCell>
              <TableCell isHeader className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Montant</TableCell>
              <TableCell isHeader className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Catégorie</TableCell>
              <TableCell isHeader className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Statut</TableCell>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
            {paginatedRows.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="px-5 py-4 text-sm">
                  <div className="font-medium text-gray-900 dark:text-white">{row.product || "Produit académique"}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">{row.studentName}</div>
                </TableCell>
                <TableCell className="px-5 py-4 text-sm text-gray-500 dark:text-gray-400">{formatDate(row.created_at)}</TableCell>
                <TableCell className="px-5 py-4 text-sm text-gray-700 dark:text-gray-300">{formatAmount(row.total)}</TableCell>
                <TableCell className="px-5 py-4 text-sm text-gray-500 dark:text-gray-400">{row.categoryLabel}</TableCell>
                <TableCell className="px-5 py-4 text-sm">
                  <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700 dark:bg-white/5 dark:text-gray-300">
                    {row.status || "Sans statut"}
                  </span>
                </TableCell>
              </TableRow>
            ))}
            {paginatedRows.length === 0 ? (
              <TableRow>
                <td colSpan={5} className="px-5 py-8 text-sm text-gray-500 dark:text-gray-400">
                  Aucune transaction à afficher.
                </td>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500 dark:text-gray-400">Page {currentPage} / {pageCount}</p>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={currentPage === 1}>
            Précédent
          </Button>
          <Button variant="outline" onClick={() => setPage((current) => Math.min(pageCount, current + 1))} disabled={currentPage === pageCount}>
            Suivant
          </Button>
        </div>
      </div>
    </ComponentCard>
  );
}
