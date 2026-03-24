"use client";

import { useMemo, useState } from "react";

import { Table, TableBody, TableCell, TableHeader, TableRow } from "../ui/table";
import Badge from "../ui/badge/Badge";
import InputField from "../form/input/InputField";

export type DashboardPaymentRow = {
  id: string;
  orderNumber: string;
  createdAt: string | null;
  montant: number | null;
  status: string;
  modaliteLabel: string;
  etudiantLabel: string;
  matricule: string;
};

type RecentOrdersProps = {
  payments: DashboardPaymentRow[];
};

const formatCurrency = (value: number | null) =>
  new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value ?? 0);

const formatDate = (value: string | null) => {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
};

const normalizeStatus = (value: string) => value.trim().toLowerCase();

export default function RecentOrders({ payments }: RecentOrdersProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredPayments = useMemo(
    () =>
      payments.filter((payment) =>
        [
          payment.orderNumber,
          payment.etudiantLabel,
          payment.matricule,
          payment.modaliteLabel,
          payment.status,
        ]
          .join(" ")
          .toLowerCase()
          .includes(searchTerm.trim().toLowerCase()),
      ),
    [payments, searchTerm],
  );

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white px-4 pb-3 pt-4 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            Dernieres transactions
          </h3>
          <p className="mt-1 text-theme-sm text-gray-500 dark:text-gray-400">
            Vue detaillee des derniers encaissements et paiements en attente.
          </p>
        </div>

        <div className="w-full sm:max-w-xs">
          <InputField
            placeholder="Rechercher une transaction"
            defaultValue={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
        </div>
      </div>

      <div className="max-w-full overflow-x-auto">
        <Table>
          <TableHeader className="border-y border-gray-100 dark:border-gray-800">
            <TableRow>
              {["Etudiant", "Date", "Montant", "Modalite", "Statut", "Commande"].map((label) => (
                <TableCell
                  key={label}
                  isHeader
                  className="py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400"
                >
                  {label}
                </TableCell>
              ))}
            </TableRow>
          </TableHeader>

          <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
            {filteredPayments.length > 0 ? (
              filteredPayments.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell className="py-3">
                    <div>
                      <p className="font-medium text-gray-800 text-theme-sm dark:text-white/90">
                        {payment.etudiantLabel}
                      </p>
                      <span className="text-theme-xs text-gray-500 dark:text-gray-400">
                        {payment.matricule}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="py-3 text-theme-sm text-gray-500 dark:text-gray-400">
                    {formatDate(payment.createdAt)}
                  </TableCell>
                  <TableCell className="py-3 text-theme-sm text-gray-500 dark:text-gray-400">
                    {formatCurrency(payment.montant)}
                  </TableCell>
                  <TableCell className="py-3 text-theme-sm text-gray-500 dark:text-gray-400">
                    {payment.modaliteLabel}
                  </TableCell>
                  <TableCell className="py-3 text-theme-sm text-gray-500 dark:text-gray-400">
                    <Badge
                      size="sm"
                      color={
                        normalizeStatus(payment.status) === "success"
                          ? "success"
                          : normalizeStatus(payment.status) === "pending"
                          ? "warning"
                          : "error"
                      }
                    >
                      {payment.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-3 text-theme-sm text-gray-500 dark:text-gray-400">
                    {payment.orderNumber}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <td colSpan={6} className="px-5 py-10 text-center text-sm text-gray-500 dark:text-gray-400">
                  Aucune transaction ne correspond a votre recherche.
                </td>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
