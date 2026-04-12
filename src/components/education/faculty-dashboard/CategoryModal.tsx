"use client";

import { useDeferredValue, useMemo, useState } from "react";

import Button from "@/components/ui/button/Button";
import { Modal } from "@/components/ui/modal";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import type { FacultyDashboardCategory, FacultyDashboardCommande } from "@/lib/utils/supabase/faculte-dashboard";

import { exportRows, formatAmount, formatDate } from "./utils";

type CategoryModalProps = {
  category: FacultyDashboardCategory | null;
  commandes: FacultyDashboardCommande[];
  isOpen: boolean;
  onClose: () => void;
};

export default function CategoryModal({ category, commandes, isOpen, onClose }: CategoryModalProps) {
  if (!isOpen) {
    return null;
  }

  return <CategoryModalContent category={category} commandes={commandes} onClose={onClose} />;
}

function CategoryModalContent({
  category,
  commandes,
  onClose,
}: Omit<CategoryModalProps, "isOpen">) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const deferredSearch = useDeferredValue(search);
  const rowsPerPage = 5;

  const filteredRows = useMemo(() => {
    const query = deferredSearch.trim().toLowerCase();

    return commandes.filter((commande) => {
      if (category && commande.categoryKey !== category.key) {
        return false;
      }

      if (statusFilter !== "all" && commande.status !== statusFilter) {
        return false;
      }

      if (!query) {
        return true;
      }

      return [
        commande.orderNumber,
        commande.product,
        commande.categoryLabel,
        commande.studentName,
        commande.studentEmail,
        commande.status,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
    });
  }, [category, commandes, deferredSearch, statusFilter]);

  const pageCount = Math.max(1, Math.ceil(filteredRows.length / rowsPerPage));
  const currentPage = Math.min(page, pageCount);
  const paginatedRows = filteredRows.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  return (
    <Modal isOpen={true} onClose={onClose} size="xl" className="max-w-6xl p-0">
      <div className="rounded-3xl bg-white dark:bg-gray-900">
        <div className="border-b border-gray-200 px-6 py-5 dark:border-gray-800">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">{category?.label || "Détail des commandes"}</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Reporting détaillé avec recherche, filtre et export CSV.
              </p>
            </div>
            <Button variant="outline" onClick={() => exportRows(`reporting-${category?.key || "commandes"}.csv`, filteredRows)}>
              Exporter
            </Button>
          </div>
        </div>

        <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-800">
          <div className="flex flex-col gap-3 lg:flex-row">
            <input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Rechercher une commande, un étudiant, un statut..."
              className="h-11 w-full rounded-xl border border-gray-300 bg-transparent px-4 text-sm text-gray-800 outline-none focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:text-white/90"
            />
            <select
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value);
                setPage(1);
              }}
              className="h-11 min-w-[180px] rounded-xl border border-gray-300 bg-transparent px-4 text-sm text-gray-800 outline-none focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:text-white/90"
            >
              <option value="all">Tous les statuts</option>
              <option value="success">Success</option>
              <option value="pending">Pending</option>
            </select>
          </div>
        </div>

        <div className="px-6 py-5">
          <div className="mb-4 flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
            <p>{filteredRows.length} commande(s) trouvée(s)</p>
            <p>Page {currentPage} / {pageCount}</p>
          </div>

          <div className="overflow-x-auto">
            <Table className="min-w-full">
              <TableHeader className="border-y border-gray-100 dark:border-gray-800">
                <TableRow>
                  <TableCell isHeader className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Commande</TableCell>
                  <TableCell isHeader className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Etudiant</TableCell>
                  <TableCell isHeader className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Statut</TableCell>
                  <TableCell isHeader className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Total</TableCell>
                  <TableCell isHeader className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Date</TableCell>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
                {paginatedRows.map((commande) => (
                  <TableRow key={commande.id}>
                    <TableCell className="px-4 py-4 text-sm text-gray-700 dark:text-gray-300">
                      <div className="font-medium text-gray-900 dark:text-white">{commande.product || "Produit académique"}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{commande.orderNumber || commande.id.slice(0, 8)}</div>
                    </TableCell>
                    <TableCell className="px-4 py-4 text-sm text-gray-700 dark:text-gray-300">
                      <div>{commande.studentName}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{commande.studentEmail || "Email indisponible"}</div>
                    </TableCell>
                    <TableCell className="px-4 py-4 text-sm">
                      <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700 dark:bg-white/5 dark:text-gray-300">
                        {commande.status || "Sans statut"}
                      </span>
                    </TableCell>
                    <TableCell className="px-4 py-4 text-sm text-gray-700 dark:text-gray-300">{formatAmount(commande.total)}</TableCell>
                    <TableCell className="px-4 py-4 text-sm text-gray-500 dark:text-gray-400">{formatDate(commande.created_at)}</TableCell>
                  </TableRow>
                ))}
                {paginatedRows.length === 0 ? (
                  <TableRow>
                    <td colSpan={5} className="px-4 py-8 text-sm text-gray-500 dark:text-gray-400">
                      Aucune commande ne correspond à ce filtre.
                    </td>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </div>

          <div className="mt-5 flex items-center justify-between">
            <Button variant="outline" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={currentPage === 1}>
              Précédent
            </Button>
            <Button variant="outline" onClick={() => setPage((current) => Math.min(pageCount, current + 1))} disabled={currentPage === pageCount}>
              Suivant
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
