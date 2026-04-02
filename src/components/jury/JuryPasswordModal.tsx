"use client";

import { useCallback, useEffect, useState } from "react";

import { Modal } from "@/components/ui/modal";

type JuryPasswordModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (password: string) => void;
  isSubmitting?: boolean;
  error?: string | null;
};

export default function JuryPasswordModal({
  isOpen,
  onClose,
  onConfirm,
  isSubmitting = false,
  error,
}: JuryPasswordModalProps) {
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (isOpen) {
      setPassword("");
    }
  }, [isOpen]);

  const handleConfirm = useCallback(() => {
    const trimmed = password.trim();
    if (!trimmed) return;
    onConfirm(trimmed);
  }, [onConfirm, password]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <div className="space-y-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gray-400">
            Validation
          </p>
          <h3 className="mt-1 text-xl font-semibold text-gray-900 dark:text-white">
            Mot de passe du jury
          </h3>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Mot de passe
          </label>
          <input
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            type="password"
            autoComplete="current-password"
            className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-800 outline-none focus:border-indigo-500 dark:border-gray-800 dark:bg-gray-950 dark:text-white"
            placeholder="Saisir le mot de passe…"
          />
          {error ? (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          ) : null}
        </div>

        <div className="flex justify-end gap-3 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-gray-200 px-5 py-2 text-sm font-semibold text-gray-600 transition hover:border-gray-300 dark:border-gray-800 dark:text-gray-300 dark:hover:border-gray-700"
            disabled={isSubmitting}
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="rounded-full bg-red-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-red-500 disabled:opacity-60"
            disabled={isSubmitting || password.trim().length === 0}
          >
            {isSubmitting ? "Validation…" : "Valider"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

