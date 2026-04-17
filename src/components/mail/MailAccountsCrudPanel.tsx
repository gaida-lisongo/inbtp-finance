"use client";

import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";

import ComponentCard from "@/components/common/ComponentCard";
import DataTable from "@/components/common/DataTable";
import Button from "@/components/ui/button/Button";
import { Modal } from "@/components/ui/modal";

type MailAccountApiRow = {
  email?: string;
  password?: string;
  maildir?: string;
};

type MailAccountRow = {
  id: string;
  email: string;
  maildir: string;
};

type FormMode = "create" | "edit";

type ApiFailure = {
  ok?: false;
  code?: string;
  message?: string;
};

const fieldClassName =
  "h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90";

const readErrorMessage = (payload: unknown, fallback: string) => {
  if (!payload || typeof payload !== "object") {
    return fallback;
  }

  const candidate = payload as ApiFailure;

  if (typeof candidate.message === "string" && candidate.message.trim().length > 0) {
    return candidate.message;
  }

  return fallback;
};

const normalizeRows = (payload: unknown): MailAccountRow[] => {
  if (!payload || typeof payload !== "object") {
    return [];
  }

  const container = payload as { rows?: MailAccountApiRow[] };
  const rows = Array.isArray(container.rows) ? container.rows : [];

  return rows
    .map((row) => ({
      id: row.email?.trim() ?? "",
      email: row.email?.trim() ?? "",
      maildir: row.maildir?.trim() ?? "",
    }))
    .filter((row) => row.id.length > 0);
};

export default function MailAccountsCrudPanel() {
  const [accounts, setAccounts] = useState<MailAccountRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isMutating, setIsMutating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [formMode, setFormMode] = useState<FormMode>("create");
  const [emailInput, setEmailInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");

  const [accountToDelete, setAccountToDelete] = useState<MailAccountRow | null>(null);

  const resetFeedback = () => {
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  const loadAccounts = useCallback(async () => {
    setIsLoading(true);
    resetFeedback();

    try {
      const response = await fetch("/api/mail/account", { method: "GET", cache: "no-store" });
      const payload = (await response.json().catch(() => ({}))) as unknown;

      if (!response.ok) {
        throw new Error(readErrorMessage(payload, "Impossible de charger les comptes mail."));
      }

      setAccounts(normalizeRows(payload));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Erreur de chargement des comptes mail.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAccounts();
  }, [loadAccounts]);

  const openCreateModal = () => {
    resetFeedback();
    setFormMode("create");
    setEmailInput("");
    setPasswordInput("");
    setIsFormModalOpen(true);
  };

  const openEditModal = (row: MailAccountRow) => {
    resetFeedback();
    setFormMode("edit");
    setEmailInput(row.email);
    setPasswordInput("");
    setIsFormModalOpen(true);
  };

  const closeFormModal = () => {
    if (isMutating) {
      return;
    }

    setIsFormModalOpen(false);
  };

  const submitForm = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    resetFeedback();

    const email = emailInput.trim();
    const password = passwordInput.trim();

    if (!email || !password) {
      setErrorMessage("Email et mot de passe sont obligatoires.");
      return;
    }

    setIsMutating(true);

    try {
      const method = formMode === "create" ? "POST" : "PUT";
      const response = await fetch("/api/mail/account", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const payload = (await response.json().catch(() => ({}))) as unknown;

      if (!response.ok) {
        throw new Error(
          readErrorMessage(
            payload,
            formMode === "create" ? "Impossible de creer le compte." : "Impossible de modifier le compte.",
          ),
        );
      }

      await loadAccounts();
      setIsFormModalOpen(false);
      setSuccessMessage(formMode === "create" ? "Compte cree avec succes." : "Mot de passe mis a jour avec succes.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Erreur pendant la sauvegarde.");
    } finally {
      setIsMutating(false);
    }
  };

  const confirmDelete = async () => {
    if (!accountToDelete) {
      return;
    }

    resetFeedback();
    setIsMutating(true);

    try {
      const response = await fetch("/api/mail/account", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: accountToDelete.email }),
      });

      const payload = (await response.json().catch(() => ({}))) as unknown;

      if (!response.ok) {
        throw new Error(readErrorMessage(payload, "Impossible de supprimer le compte."));
      }

      await loadAccounts();
      setAccountToDelete(null);
      setSuccessMessage("Compte supprime avec succes.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Erreur pendant la suppression.");
    } finally {
      setIsMutating(false);
    }
  };

  const columns = useMemo(
    () => [
      {
        key: "email",
        label: "Email",
      },
      {
        key: "maildir",
        label: "Maildir",
      },
    ],
    [],
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
          <p className="text-sm text-gray-500 dark:text-gray-400">Comptes</p>
          <p className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">{accounts.length}</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
          <p className="text-sm text-gray-500 dark:text-gray-400">Etat API</p>
          <p className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
            {isLoading ? "Chargement..." : "Pret"}
          </p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
          <p className="text-sm text-gray-500 dark:text-gray-400">Actions</p>
          <div className="mt-2">
            <Button size="sm" variant="outline" onClick={loadAccounts} disabled={isLoading || isMutating}>
              Rafraichir
            </Button>
          </div>
        </div>
      </div>

      {(errorMessage || successMessage) && (
        <div
          className={`rounded-xl border px-4 py-3 text-sm ${
            errorMessage
              ? "border-red-200 bg-red-50 text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300"
              : "border-green-200 bg-green-50 text-green-700 dark:border-green-900/40 dark:bg-green-950/30 dark:text-green-300"
          }`}
        >
          {errorMessage ?? successMessage}
        </div>
      )}

      <ComponentCard
        title="Utilisateurs mail"
        desc="Creation, modification et suppression des comptes sans quitter la page."
      >
        <DataTable
          data={accounts}
          columns={columns}
          searchPlaceholder="Rechercher un compte mail..."
          onAdd={openCreateModal}
          onEdit={openEditModal}
          onDelete={(row) => setAccountToDelete(row)}
          addButtonLabel="Nouveau compte"
          headerActions={
            <Button size="sm" variant="outline" onClick={loadAccounts} disabled={isLoading || isMutating}>
              Recharger
            </Button>
          }
        />
      </ComponentCard>

      <Modal isOpen={isFormModalOpen} onClose={closeFormModal} size="lg">
        <div className="mb-5">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            {formMode === "create" ? "Creer un utilisateur mail" : "Modifier le mot de passe"}
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {formMode === "create"
              ? "Renseignez email et mot de passe pour creer un nouveau compte."
              : "Renseignez un nouveau mot de passe pour cet utilisateur."}
          </p>
        </div>

        <form className="space-y-4" onSubmit={submitForm}>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400" htmlFor="mail-email">
              Email
            </label>
            <input
              id="mail-email"
              type="email"
              className={fieldClassName}
              value={emailInput}
              onChange={(event) => setEmailInput(event.target.value)}
              placeholder="noreply@inbtp.net"
              disabled={isMutating || formMode === "edit"}
              required
            />
          </div>

          <div>
            <label
              className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400"
              htmlFor="mail-password"
            >
              Mot de passe
            </label>
            <input
              id="mail-password"
              type="password"
              className={fieldClassName}
              value={passwordInput}
              onChange={(event) => setPasswordInput(event.target.value)}
              placeholder="********"
              disabled={isMutating}
              required
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={closeFormModal} disabled={isMutating}>
              Annuler
            </Button>
            <Button type="submit" disabled={isMutating}>
              {isMutating ? "Traitement..." : formMode === "create" ? "Creer" : "Mettre a jour"}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={Boolean(accountToDelete)} onClose={() => setAccountToDelete(null)} size="md">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">Supprimer un utilisateur</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Voulez-vous supprimer le compte <span className="font-medium">{accountToDelete?.email}</span> ?
          </p>
          <div className="flex items-center justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setAccountToDelete(null)} disabled={isMutating}>
              Annuler
            </Button>
            <Button type="button" onClick={confirmDelete} disabled={isMutating}>
              {isMutating ? "Suppression..." : "Confirmer"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
