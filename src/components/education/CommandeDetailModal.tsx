"use client";

import { useState, useEffect } from "react";
import type { CommandeDetail as ICommandeDetail, MetierCategorie } from "@/types/education";
import { getCommandesByCategory } from "@/lib/utils/supabase/commandes-dashboard";
import {
  bulkUpdateCommandeStatusAction,
  updateCommandeStatusAction,
} from "@/app/actions/commandes";
import { getMetierLabel } from "@/constants/metier";

interface CommandeDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  categorie?: MetierCategorie;
}

export function CommandeDetailModal({
  isOpen,
  onClose,
  categorie,
}: CommandeDetailModalProps) {
  const [commandes, setCommandes] = useState<ICommandeDetail[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string | null>(null);

  useEffect(() => {
    async function loadCommandes() {
      if (!isOpen || !categorie) return;

      try {
        setIsLoading(true);
        const data = await getCommandesByCategory(categorie, {
          status: filterStatus || undefined,
        });
        setCommandes(data);
        setError(null);
        setSelectedIds(new Set());
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Erreur lors du chargement des commandes"
        );
      } finally {
        setIsLoading(false);
      }
    }

    loadCommandes();
  }, [isOpen, categorie, filterStatus]);

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === commandes.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(commandes.map((c) => c.id)));
    }
  };

  const handleBulkUpdate = async (newStatus: string) => {
    if (selectedIds.size === 0) {
      setError("Sélectionnez au moins une commande");
      return;
    }

    try {
      setIsUpdating(true);
      const result = await bulkUpdateCommandeStatusAction(
        Array.from(selectedIds),
        newStatus
      );

      if (result.success) {
        setSuccessMessage(
          `${result.count} commande(s) mise(s) à jour avec succès`
        );
        setSelectedIds(new Set());
        // Reload data
        if (categorie) {
          const data = await getCommandesByCategory(categorie, {
            status: filterStatus || undefined,
          });
          setCommandes(data);
        }
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        setError(result.error || "Erreur lors de la mise à jour");
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Erreur lors de la mise à jour"
      );
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSingleUpdate = async (id: string, newStatus: string) => {
    try {
      setIsUpdating(true);
      const result = await updateCommandeStatusAction(id, newStatus);

      if (result.success) {
        setSuccessMessage("Commande mise à jour avec succès");
        // Reload data
        if (categorie) {
          const data = await getCommandesByCategory(categorie, {
            status: filterStatus || undefined,
          });
          setCommandes(data);
        }
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        setError(result.error || "Erreur lors de la mise à jour");
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Erreur lors de la mise à jour"
      );
    } finally {
      setIsUpdating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-auto bg-black/50 p-4">
      <div className="w-full max-w-4xl rounded-lg bg-white dark:bg-gray-900">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 p-6 dark:border-gray-700">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {categorie && getMetierLabel(categorie)} - Détails Commandes
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Total: {commandes.length} commande(s)
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <svg
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Status Filter */}
        <div className="border-b border-gray-200 p-6 dark:border-gray-700">
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Filtrer par statut
          </label>
          <select
            value={filterStatus || ""}
            onChange={(e) => setFilterStatus(e.target.value || null)}
            className="relative z-20 inline-flex appearance-none rounded border border-gray-200 bg-white py-2 px-4 pr-9 text-sm font-medium outline-none dark:border-gray-700 dark:bg-gray-dark dark:text-white"
          >
            <option value="">-- Tous les statuts --</option>
            <option value="pending">En attente</option>
            <option value="success">Réussi</option>
            <option value="delivered">Livré</option>
          </select>
        </div>

        {/* Messages */}
        {error && (
          <div className="border-b border-red-200 bg-red-50 p-4 text-red-800 dark:border-red-800 dark:bg-red-900/10 dark:text-red-200">
            {error}
          </div>
        )}
        {successMessage && (
          <div className="border-b border-green-200 bg-green-50 p-4 text-green-800 dark:border-green-800 dark:bg-green-900/10 dark:text-green-200">
            {successMessage}
          </div>
        )}

        {/* Content */}
        <div className="max-h-96 overflow-auto p-6">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
              ))}
            </div>
          ) : commandes.length === 0 ? (
            <p className="text-center text-gray-600 dark:text-gray-400">
              Aucune commande trouvée
            </p>
          ) : (
            <div className="space-y-4">
              {/* Select All */}
              <div className="flex items-center gap-2 rounded border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800">
                <input
                  type="checkbox"
                  checked={selectedIds.size === commandes.length && commandes.length > 0}
                  onChange={toggleSelectAll}
                  className="h-4 w-4 cursor-pointer rounded border-gray-300"
                />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Sélectionner tout ({selectedIds.size}/{commandes.length})
                </span>
              </div>

              {/* Commande Items */}
              {commandes.map((commande) => (
                <div
                  key={commande.id}
                  className="flex items-start gap-4 rounded border border-gray-200 p-4 dark:border-gray-700"
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.has(commande.id)}
                    onChange={() => toggleSelect(commande.id)}
                    className="mt-1 h-4 w-4 cursor-pointer rounded border-gray-300"
                  />
                  <div className="flex-1">
                    <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-3">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {commande.product}
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          #{commande.orderNumber}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-700 dark:text-gray-300">
                          {commande.studentName}
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          {commande.studentEmail}
                        </p>
                      </div>
                      <div>
                        <span
                          className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                            commande.status === "success"
                              ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200"
                              : "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-200"
                          }`}
                        >
                          {commande.status}
                        </span>
                      </div>
                    </div>
                    <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                      {new Date(commande.created_at).toLocaleDateString("fr-FR")}
                    </p>
                  </div>
                  <button
                    onClick={() => handleSingleUpdate(commande.id, "delivered")}
                    disabled={isUpdating}
                    className="rounded bg-blue-500 px-3 py-1 text-xs font-medium text-white hover:bg-blue-600 disabled:opacity-50"
                  >
                    Livré
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {selectedIds.size > 0 && (
          <div className="flex items-center justify-between border-t border-gray-200 bg-gray-50 p-6 dark:border-gray-700 dark:bg-gray-800">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {selectedIds.size} commande(s) sélectionnée(s)
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => handleBulkUpdate("success")}
                disabled={isUpdating}
                className="rounded bg-green-500 px-4 py-2 text-sm font-medium text-white hover:bg-green-600 disabled:opacity-50"
              >
                Marquer comme Réussi
              </button>
              <button
                onClick={() => handleBulkUpdate("delivered")}
                disabled={isUpdating}
                className="rounded bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600 disabled:opacity-50"
              >
                Marquer comme Livré
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
