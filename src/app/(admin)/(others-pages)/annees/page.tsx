import { redirect } from "next/navigation";
import type { Metadata } from "next";

import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { getAnnees } from "@/lib/utils/supabase/annees";
import { getAuthenticatedUser } from "@/lib/utils/supabase/session";
import AnneeClientWrapper from "@/app/(admin)/(others-pages)/annees/AnneeClientWrapper";

export const metadata: Metadata = {
  title: "Gestion des années | Dashboard Agents",
  description: "Administration des années académiques pour les organisateurs",
};

export default async function AnneesPage() {
  const user = await getAuthenticatedUser();

  if (!user || !user.canManageYears) {
    redirect("/signin?error=access_denied");
  }

  const annees = await getAnnees();
  
  return (
    <div className="space-y-6">
      <PageBreadcrumb
        pageRoot="Dashboard"
        path="/"
        detailPage={`Années`}
        pageTitle={`Années académiques`}
      />

      <AnneeClientWrapper initialAnnees={annees} />
    </div>
  );
}

