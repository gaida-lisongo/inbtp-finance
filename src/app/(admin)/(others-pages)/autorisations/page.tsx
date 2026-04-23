import { redirect } from "next/navigation";
import type { Metadata } from "next";

import { deleteAutorisationAction, saveAutorisationAction } from "@/app/(admin)/(others-pages)/autorisations/actions";
import AutorisationsRealtimeSync from "@/components/autorisation/AutorisationsRealtimeSync";
import ComponentCard from "@/components/common/ComponentCard";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import {
  getAutorisationLabels,
  getAutorisationById,
  getAutorisations,
  getAgentsForRoleAssignment,
  normalizeAutorisationCode,
} from "@/lib/utils/supabase/autorisations";
import { getAuthenticatedUser } from "@/lib/utils/supabase/session";

export const metadata: Metadata = {
  title: "Autorisations | Dashboard Agents",
  description: "Gestion des autorisations et des roles agents",
};

type AutorisationsPageProps = {
  searchParams: Promise<{
    status?: string;
    message?: string;
    edit?: string;
  }>;
};

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));

const formatAutorisationDesignation = async (value: string | null | undefined) => {
  const code = await normalizeAutorisationCode(value);
  return code ? (await getAutorisationLabels())[code] : value;
};

const getMessage = (status?: string, message?: string) => {
  if (status !== "error") {
    return message;
  }

  switch (message) {
    case "access_denied":
      return "Acces refuse a cette page.";
    case "invalid_role":
      return "Le role doit etre organisateur, titulaire ou gestionnaire.";
    case "agent_required":
      return "Selectionnez un agent avant de valider.";
    default:
      return message;
  }
};

export default async function AutorisationsPage({ searchParams }: AutorisationsPageProps) {
  const [user, params] = await Promise.all([getAuthenticatedUser(), searchParams]);

  if (!user || !user.canManageAuthorizations) {
    redirect("/signin?error=access_denied");
  }

  const [autorisations, agents] = await Promise.all([getAutorisations(), getAgentsForRoleAssignment()]);
  const editingAutorisation = params.edit ? await getAutorisationById(params.edit) : null;
  const feedbackMessage = getMessage(params.status, params.message);

  return (
    <div>
      <AutorisationsRealtimeSync />
      <PageBreadcrumb
        pageRoot="Dashboard"
        path="/"
        detailPage={`Autorisations`}
        pageTitle={`Autorisations`}
      />

      <div className="space-y-6">
        {params.status === "success" ? (
          <div className="rounded-2xl border border-success-200 bg-success-50 px-4 py-3 text-sm text-success-700 dark:border-success-500/30 dark:bg-success-500/10 dark:text-success-300">
            Operation effectuee avec succes.
          </div>
        ) : null}

        {params.status === "error" && feedbackMessage ? (
          <div className="rounded-2xl border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-700 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-300">
            {feedbackMessage}
          </div>
        ) : null}

        <ComponentCard
          title={editingAutorisation ? "Modifier une autorisation" : "Nouvelle autorisation"}
          desc="Les organisateurs attribuent ici les roles applicatifs et les autorisations actives aux agents."
        >
          <form action={saveAutorisationAction} className="grid gap-5 lg:grid-cols-2">
            <input type="hidden" name="id" value={editingAutorisation?.id ?? ""} />

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400" htmlFor="agent_id">
                Agent
              </label>
              <select
                id="agent_id"
                name="agent_id"
                defaultValue={editingAutorisation?.agent_id ?? ""}
                className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              >
                <option value="">Selectionner un agent</option>
                {agents.map((agent) => (
                  <option key={agent.id} value={agent.id}>
                    {[agent.prenom, agent.post_nom, agent.nom].filter(Boolean).join(" ") || "Agent sans nom"}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400" htmlFor="role">
                Role de l&apos;agent
              </label>
              <select
                id="role"
                name="role"
                defaultValue={
                  agents.find((agent) => agent.id === editingAutorisation?.agent_id)?.role?.toLowerCase() ?? ""
                }
                className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              >
                <option value="">Selectionner un role</option>
                <option value="organisateur">Organisateur</option>
                <option value="titulaire">Titulaire</option>
                <option value="gestionnaire">Gestionnaire</option>
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400" htmlFor="designation">
                Designation
              </label>
              <select
                id="designation"
                name="designation"
                defaultValue={editingAutorisation?.designation ?? ""}
                className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              >
                <option value="">Selectionner une autorisation</option>
                {Object.entries(await getAutorisationLabels()).map(([code, label]) => (
                  <option key={code} value={code}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400" htmlFor="is_active">
                Statut
              </label>
              <select
                id="is_active"
                name="is_active"
                defaultValue={editingAutorisation?.is_active ?? "oui"}
                className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              >
                <option value="oui">Active</option>
                <option value="non">Inactive</option>
              </select>
            </div>

            <div className="lg:col-span-2 flex flex-wrap items-center gap-3">
              <button
                type="submit"
                className="inline-flex items-center justify-center rounded-lg bg-brand-500 px-5 py-3 text-sm font-medium text-white transition hover:bg-brand-600"
              >
                {editingAutorisation ? "Mettre a jour" : "Enregistrer"}
              </button>
              {editingAutorisation ? (
                <a
                  href="/autorisations"
                  className="inline-flex items-center justify-center rounded-lg border border-gray-300 px-5 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]"
                >
                  Annuler
                </a>
              ) : null}
            </div>
          </form>
        </ComponentCard>

        <ComponentCard title="Autorisations en temps reel" desc="La liste se rafraichit automatiquement sur les changements Supabase Realtime.">
          <div className="overflow-x-auto">
            <Table className="min-w-full">
              <TableHeader className="border-y border-gray-100 dark:border-gray-800">
                <TableRow>
                  <TableCell isHeader className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                    Agent
                  </TableCell>
                  <TableCell isHeader className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                    Role
                  </TableCell>
                  <TableCell isHeader className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                    Designation
                  </TableCell>
                  <TableCell isHeader className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                    Statut
                  </TableCell>
                  <TableCell isHeader className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                    Cree le
                  </TableCell>
                  <TableCell isHeader className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wide text-gray-500">
                    Actions
                  </TableCell>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
                {autorisations.map((autorisation) => (
                  <TableRow key={autorisation.id}>
                    <TableCell className="px-5 py-4 text-sm font-medium text-gray-800 dark:text-white/90">
                      {autorisation.agentDisplayName}
                    </TableCell>
                    <TableCell className="px-5 py-4 text-sm text-gray-500 dark:text-gray-400">
                      {autorisation.agentRole ?? "Aucun role"}
                    </TableCell>
                    <TableCell className="px-5 py-4 text-sm text-gray-500 dark:text-gray-400">
                      {formatAutorisationDesignation(autorisation.designation) || "Sans designation"}
                    </TableCell>
                    <TableCell className="px-5 py-4 text-sm">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                          autorisation.is_active === "oui"
                            ? "bg-success-50 text-success-700 dark:bg-success-500/10 dark:text-success-300"
                            : "bg-gray-100 text-gray-700 dark:bg-white/[0.03] dark:text-gray-300"
                        }`}
                      >
                        {autorisation.is_active === "oui" ? "Active" : "Inactive"}
                      </span>
                    </TableCell>
                    <TableCell className="px-5 py-4 text-sm text-gray-500 dark:text-gray-400">
                      {formatDate(autorisation.created_at)}
                    </TableCell>
                    <TableCell className="px-5 py-4">
                      <div className="flex justify-end gap-3">
                        <a
                          href={`/autorisations?edit=${autorisation.id}`}
                          className="text-sm font-medium text-brand-500 hover:text-brand-600"
                        >
                          Modifier
                        </a>
                        <form action={deleteAutorisationAction}>
                          <input type="hidden" name="id" value={autorisation.id} />
                          <button type="submit" className="text-sm font-medium text-error-500 hover:text-error-600">
                            Supprimer
                          </button>
                        </form>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {autorisations.length === 0 ? (
                  <TableRow>
                    <td colSpan={6} className="px-5 py-8 text-sm text-gray-500 dark:text-gray-400">
                      Aucune autorisation enregistree.
                    </td>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </div>
        </ComponentCard>
      </div>
    </div>
  );
}
