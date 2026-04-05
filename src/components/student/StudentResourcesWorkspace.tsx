"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";

import { validateCommandePaymentAccessAction } from "@/app/commande/actions";
import MetricTile from "@/components/education/faculty-dashboard/MetricTile";
import PerformanceChart from "@/components/education/faculty-dashboard/PerformanceChart";
import Button from "@/components/ui/button/Button";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import type { CommandeCategory } from "@/lib/utils/supabase/commandes";
import type { StudentDashboardSnapshot } from "@/lib/utils/supabase/student-dashboard";

type StudentResourcesWorkspaceProps = {
  snapshot: StudentDashboardSnapshot;
  initialType?: string | null;
};

type StatusFilter = "all" | "success" | "pending" | "no" | "other";

type ResourceCommandeRow = StudentDashboardSnapshot["commandes"][number] & {
  canonicalCategory: CommandeCategory | null;
  resourceTitle: string;
  resourceDescription: string | null;
  productPath: string | null;
  commandePath: string | null;
  normalizedStatus: "success" | "pending" | "no" | null;
};

const normalizeText = (value: string | null | undefined) => {
  if (typeof value !== "string") {
    return "";
  }

  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
};

const mapCommandeCategory = (value: string | null): CommandeCategory | null => {
  const normalized = normalizeText(value);

  switch (normalized) {
    case "documents":
    case "document":
    case "releve":
    case "releves":
    case "validation":
    case "validations":
      return "documents";
    case "session":
    case "sessions":
      return "session";
    case "stage":
    case "stages":
      return "stages";
    case "sujet":
    case "sujets":
      return "sujets";
    case "laboratoire":
    case "laboratoires":
      return "laboratoire";
    default:
      return null;
  }
};

const normalizeStatus = (value: string | null): "success" | "pending" | "no" | null => {
  const normalized = normalizeText(value);

  if (["success", "ok", "paid", "delivered", "complete", "completed"].includes(normalized)) {
    return "success";
  }

  if (["pending", "processing", "inprogress", "in progress"].includes(normalized)) {
    return "pending";
  }

  if (["no", "failed", "failure", "error", "cancelled", "canceled", "rejected", "refused"].includes(normalized)) {
    return "no";
  }

  return null;
};

const getStatusLabel = (status: "success" | "pending" | "no" | null) => {
  switch (status) {
    case "success":
      return "Validee";
    case "pending":
      return "En attente";
    case "no":
      return "Echouee";
    default:
      return "Initiee";
  }
};

const getStatusClassName = (status: "success" | "pending" | "no" | null) => {
  switch (status) {
    case "success":
      return "bg-success-50 text-success-700 dark:bg-success-500/10 dark:text-success-300";
    case "pending":
      return "bg-warning-50 text-warning-700 dark:bg-warning-500/10 dark:text-warning-300";
    case "no":
      return "bg-error-50 text-error-700 dark:bg-error-500/10 dark:text-error-300";
    default:
      return "bg-gray-100 text-gray-700 dark:bg-white/5 dark:text-gray-300";
  }
};

const formatAmount = (value: number | null) => {
  if (typeof value !== "number") {
    return "Montant non renseigne";
  }

  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
};

const formatDateTime = (value: string) => {
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
};

const sortByDateDesc = <T extends { created_at: string }>(rows: T[]) => {
  return [...rows].sort((left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime());
};

export default function StudentResourcesWorkspace({ snapshot, initialType }: StudentResourcesWorkspaceProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [selectedCommandeId, setSelectedCommandeId] = useState<string | null>(null);
  const [verificationMessage, setVerificationMessage] = useState<string | null>(null);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [statusOverrides, setStatusOverrides] = useState<Record<string, string | null>>({});
  const [accessPathByCommande, setAccessPathByCommande] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();

  const initialTypeKey = normalizeText(initialType ?? "");

  console.log("Snapshot:", snapshot);

  const resourceByKey = useMemo(() => {
    const entries = snapshot.availableResources.map((resource) => [`${resource.category}:${resource.id}`, resource] as const);
    return new Map(entries);
  }, [snapshot.availableResources]);

  const allRows = useMemo<ResourceCommandeRow[]>(() => {
    return sortByDateDesc(snapshot.commandes).map((commande) => {
      const canonicalCategory = mapCommandeCategory(commande.categorie);
      const resourceKey = canonicalCategory && commande.product ? `${canonicalCategory}:${commande.product}` : null;
      const resource = resourceKey ? resourceByKey.get(resourceKey) ?? null : null;

      return {
        ...commande,
        status: normalizeStatus(statusOverrides[commande.id] ?? commande.status),
        normalizedStatus: normalizeStatus(statusOverrides[commande.id] ?? commande.status),
        canonicalCategory,
        resourceTitle: resource?.title ?? commande.description ?? "Ressource academique",
        resourceDescription: resource?.description ?? commande.description ?? null,
        productPath: resource?.productPath ?? null,
        commandePath: resource?.commandePath ?? null,
      };
    });
  }, [resourceByKey, snapshot.commandes, statusOverrides]);

  const categoryOptions = useMemo(() => {
    const unique = new Map<string, string>();

    for (const row of allRows) {
      unique.set(row.categoryKey, row.categoryLabel);
    }

    return Array.from(unique.entries()).map(([key, label]) => ({ key, label }));
  }, [allRows]);

  const [categoryFilter, setCategoryFilter] = useState<string>(initialTypeKey || "all");

  const filteredRows = useMemo(() => {
    const normalizedQuery = normalizeText(searchTerm);

    return allRows.filter((row) => {
      const statusValue = row.normalizedStatus;
      const categoryValue = normalizeText(row.categoryKey);

      if (categoryFilter !== "all" && categoryValue !== normalizeText(categoryFilter)) {
        return false;
      }

      if (statusFilter === "success" && statusValue !== "success") {
        return false;
      }

      if (statusFilter === "pending" && statusValue !== "pending") {
        return false;
      }

      if (statusFilter === "no" && statusValue !== "no") {
        return false;
      }

      if (statusFilter === "other" && statusValue !== null) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      const haystack = [
        row.orderNumber,
        row.id,
        row.resourceTitle,
        row.resourceDescription,
        row.categoryLabel,
        row.normalizedStatus,
      ]
        .map((item) => normalizeText(item))
        .join(" ");

      return haystack.includes(normalizedQuery);
    });
  }, [allRows, categoryFilter, searchTerm, statusFilter]);

  const selectedCommande = useMemo(
    () => allRows.find((row) => row.id === selectedCommandeId) ?? null,
    [allRows, selectedCommandeId],
  );

  const relatedRows = useMemo(() => {
    if (!selectedCommande || !selectedCommande.product || !selectedCommande.canonicalCategory) {
      return [] as ResourceCommandeRow[];
    }

    return sortByDateDesc(
      allRows.filter(
        (row) =>
          row.product === selectedCommande.product && row.canonicalCategory === selectedCommande.canonicalCategory,
      ),
    );
  }, [allRows, selectedCommande]);

  const metrics = useMemo(() => {
    const successRows = filteredRows.filter((row) => row.normalizedStatus === "success");
    const pendingRows = filteredRows.filter((row) => row.normalizedStatus === "pending");
    const totalRevenue = successRows.reduce((sum, row) => sum + (row.total ?? 0), 0);
    const pendingRevenue = pendingRows.reduce((sum, row) => sum + (row.total ?? 0), 0);

    return {
      total: filteredRows.length,
      successCount: successRows.length,
      pendingCount: pendingRows.length,
      successRevenue: totalRevenue,
      pendingRevenue,
    };
  }, [filteredRows]);

  const chartSeries = useMemo(() => {
    const bucket = new Map<string, { key: string; label: string; success: number; pending: number }>();

    for (const row of filteredRows) {
      const createdAt = new Date(row.created_at);
      const key = `${createdAt.getUTCFullYear()}-${String(createdAt.getUTCMonth() + 1).padStart(2, "0")}`;
      const label = new Intl.DateTimeFormat("fr-FR", { month: "short", year: "numeric" }).format(createdAt);
      const current = bucket.get(key) ?? { key, label, success: 0, pending: 0 };

      if (row.normalizedStatus === "success") {
        current.success += 1;
      }

      if (row.normalizedStatus === "pending") {
        current.pending += 1;
      }

      bucket.set(key, current);
    }

    return Array.from(bucket.values()).sort((left, right) => left.key.localeCompare(right.key));
  }, [filteredRows]);

  const resolvedAccessPath = selectedCommande
    ? accessPathByCommande[selectedCommande.id] ?? (selectedCommande.normalizedStatus === "success" ? selectedCommande.productPath : null)
    : null;

  const handleVerifySelectedCommande = () => {
    if (!selectedCommande || !selectedCommande.canonicalCategory || !selectedCommande.product) {
      setVerificationError("Impossible de verifier cette commande: ressource introuvable.");
      return;
    }

    setVerificationError(null);
    setVerificationMessage(null);

    startTransition(async () => {
      try {
        const result = await validateCommandePaymentAccessAction({
          commandeId: selectedCommande.id,
          category: selectedCommande.canonicalCategory,
          resourceId: selectedCommande.product,
        });

        setStatusOverrides((previous) => ({
          ...previous,
          [selectedCommande.id]: result.commande.status,
        }));

        if (result.success) {
          setAccessPathByCommande((previous) => ({
            ...previous,
            [selectedCommande.id]: result.productPath,
          }));
        }

        setVerificationMessage(result.message);
      } catch (error) {
        setVerificationError(error instanceof Error ? error.message : "Erreur de verification du paiement.");
      }
    });
  };

  if (selectedCommande) {
    return (
      <div className="space-y-6">
        <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="mb-6 flex items-center justify-between gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setSelectedCommandeId(null);
                setVerificationMessage(null);
                setVerificationError(null);
              }}
            >
              Retour a la liste
            </Button>
            <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${getStatusClassName(selectedCommande.normalizedStatus)}`}>
              {getStatusLabel(selectedCommande.normalizedStatus)}
            </span>
          </div>

          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white/90">Detail de la commande</h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                OrderNumber: {selectedCommande.orderNumber ?? selectedCommande.id}
              </p>
              <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">{selectedCommande.resourceTitle}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {selectedCommande.commandePath ? (
                <Link
                  href={selectedCommande.commandePath}
                  className="inline-flex items-center justify-center rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.04]"
                >
                  Ouvrir la commande
                </Link>
              ) : null}
              {resolvedAccessPath ? (
                <Link
                  href={resolvedAccessPath}
                  className="inline-flex items-center justify-center rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-600"
                >
                  Acceder a la ressource
                </Link>
              ) : (
                <Button onClick={handleVerifySelectedCommande} disabled={isPending}>
                  {isPending ? "Verification..." : "Verifier le paiement"}
                </Button>
              )}
            </div>
          </div>

          {verificationMessage ? (
            <div className="mt-4 rounded-xl border border-success-200 bg-success-50 px-4 py-3 text-sm text-success-700 dark:border-success-500/30 dark:bg-success-500/10 dark:text-success-300">
              {verificationMessage}
            </div>
          ) : null}

          {verificationError ? (
            <div className="mt-4 rounded-xl border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-700 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-300">
              {verificationError}
            </div>
          ) : null}

          <div className="mt-6 overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800">
            <div className="max-w-full overflow-x-auto">
              <Table>
                <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                  <TableRow>
                    <TableCell isHeader className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      Reference
                    </TableCell>
                    <TableCell isHeader className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      Date
                    </TableCell>
                    <TableCell isHeader className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      Statut
                    </TableCell>
                    <TableCell isHeader className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      Montant
                    </TableCell>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                  {relatedRows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="px-4 py-3 text-sm text-gray-800 dark:text-white/90">{row.orderNumber ?? row.id}</TableCell>
                      <TableCell className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{formatDateTime(row.created_at)}</TableCell>
                      <TableCell className="px-4 py-3 text-sm">
                        <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${getStatusClassName(row.normalizedStatus)}`}>
                          {getStatusLabel(row.normalizedStatus)}
                        </span>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-sm text-gray-800 dark:text-white/90">{formatAmount(row.total ?? null)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricTile
          title="Commandes"
          value={String(metrics.total)}
          helper="Volume des commandes selon les filtres actifs"
          tone="slate"
        />
        <MetricTile
          title="Validees"
          value={String(metrics.successCount)}
          helper="Commandes payees et ouvertes"
          tone="green"
        />
        <MetricTile
          title="En attente"
          value={String(metrics.pendingCount)}
          helper="Commandes a verifier"
          tone="amber"
        />
        <MetricTile
          title="Revenu success"
          value={formatAmount(metrics.successRevenue)}
          helper={`Pending: ${formatAmount(metrics.pendingRevenue)}`}
          tone="blue"
        />
      </section>

      <PerformanceChart
        series={chartSeries}
        rangeLabel={snapshot.dateWindow.label}
      />

      <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="grid gap-4 lg:grid-cols-4">
          <div className="lg:col-span-2">
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300" htmlFor="resources-search">
              Recherche
            </label>
            <input
              id="resources-search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="OrderNumber, ressource, categorie..."
              className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300" htmlFor="resources-category-filter">
              Categorie
            </label>
            <select
              id="resources-category-filter"
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
              className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
            >
              <option value="all">Toutes</option>
              {categoryOptions.map((option) => (
                <option key={option.key} value={option.key}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300" htmlFor="resources-status-filter">
              Statut
            </label>
            <select
              id="resources-status-filter"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
              className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
            >
              <option value="all">Tous</option>
              <option value="success">Validees</option>
              <option value="pending">En attente</option>
              <option value="no">Echouees</option>
              <option value="other">Autres</option>
            </select>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        {filteredRows.length > 0 ? (
          filteredRows.map((row) => (
            <article
              key={row.id}
              className={`w-full rounded-2xl border bg-white p-5 shadow-theme-sm transition dark:bg-white/[0.03] ${
                selectedCommandeId === row.id
                  ? "border-brand-400 dark:border-brand-500"
                  : "border-gray-200 hover:border-brand-300 dark:border-gray-800"
              }`}
            >
              <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-brand-50 px-2.5 py-1 text-[11px] font-medium text-brand-700 dark:bg-brand-500/10 dark:text-brand-300">
                      {row.categoryLabel}
                    </span>
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${getStatusClassName(row.normalizedStatus)}`}>
                      {getStatusLabel(row.normalizedStatus)}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white/90">{row.resourceTitle}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">OrderNumber: {row.orderNumber ?? row.id}</p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:min-w-[480px]">
                  <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm dark:border-gray-800 dark:bg-gray-900">
                    <div className="text-gray-500 dark:text-gray-400">Montant</div>
                    <div className="mt-1 font-medium text-gray-800 dark:text-white/90">{formatAmount(row.total ?? null)}</div>
                  </div>
                  <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm dark:border-gray-800 dark:bg-gray-900">
                    <div className="text-gray-500 dark:text-gray-400">Date</div>
                    <div className="mt-1 font-medium text-gray-800 dark:text-white/90">{formatDateTime(row.created_at)}</div>
                  </div>
                  <div className="flex items-end justify-end">
                    <Button variant={selectedCommandeId === row.id ? "primary" : "outline"} onClick={() => setSelectedCommandeId(row.id)}>
                      {selectedCommandeId === row.id ? "Detail ouvert" : "Voir detail"}
                    </Button>
                  </div>
                </div>
              </div>
            </article>
          ))
        ) : (
          <div className="rounded-2xl border border-dashed border-gray-300 px-6 py-10 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
            Aucune commande ne correspond aux filtres actifs.
          </div>
        )}
      </section>
    </div>
  );
}
