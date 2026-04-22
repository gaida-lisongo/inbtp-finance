"use client";

import React, { useState, useMemo, useEffect } from "react";
import { Modal } from "../ui/modal";
import Button from "../ui/button/Button";

interface DataTableProps<T> {
  title?: string;
  description?: string;
  items: T[];
  CardItem: React.ElementType<{ item: T; onDetail?: (item: T) => void; onDelete?: (item: T) => void }>;
  CardDetail?: React.ElementType<{ item: T; onUpdate?: (payload: any) => void; onClose?: () => void }>;
  CardCreate?: React.ElementType<{ onCreate?: (payload: any) => void; onClose?: () => void }>;
  onCreate?: (payload: any) => Promise<T | null>;
  onUpdate?: (payload: any) => Promise<T | null>;
  onDelete?: (item: T) => Promise<boolean>;
  searchFilter?: (item: T, query: string) => boolean;
  searchPlaceholder?: string;
  createLabel?: string;
  itemsPerPage?: number;
  emptyMessage?: string;
}

export default function DataTable<T extends { id?: string | number }>({
  title,
  description,
  items,
  CardItem,
  CardDetail,
  CardCreate,
  onCreate,
  onUpdate,
  onDelete,
  searchFilter,
  searchPlaceholder = "Rechercher...",
  createLabel = "Nouveau",
  itemsPerPage = 10,
  emptyMessage = "Aucune donnée trouvée.",
}: DataTableProps<T>) {
  const [data, setData] = useState<T[]>(items);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<T | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Sync when parent props change
  useEffect(() => {
    setData(items);
  }, [items]);

  const filteredData = useMemo(() => {
    if (!searchQuery.trim() || !searchFilter) return data;
    return data.filter((item) => searchFilter(item, searchQuery));
  }, [data, searchQuery, searchFilter]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage) || 1;
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredData, currentPage, itemsPerPage]);

  // Reset to first page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const handleCreate = async (payload: any) => {
    if (!onCreate) return;
    setIsSaving(true);
    try {
      const newItem = await onCreate(payload);
      if (newItem) {
        setData((prev) => [newItem, ...prev]);
        setIsCreateModalOpen(false);
      }
    } catch (error) {
      console.error("Create error:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdate = async (payload: any) => {
    if (!onUpdate) return;
    setIsSaving(true);
    try {
      const updatedItem = await onUpdate(payload);
      if (updatedItem) {
        setData((prev) =>
          prev.map((item) => (item.id === updatedItem.id ? updatedItem : item))
        );
        setSelectedItem(null);
      }
    } catch (error) {
      console.error("Update error:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (item: T) => {
    if (!onDelete) return;
    try {
      const success = await onDelete(item);
      if (success) {
        setData((prev) => prev.filter((prevItem) => prevItem.id !== item.id));
      }
    } catch (error) {
      console.error("Delete error:", error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header section with Search & Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-2xl bg-white p-5 shadow-theme-xs dark:bg-gray-900">
        <div>
          {title && <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">{title}</h2>}
          {description && <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{description}</p>}
        </div>

        <div className="flex items-center gap-3">
          {searchFilter && (
            <div className="relative">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M10.5 3.75a6.75 6.75 0 100 13.5 6.75 6.75 0 000-13.5zM2.25 10.5a8.25 8.25 0 1114.59 5.28l4.69 4.69a.75.75 0 11-1.06 1.06l-4.69-4.69A8.25 8.25 0 012.25 10.5z"
                  fill="currentColor"
                />
              </svg>
              <input
                type="text"
                placeholder={searchPlaceholder}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-10 w-full rounded-lg border border-gray-300 bg-transparent pl-10 pr-4 text-sm text-gray-800 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-800 dark:text-white/90 sm:w-64"
              />
            </div>
          )}
          {CardCreate && onCreate && (
            <Button onClick={() => setIsCreateModalOpen(true)}>
              {createLabel}
            </Button>
          )}
        </div>
      </div>

      {/* Grid Content */}
      {paginatedData.length > 0 ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {paginatedData.map((item, index) => (
            <CardItem
              key={item.id ?? index}
              item={item}
              onDetail={CardDetail ? () => setSelectedItem(item) : undefined}
              onDelete={onDelete ? () => handleDelete(item) : undefined}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-2xl bg-white py-16 shadow-theme-xs dark:bg-gray-900">
          <p className="text-gray-500 dark:text-gray-400">{emptyMessage}</p>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between rounded-2xl bg-white p-5 shadow-theme-xs dark:bg-gray-900">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Affichage de <span className="font-medium text-gray-800 dark:text-white/90">{(currentPage - 1) * itemsPerPage + 1}</span> à <span className="font-medium text-gray-800 dark:text-white/90">{Math.min(currentPage * itemsPerPage, filteredData.length)}</span> sur <span className="font-medium text-gray-800 dark:text-white/90">{filteredData.length}</span> résultats
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="flex h-9 items-center justify-center rounded-lg border border-gray-200 bg-white px-3 text-sm font-medium text-gray-600 transition hover:bg-gray-50 hover:text-gray-800 disabled:opacity-50 disabled:pointer-events-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-white/[0.03] dark:hover:text-white"
            >
              Précédent
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="flex h-9 items-center justify-center rounded-lg border border-gray-200 bg-white px-3 text-sm font-medium text-gray-600 transition hover:bg-gray-50 hover:text-gray-800 disabled:opacity-50 disabled:pointer-events-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-white/[0.03] dark:hover:text-white"
            >
              Suivant
            </button>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {CardCreate && isCreateModalOpen && (
        <Modal isOpen={isCreateModalOpen} onClose={() => !isSaving && setIsCreateModalOpen(false)}>
          <CardCreate onCreate={handleCreate} onClose={() => setIsCreateModalOpen(false)} />
        </Modal>
      )}

      {/* Detail / Update Modal */}
      {CardDetail && selectedItem && (
        <Modal isOpen={!!selectedItem} onClose={() => !isSaving && setSelectedItem(null)}>
          <CardDetail item={selectedItem} onUpdate={handleUpdate} onClose={() => setSelectedItem(null)} />
        </Modal>
      )}
    </div>
  );
}