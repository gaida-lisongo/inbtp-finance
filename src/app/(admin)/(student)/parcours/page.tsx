import { redirect } from "next/navigation";

import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { getAuthenticatedUser } from "@/lib/utils/supabase/session";
import { getStudentDashboardSnapshot } from "@/lib/utils/supabase/student-dashboard";

const getStatusClassName = (status: string | null) => {
  switch (status) {
    case "ok":
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

export default async function StudentParcoursPage() {
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect("/signin");
  }

  if (user.accountType !== "student") {
    redirect("/");
  }

  const snapshot = await getStudentDashboardSnapshot();

  return (
    <div className="space-y-6">
      <PageBreadcrumb 
        pageRoot="Dashboard"
        path="/"
        detailPage={`Mes inscriptions`}
        pageTitle={`Mes inscriptions`} 
      />

      <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03]">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white/90">Mes inscriptions</h1>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          Retrouvez ici l&apos;ensemble de vos parcours rattaches a votre compte etudiant.
        </p>

        <div className="mt-6 overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-800">
                <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Programme</th>
                <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Filiere</th>
                <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Reference</th>
                <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Statut</th>
              </tr>
            </thead>
            <tbody>
              {snapshot.parcours.length > 0 ? (
                snapshot.parcours.map((parcours) => (
                  <tr key={parcours.id} className="border-b border-gray-100 dark:border-white/[0.05]">
                    <td className="px-3 py-4 text-sm text-gray-900 dark:text-white/90">
                      {parcours.programmeDesignation ?? "Programme sans designation"}
                    </td>
                    <td className="px-3 py-4 text-sm text-gray-600 dark:text-gray-300">
                      {parcours.filiereDesignation ?? "Non renseignee"}
                    </td>
                    <td className="px-3 py-4 text-sm text-gray-600 dark:text-gray-300">
                      {parcours.reference ?? "Non renseignee"}
                    </td>
                    <td className="px-3 py-4 text-sm">
                      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${getStatusClassName(parcours.status)}`}>
                        {parcours.status ?? "sans statut"}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-3 py-6 text-sm text-gray-500 dark:text-gray-400">
                    Aucun parcours n&apos;est encore enregistre pour votre compte.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
