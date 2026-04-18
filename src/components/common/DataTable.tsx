import React, { useState, useMemo } from "react";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import Button from "@/components/ui/button/Button";

interface Column<T> {
  key: keyof T | string;
  label: string;
  render?: (item: T) => React.ReactNode;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  searchPlaceholder?: string;
  preSearchActions?: React.ReactNode;
  onAdd?: () => void;
  onEdit?: (item: T) => void;
  onDelete?: (item: T) => void;
  addButtonLabel?: string;
  headerActions?: React.ReactNode;
}

function DataTable<T extends { id: string }>({
  data,
  columns,
  searchPlaceholder = "Rechercher...",
  preSearchActions,
  onAdd,
  onEdit,
  onDelete,
  addButtonLabel = "Ajouter",
  headerActions,
}: DataTableProps<T>) {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredData = useMemo(() => {
    if (!searchTerm) return data;
    return data.filter((item) =>
      Object.values(item).some((value) =>
        String(value).toLowerCase().includes(searchTerm.toLowerCase())
      )
    );
  }, [data, searchTerm]);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center gap-3">
        <div className="flex items-center gap-2">
          {preSearchActions}
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
          />
        </div>
        {headerActions || onAdd ? (
          <div className="flex items-center gap-2">
            {headerActions}
            {onAdd ? (
              <Button onClick={onAdd} size="sm">
                {addButtonLabel}
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
        <div className="max-w-full overflow-x-auto">
          <Table>
            <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
              <TableRow>
                {columns.map((col) => (
                  <TableCell
                    key={String(col.key)}
                    isHeader
                    className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                  >
                    {col.label}
                  </TableCell>
                ))}
                {(onEdit || onDelete) && (
                  <TableCell
                    isHeader
                    className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                  >
                    Actions
                  </TableCell>
                )}
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
              {filteredData.map((item) => (
                <TableRow key={item.id}>
                  {columns.map((col) => (
                    <TableCell key={String(col.key)} className="px-5 py-4 text-start">
                      {col.render ? col.render(item) : String(item[col.key as keyof T] || "")}
                    </TableCell>
                  ))}
                  {(onEdit || onDelete) && (
                    <TableCell className="px-5 py-4 text-start">
                      <div className="flex gap-2">
                        {onEdit && (
                          <Button onClick={() => onEdit(item)} size="sm" variant="outline">
                            Modifier
                          </Button>
                        )}
                        {onDelete && (
                          <Button onClick={() => onDelete(item)} size="sm" variant="outline" className="text-red-600 hover:text-red-700">
                            Supprimer
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}

export default DataTable;
